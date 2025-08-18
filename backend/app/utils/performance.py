"""
Performance Aggregation Functions
"""

from __future__ import annotations

import numpy as np
import pandas as pd
from typing import Dict, Any
from datetime import datetime, timezone

from app.models import Order
from app.utils.timestamps import parse_timestamptz
from app.utils.local_debug import LocalLogger, Spoof

from app.services.orders import get_all_orders
from app.services.market import fetch_full_data


def _setup_logger(debug: bool, output_file: str):
    """
    Setup logger for debugging purposes.
    If debug is True, it initializes a LocalLogger.
    Otherwise, it uses Spoof to avoid errors in production.
    """
    if debug:
        return LocalLogger(output_file)
    else:
        return Spoof()


def _orders_df(raw: Any) -> pd.DataFrame:
    """
    Normalize orders -> DataFrame with:
        ['ticker','quantity','price','timestamp'] ; timestamp tz-aware UTC
        ticker NaN => transfer; quantity sign encodes side for trades.
    """
    df = raw if isinstance(raw, pd.DataFrame) else pd.DataFrame(list(raw or []))
    # enforce exact columns we expect
    for col in ["ticker", "quantity", "price", "timestamp"]:
        if col not in df.columns:
            df[col] = np.nan

    df = df[["ticker", "quantity", "price", "timestamp"]].copy()
    df["ticker"] = df["ticker"].astype(str).str.upper()
    df.loc[df["ticker"].isin(["", "NONE", "NULL", "NAN"]), "ticker"] = np.nan
    df["quantity"] = pd.to_numeric(df["quantity"], errors="coerce").fillna(0.0)
    df["price"] = pd.to_numeric(df["price"], errors="coerce").fillna(0.0)
    df["timestamp"] = pd.to_datetime(df["timestamp"], utc=True, errors="coerce")
    df = df.sort_values("timestamp", kind="stable").reset_index(drop=True)
    return df


def _prices_df(prices_dict: Dict[str, pd.DataFrame]) -> pd.DataFrame:
    """
    Build wide price DataFrame (index=Datetime, cols=tickers, values=Close).
    Accepts dict[ticker] -> df with ['Datetime','Open','Close'].
    Preserves sub-daily resolution (minute, hourly, etc.).
    """
    frames = []
    for tkr, df in (prices_dict or {}).items():
        if df is None or len(df) == 0:
            continue
        local = df.copy().reset_index()
        date_col = "Datetime" if "Datetime" in local.columns else "Date"
        # keep full timestamp resolution
        idx = pd.to_datetime(local[date_col], utc=True, errors="coerce").dt.tz_localize(None)
        s = pd.Series(local["Close"].astype(float).values, index=idx, name=str(tkr).upper())
        # only collapse if true duplicates exist at the *same exact timestamp*
        s = s.groupby(level=0).last()
        frames.append(s)

    if not frames:
        return pd.DataFrame()

    px = pd.concat(frames, axis=1).sort_index()
    return px


def _get_nearest_yf_period(
    start_date: datetime, 
    end_date: datetime
) -> pd.DatetimeIndex:
    """
    Get the nearest yfinance period for the given date range.
    """
    # Define the periods we support
    periods = {
        "1d": pd.Timedelta(days=1),
        "5d": pd.Timedelta(days=5),
        "1mo": pd.Timedelta(days=30),
        "3mo": pd.Timedelta(days=90),
        "6mo": pd.Timedelta(days=180),
        "1y": pd.Timedelta(days=365),
        "2y": pd.Timedelta(days=730),
        "5y": pd.Timedelta(days=1825),
        "10y": pd.Timedelta(days=3650),
        "ytd": pd.Timestamp.now() - pd.Timestamp(datetime(start_date.year, 1, 1)),
        "max": None  # No limit
    }

    # Find the closest period that fits the date range
    for period, delta in periods.items():
        if delta is None or (end_date - start_date) <= delta:
            return period

    return "max"  # Fallback to max if no other period fits


async def _get_portfolio_history(
        start_date: datetime,
        orders_df: pd.DataFrame,
        prices_df: pd.DataFrame,
        logger: LocalLogger | Spoof = Spoof()
) -> dict[str, list]:
    """
    Get the time series data for a portfolio. This function aggregates
    the portfolio's performance over time, including ticker history if
    requested. It does so by pulling orders from our database and
    iterating from inception to the current date, using Yahoo Finance
    historical prices to get a valuation at each time step.

    Rules:
      - 'CA$H' orders change cash balance directly (quantity units at $1).
      - Non-cash orders adjust both the security position (by quantity) and cash
        (by -quantity*price).
      - Each order takes effect at the first available price timestamp >= its timestamp.
      - dv series are day-over-day percent changes; when previous pv is 0, dv is 0.
      - The returned TIMESTAMP list aligns with prices_df's index filtered to start_date+.

    Args:
        orders_df (pd.DataFrame): DataFrame containing portfolio orders.
        prices_df (pd.DataFrame): DataFrame containing historical prices.
    Returns:
        dict[str, list]: A dictionary containing time series data
            per ticker. Cash is included as ticker CA$H, the
            values are included under pv:<ticker> (or TOTAL),
            deltas are under dv:<ticker> (or TOTAL), and dates 
            are included under TIMESTAMP.
    """
    logger.debug("Starting portfolio history aggregation...")

    logger.debug("Orders DataFrame...")
    logger.debug(orders_df)
    logger.debug("Prices DataFrame...")
    logger.debug(prices_df)

    # ---- Normalize indices & timestamps ----
    prices_idx = pd.DatetimeIndex(prices_df.index).sort_values()
    # normalize start_date to naive (match prices index)
    start = pd.Timestamp(start_date)
    if start.tzinfo is not None:
        # convert to UTC then drop tz to compare with naive price index
        start = start.tz_convert("UTC").tz_localize(None)
    # filter timeline to >= start
    idx = prices_idx[prices_idx >= start]
    if len(idx) == 0:
        return {"TIMESTAMP": [], "pv:TOTAL": [], "dv:TOTAL": []}

    # Orders copy + timestamp normalization (naive for alignment)
    orders = orders_df.copy()
    orders["timestamp"] = pd.to_datetime(orders["timestamp"], utc=True, errors="coerce").dt.tz_convert("UTC").dt.tz_localize(None)
    orders = orders.sort_values("timestamp")

    # ---- Build positions delta frame (only order rows, then cumsum over time) ----
    # Tickers to consider: everything in prices + 'CA$H' + anything appearing in orders
    tickers = set(prices_df.columns.tolist()) | set(orders["ticker"].dropna().unique().tolist()) | {"CA$H"}
    tickers = sorted(t for t in tickers if isinstance(t, str) and len(t))  # sanitize

    # Prepare an empty delta matrix, rows = timeline, cols = tickers
    pos_delta = pd.DataFrame(0.0, index=idx, columns=tickers)

    # Map each order to its effective date on the timeline: first idx >= order timestamp
    arr_idx = idx.values  # numpy datetime64 array for fast searchsorted
    for tkr, qty, px, ts in orders[["ticker", "quantity", "price", "timestamp"]].itertuples(index=False, name=None):
        if not isinstance(ts, pd.Timestamp) or pd.isna(ts):
            continue
        # find first timeline date >= ts
        insert_pos = arr_idx.searchsorted(np.datetime64(ts), side="left")
        if insert_pos >= len(arr_idx):
            # order is after our last price point; ignore for this history window
            continue
        eff_date = idx[insert_pos]

        q = float(qty)
        p = float(px) if pd.notna(px) else 0.0

        if tkr == "CA$H":
            # direct cash movement at $1
            pos_delta.at[eff_date, "CA$H"] += q
        else:
            # security position change
            if tkr not in pos_delta.columns:
                # unseen ticker in prices: still track position; its PV will be 0 if no prices
                pos_delta[tkr] = 0.0
            pos_delta.at[eff_date, tkr] += q
            # cash offset: buys reduce cash; sells (negative qty) increase cash
            pos_delta.at[eff_date, "CA$H"] += -q * p

    # Cumulative positions through time
    positions = pos_delta.cumsum()

    # ---- Price matrix aligned to timeline ----
    prices = prices_df.reindex(idx).ffill()  # forward-fill any gaps
    # ensure numeric
    prices = prices.apply(pd.to_numeric, errors="coerce")

    # Add constant price for cash
    prices["CA$H"] = 1.0

    # Keep only tickers we have both positions and prices for (others will value to 0)
    common = [c for c in positions.columns if c in prices.columns]
    if not common:
        # no priced assets; only cash might exist
        common = ["CA$H"]
        if "CA$H" not in positions.columns:
            positions["CA$H"] = 0.0

    positions = positions[common]
    prices = prices[common]

    # ---- Valuation ----
    pv = positions * prices

    # Safe pct-change: 0 when previous pv is 0 (avoid inf)
    def pct_change_safe(s: pd.Series) -> pd.Series:
        prev = s.shift(1)
        delta = s - prev
        out = delta.divide(prev.replace(0.0, np.nan))
        return out.fillna(0.0)

    dv = pv.apply(pct_change_safe)

    pv_total = pv.sum(axis=1)
    dv_total = pct_change_safe(pv_total)

    # ---- Build output ----
    out: dict[str, list] = {"TIMESTAMP": [ts.isoformat() for ts in pv.index]}

    # Maintain deterministic column order: cash first if present, then alpha-sorted others
    ordered = []
    if "CA$H" in pv.columns:
        ordered.append("CA$H")
    ordered += [c for c in sorted(pv.columns) if c != "CA$H"]

    for col in ordered:
        out[f"pv:{col}"] = pv[col].astype(float).round(6).tolist()
        out[f"dv:{col}"] = dv[col].astype(float).round(6).tolist()

    out["pv:TOTAL"] = pv_total.astype(float).round(6).tolist()
    out["dv:TOTAL"] = dv_total.astype(float).round(6).tolist()
    return out



async def get_portfolio_history(
    portfolio_id: str,
    created_at: str,
    interval: str = '1d',
    local_debug: bool = False
) -> dict[str, list]:
    """
    Get the time series data for a portfolio. This function aggregates
    the portfolio's performance over time, including ticker history if
    requested. It does so by pulling orders from our database and
    iterating from inception to the current date, using Yahoo Finance
    historical prices to get a valuation at each time step.
    Args:
        portfolio_id (str): The ID of the portfolio.
        created_at (str): The creation date of the portfolio.
        get_ticker_history (bool): Whether to include ticker history.
        interval (str): The time interval for historical data.
        local_debug (bool): If True, runs in local debug mode.
    Returns:
        dict[str, list]: A dictionary containing time series data
            per ticker. Cash is included as ticker CA$H, the
            values are included under pv:<ticker> (or TOTAL),
            deltas are under dv:<ticker> (or TOTAL), and dates 
            are included under TIMESTAMP.
    """
    logger = _setup_logger(local_debug, 'test.txt')

    # ------------------- TIMESTAMP -------------------
    start_dt = parse_timestamptz(created_at)
    tzinfo = start_dt.tzinfo or timezone.utc
    now_ts = pd.Timestamp.now(tz=tzinfo)

    # --------------------- ORDERS ---------------------
    #from data import ORDERS as raw_orders
    raw_orders = get_all_orders(portfolio_id)
    orders = _orders_df(raw_orders).copy()

    # --------------------- PRICES ---------------------
    tickers = sorted(orders["ticker"].dropna().unique().tolist())
    tickers_no_cash = [t for t in tickers if t != Order.CASH_TICKER]

    prices_raw: Dict[str, pd.DataFrame] = {}
    if tickers_no_cash:
        logger.debug("fetch_full_data: requesting vendor prices...")
        prices_raw = await fetch_full_data(
            tickers=tickers_no_cash,
            period=_get_nearest_yf_period(start_dt, datetime.now(timezone.utc)),
            interval=interval
        )
        logger.debug(f"fetch_full_data returned keys={list(prices_raw.keys())}")
    else:
        logger.debug("no non-cash tickers -> skipping fetch_full_data")

    price_df = _prices_df(prices_raw).copy()

    portfolio_history = await _get_portfolio_history(
        start_date=start_dt,
        orders_df=orders,
        prices_df=price_df,
        logger=logger
    )
    logger.debug("Portfolio history fetched successfully.")

    return portfolio_history
