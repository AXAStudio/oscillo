"""
Portfolio Aggregation Utils
"""

from __future__ import annotations

import pandas as pd
from datetime import datetime

from .orders import get_all_orders
from .market_data import fetch_full_data
from app.utils.timestamps import parse_timestamptz


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


def _midnight(ts: pd.Timestamp, tzinfo) -> datetime:
    d = ts.to_pydatetime().date()
    return datetime(d.year, d.month, d.day, tzinfo=tzinfo)


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
        local = df.copy()
        # standardize column names
        time_col = "Datetime" if "Datetime" in local.columns else (
            "Date" if "Date" in local.columns else None
        )
        if time_col is None or "Close" not in local.columns:
            continue
        # keep full timestamp resolution
        idx = pd.to_datetime(local[time_col], utc=True, errors="coerce").dt.tz_localize(None)
        s = pd.Series(local["Close"].astype(float).values, index=idx, name=str(tkr).upper())
        # only collapse if true duplicates exist at the *same exact timestamp*
        s = s.groupby(level=0).last()
        frames.append(s)
    if not frames:
        return pd.DataFrame()
    px = pd.concat(frames, axis=1).sort_index()
    return px





from datetime import datetime, timezone
from typing import Dict, List, Any, Optional

import numpy as np
import pandas as pd


def get_portfolio_history(
    portfolio_id: str,
    created_at: str,
    get_ticker_history: bool,
    interval: str = '1d'
) -> dict[str, list]:
    """
    Portfolio time series with both cumulative values and interval-wise deltas.
    """
    # --- main ---------------------------------------------------------------
    start_dt = parse_timestamptz(created_at)
    tzinfo = start_dt.tzinfo or timezone.utc
    start_day = pd.Timestamp(start_dt.date())

    # 1) Orders
    raw_orders = get_all_orders(portfolio_id)
    orders = _orders_df(raw_orders)
    tickers = sorted(orders["ticker"].dropna().unique().tolist())

    # 2) Prices
    prices_raw = {}
    if tickers:
        prices_raw = fetch_full_data(
            tickers=tickers,
            period=_get_nearest_yf_period(start_dt, datetime.now(timezone.utc)),
            interval=interval
        )
    price_df = _prices_df(prices_raw)

    # 3) Timeline
    if price_df.empty:
        order_days = (
            orders["timestamp"]
            .dt.tz_convert("UTC").dt.tz_localize(None).dt.normalize().tolist()
        )
        timeline_idx = pd.DatetimeIndex(sorted({start_day, *order_days})) or pd.DatetimeIndex([start_day])
    else:
        price_df = price_df.loc[price_df.index >= start_day]
        timeline_idx = pd.DatetimeIndex(sorted({start_day, *price_df.index.tolist()}))

    if len(timeline_idx) == 0:
        timeline_idx = pd.DatetimeIndex([start_day])

    # 4) Align orders
    order_day = orders["timestamp"].dt.tz_convert("UTC").dt.tz_localize(None).dt.normalize()
    idxs = timeline_idx.searchsorted(order_day, side="left")
    valid_mask = idxs < len(timeline_idx)
    orders = orders.loc[valid_mask].copy()
    orders["eff_date"] = timeline_idx[idxs[valid_mask]]

    # 5) Split transfers vs trades
    is_transfer = orders["ticker"].isna()
    transfers = orders.loc[is_transfer, ["eff_date", "quantity"]].copy()
    trades = orders.loc[~is_transfer, ["eff_date", "ticker", "quantity", "price"]].copy()

    # 6) Positions & deltas
    if trades.empty:
        deltas = pd.DataFrame(0.0, index=timeline_idx, columns=tickers)
        positions = deltas.copy()
    else:
        deltas = trades.pivot_table(
            index="eff_date", columns="ticker", values="quantity", aggfunc="sum"
        ).reindex(timeline_idx, fill_value=0.0).sort_index()
        positions = deltas.cumsum()

    # 7) Cash
    cf_transfers = transfers.groupby("eff_date")["quantity"].sum() if not transfers.empty else pd.Series(dtype=float)
    cf_trades = (trades.assign(cf=lambda d: -(d["quantity"] * d["price"]))
                        .groupby("eff_date")["cf"].sum()) if not trades.empty else pd.Series(dtype=float)

    cash_flows = (cf_transfers.reindex(timeline_idx, fill_value=0.0)
                 + cf_trades.reindex(timeline_idx, fill_value=0.0))
    cash_series = cash_flows.cumsum()

    # 8) Prices & valuations
    if price_df.empty:
        price_aligned = pd.DataFrame(0.0, index=timeline_idx, columns=tickers)
    else:
        price_aligned = price_df.reindex(timeline_idx).ffill().fillna(0.0)

    positions, price_aligned = positions.align(price_aligned, join="outer", axis=1, fill_value=0.0)

    valuation_by_ticker = positions * price_aligned
    equity_value = valuation_by_ticker.sum(axis=1)
    portfolio_agg = (equity_value + cash_series).astype(float)

    # --- NEW: deltas relative to previous row ---
    capital_delta = cash_series.diff().fillna(cash_series)
    portfolio_delta = portfolio_agg.diff().fillna(portfolio_agg)
    ticker_deltas = valuation_by_ticker.diff().fillna(valuation_by_ticker)

    # 9) Output
    out: Dict[str, list] = {
        "TIMESTAMP": [_midnight(ts, tzinfo) for ts in timeline_idx],
        "CAPITAL": cash_series.round(4).tolist(),
        "PORTFOLIO_AGG": portfolio_agg.round(4).tolist(),
        "CAPITAL_DELTA": capital_delta.round(4).tolist(),
        "PORTFOLIO_DELTA": portfolio_delta.round(4).tolist(),
    }
    if get_ticker_history and not valuation_by_ticker.empty:
        for tkr in valuation_by_ticker.columns:
            out[str(tkr)] = valuation_by_ticker[tkr].round(4).tolist()
            out[f"{tkr}_DELTA"] = ticker_deltas[tkr].round(4).tolist()

    return out



