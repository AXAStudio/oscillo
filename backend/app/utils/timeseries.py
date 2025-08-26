import pandas as pd
import numpy as np
from typing import Dict, Tuple, Optional, Iterable

CASH_TICKER = "CA$H"

def _align_to_price_index(ts: pd.Timestamp, price_index: pd.DatetimeIndex) -> Optional[pd.Timestamp]:
    """
    Map an order timestamp to the next available bar in the price index.
    If order time is after the last bar, return None (can't book it in this window).
    """
    # Ensure both are tz-aware in the same tz
    if ts.tz is None and price_index.tz is not None:
        ts = ts.tz_localize(price_index.tz)
    elif price_index.tz is None and ts.tz is not None:
        # rare in your pipeline, but guard anyway
        ts = ts.tz_convert(None)

    pos = price_index.searchsorted(ts, side="left")
    if pos >= len(price_index):
        return None
    return price_index[pos]


def compute_portfolio_timeseries(
    prices: pd.DataFrame,           # minute bars, columns = tickers (no CA$H), index = tz-aware DatetimeIndex
    orders: pd.DataFrame,           # columns: ticker, quantity (signed), price, timestamp (tz-aware)
    *,
    cash_ticker: str = CASH_TICKER,
    include_weights: bool = True,
    compute_simple_returns: bool = True,
) -> Dict[str, pd.DataFrame | pd.Series]:
    """
    Build portfolio time series from intraday prices + executed orders.

    Returns dict of:
      - holdings:     shares per ticker over time
      - cash:         cash balance over time
      - position_pv:  value per ticker over time
      - portfolio_pv: total portfolio value (position_pv.sum + cash)
      - weights:      optional, per-ticker weights (position_pv / portfolio_assets) excluding cash
      - ret:          optional, simple returns of total PV
    """
    if not isinstance(prices.index, pd.DatetimeIndex):
        raise ValueError("prices must have DatetimeIndex")

    if prices.index.tz is None:
        raise ValueError("prices index must be tz-aware (UTC or market tz)")

    prices = prices.sort_index()
    tickers = [c for c in prices.columns if c != cash_ticker]

    # --- 1) Clean & align orders to price index ---
    # Keep only tickers we price, and CASH as separate flows
    orders = orders.copy()
    if orders["timestamp"].dtype != "datetime64[ns, UTC]":
        # best effort: coerce to UTC; your pipeline already stores tz-aware
        orders["timestamp"] = pd.to_datetime(orders["timestamp"], utc=True)

    # Split cash vs non-cash orders
    orders_cash = orders[orders["ticker"] == cash_ticker]
    orders_sec  = orders[orders["ticker"].isin(tickers)]

    # Align all order timestamps to next price bar
    def _align_df(df: pd.DataFrame) -> pd.DataFrame:
        aligned_ts = df["timestamp"].apply(lambda t: _align_to_price_index(t, prices.index))
        out = df.copy()
        out["aligned_bar"] = aligned_ts
        out = out.dropna(subset=["aligned_bar"])
        return out

    orders_sec = _align_df(orders_sec)
    orders_cash = _align_df(orders_cash)

    # --- 2) Quantity deltas (shares) for securities ---
    # Sparse dataframe of share changes at aligned bars
    if len(orders_sec):
        qty_changes = (
            orders_sec
            .groupby(["aligned_bar", "ticker"])["quantity"]
            .sum()
            .unstack(fill_value=0.0)
            .reindex(columns=tickers, fill_value=0.0)
        )
    else:
        qty_changes = pd.DataFrame(0.0, index=pd.Index([], dtype=prices.index.dtype), columns=tickers)

    # Reindex to full minute index with zeros, then cumsum to get holdings
    qty_changes = qty_changes.reindex(prices.index, fill_value=0.0)
    holdings = qty_changes.cumsum().astype(float)   # shares per ticker over time

    # --- 3) Cash flows ---
    # (a) Proceeds/costs from securities trades = -quantity * trade_price for buys, + for sells
    if len(orders_sec):
        sec_cash_flows = (
            orders_sec
            .assign(cash_flow=lambda d: -d["quantity"] * d["price"])
            .groupby("aligned_bar")["cash_flow"]
            .sum()
            .reindex(prices.index, fill_value=0.0)
        )
    else:
        sec_cash_flows = pd.Series(0.0, index=prices.index)

    # (b) Pure cash deposits/withdrawals via CA$H rows (qty * price), price ~ 1.00
    if len(orders_cash):
        cash_flows_cash = (
            orders_cash
            .assign(cash_flow=lambda d: d["quantity"] * d["price"])
            .groupby("aligned_bar")["cash_flow"]
            .sum()
            .reindex(prices.index, fill_value=0.0)
        )
    else:
        cash_flows_cash = pd.Series(0.0, index=prices.index)

    cash_flow = (sec_cash_flows + cash_flows_cash).astype(float)
    cash = cash_flow.cumsum()

    # --- 4) Position values & totals ---
    # Align holdings with prices (same index/columns guaranteed by construction)
    position_pv = (holdings * prices[tickers])
    portfolio_assets = position_pv.sum(axis=1)
    portfolio_pv = portfolio_assets + cash

    out: Dict[str, pd.DataFrame | pd.Series] = {
        "holdings": holdings,               # shares
        "cash": cash,                       # $
        "position_pv": position_pv,         # $ per ticker
        "portfolio_pv": portfolio_pv,       # $ total
    }

    if include_weights:
        with np.errstate(divide="ignore", invalid="ignore"):
            weights = position_pv.div(portfolio_assets.replace(0.0, np.nan), axis=0)
        out["weights"] = weights.fillna(0.0)

    if compute_simple_returns:
        ret = portfolio_pv.pct_change().fillna(0.0)
        out["ret"] = ret

    return out
