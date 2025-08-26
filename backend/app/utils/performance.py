"""
Performance Aggregation Functions
"""

from __future__ import annotations

import numpy as np
import pandas as pd
from typing import Dict, Any
from datetime import datetime


def clean_orders_df(raw: Any) -> pd.DataFrame:
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


def clean_prices_df(prices_dict: Dict[str, pd.DataFrame]) -> pd.DataFrame:
    """
    Build wide price DataFrame (index=Datetime[UTC], cols=tickers, values=Close).
    Accepts dict[ticker] -> df with either an index or a column named 'Datetime'/'Date'.
    Preserves sub-daily resolution (minute, hourly, etc.).
    """
    frames = []
    for tkr, df in (prices_dict or {}).items():
        if df is None or df.empty:
            continue

        local = df.copy()

        # Find timestamp series: prefer index if it's datetime-like, else a column.
        if isinstance(local.index, pd.DatetimeIndex):
            ts = local.index
        else:
            col = "Datetime" if "Datetime" in local.columns else "Date"
            ts = pd.to_datetime(local[col], errors="coerce")

        # Ensure tz-aware UTC index
        if ts.tz is None:
            ts = pd.to_datetime(ts, utc=True, errors="coerce")      # localize to UTC
        else:
            ts = ts.tz_convert("UTC")                               # convert to UTC

        # Build a Series of Close (or Adj Close if Close missing)
        close_col = "Close" if "Close" in local.columns else "Adj Close"
        s = pd.Series(pd.to_numeric(local[close_col], errors="coerce"), index=ts, name=str(tkr).upper())

        # Drop missing timestamps/values and de-duplicate exact-timestamp rows
        s = s.dropna()
        s = s.groupby(level=0).last()

        frames.append(s)

    if not frames:
        return pd.DataFrame()

    px = pd.concat(frames, axis=1).sort_index()
    px.index.name = "Datetime"   # nice to have
    return px


def nearest_yf_period(
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
