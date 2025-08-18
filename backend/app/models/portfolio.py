"""
Portfolio Model
"""

import numpy as np
import pandas as pd
from datetime import datetime

from .order import Order
from .base import BaseModel


class Portfolio(BaseModel):
    """
    Portfolio model
    """
    def __init__(
            self,
            id: str = None,
            user_id: str = None,
            name: str = None,
            created_at: str = None,
            last_updated: str = None
        ):
        self.id = id
        self.user_id = user_id
        self.name = name
        self.created_at = created_at
        self.last_updated = last_updated

    def verify(self) -> 'Portfolio':
        """
        Verify Portfolio: returns self for chaining
        """
        if not self.name:  # accounts for empty strings
            self.name = "Unnamed Portfolio"
        
        return self

    def get_performance(
            self,
            start_date: datetime,
            orders_df: pd.DataFrame,
            prices_df: pd.DataFrame
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
        tickers = set(prices_df.columns.tolist()) | set(orders["ticker"].dropna().unique().tolist()) | {Order.CASH_TICKER}
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

            if tkr == Order.CASH_TICKER:
                # direct cash movement at $1
                pos_delta.at[eff_date, Order.CASH_TICKER] += q
            else:
                # security position change
                if tkr not in pos_delta.columns:
                    # unseen ticker in prices: still track position; its PV will be 0 if no prices
                    pos_delta[tkr] = 0.0
                pos_delta.at[eff_date, tkr] += q
                # cash offset: buys reduce cash; sells (negative qty) increase cash
                pos_delta.at[eff_date, Order.CASH_TICKER] += -q * p

        # Cumulative positions through time
        positions = pos_delta.cumsum()

        # ---- Price matrix aligned to timeline ----
        prices = prices_df.reindex(idx).ffill()  # forward-fill any gaps
        # ensure numeric
        prices = prices.apply(pd.to_numeric, errors="coerce")

        # Add constant price for cash
        prices[Order.CASH_TICKER] = 1.0

        # Keep only tickers we have both positions and prices for (others will value to 0)
        common = [c for c in positions.columns if c in prices.columns]
        if not common:
            # no priced assets; only cash might exist
            common = [Order.CASH_TICKER]
            if Order.CASH_TICKER not in positions.columns:
                positions[Order.CASH_TICKER] = 0.0

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
        if Order.CASH_TICKER in pv.columns:
            ordered.append(Order.CASH_TICKER)
        ordered += [c for c in sorted(pv.columns) if c != Order.CASH_TICKER]

        for col in ordered:
            out[f"pv:{col}"] = pv[col].astype(float).round(6).tolist()
            out[f"dv:{col}"] = dv[col].astype(float).round(6).tolist()

        out["pv:TOTAL"] = pv_total.astype(float).round(6).tolist()
        out["dv:TOTAL"] = dv_total.astype(float).round(6).tolist()
        return out
