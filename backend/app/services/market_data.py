"""
Market data endpoints.
"""

import time
import asyncio

import pandas as pd
import yfinance as yf

from typing import Dict, Any

# Cache per unique ticker set
_cache: Dict[str, Dict[str, Any]] = {}
CACHE_TTL = 30  # seconds


async def fetch_full_data(
    tickers: str,
    period: str = "1d",
    interval: str = "1m",
    timeout: int = 10
) -> Dict[str, pd.DataFrame]:
    """
    Fetch full OHLCV data from yfinance with caching.
    Returns a dictionary of {ticker: DataFrame}.
    """
    tickers_key = tickers.strip().upper()
    now = time.time()

    # Serve from cache if still valid
    if tickers_key in _cache and (now - _cache[tickers_key]["timestamp"] < CACHE_TTL):
        return _cache[tickers_key]["data"]

    # Fetch data with timeout
    data: pd.DataFrame = await asyncio.wait_for(
        asyncio.to_thread(
            yf.download,
            tickers=" ".join(tickers_key.split(",")),
            period=period,
            interval=interval,
            progress=False
        ),
        timeout=timeout
    )

    results: Dict[str, pd.DataFrame] = {}
    ticker_list = tickers_key.split(",")

    if isinstance(data.columns, pd.MultiIndex):
        # Multi-ticker format
        for ticker in ticker_list:
            try:
                df = data.xs(ticker, axis=1, level=1)  # extract one ticker's data
                results[ticker] = df
            except KeyError:
                results[ticker] = pd.DataFrame()
    else:
        # Single-ticker format
        results[ticker_list[0]] = data

    # Store in cache
    _cache[tickers_key] = {
        "data": results,
        "timestamp": now
    }

    return results


async def fetch_last_single(ticker: str, period: str, interval: str, timeout: int):
    """
    Fetch the most recent OHLCV row for a single ticker.
    """
    try:
        df = await asyncio.wait_for(
            asyncio.to_thread(
                lambda: yf.Ticker(ticker).history(period=period, interval=interval)
            ),
            timeout=timeout
        )

        if not df.empty:
            return df.tail(1).reset_index().to_dict(orient="records")[0]
        return None
    except asyncio.TimeoutError:
        return None
    except Exception:
        return None

