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
