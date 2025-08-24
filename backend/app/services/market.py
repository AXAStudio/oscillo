"""
Market Data Service
"""

import time
import asyncio
import json
import urllib.parse
import urllib.request
import ssl

import pandas as pd
import yfinance as yf

from typing import Dict, Union, Any
from app.utils.logger import setup_logger

_logger = setup_logger()
# Cache per unique ticker set
_cache: Dict[str, Dict[str, Any]] = {}
CACHE_TTL = 30  # seconds


async def fetch_full_data(
    tickers: Union[str, list],
    period: str = "1d",
    interval: str = "1m",
    timeout: int = 10
) -> Dict[str, pd.DataFrame]:
    """
    Fetch full OHLCV data from yfinance with caching.
    Returns a dictionary of {ticker: DataFrame}.
    """
    if isinstance(tickers, list):
        tickers = ','.join(tickers)

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


async def fetch_recent_quotes(tickers: str, timeout: int = 10):
    """
    Fetch the most recent OHLCV row for a single ticker.
    """
    data = await fetch_full_data(
        tickers,
        period='5d',
        interval='1d',
        timeout=timeout
    )

    out = {}
    for ticker, df in data.items():
        out[ticker] = df['Close'].iloc[-1]

    return out


async def find_ticker(query: str, *, region: int = 1, lang: str = "en", timeout: float = 5.0):
    def _norm(s: str) -> str:
        return "".join(ch for ch in s.lower().strip() if ch.isalnum())

    def _lev(a: str, b: str) -> int:
        if len(a) < len(b):
            a, b = b, a
        prev = list(range(len(b) + 1))
        for i, ca in enumerate(a, 1):
            cur = [i]
            for j, cb in enumerate(b, 1):
                ins = cur[j-1] + 1
                dele = prev[j] + 1
                sub = prev[j-1] + (ca != cb)
                cur.append(min(ins, dele, sub))
            prev = cur
        return prev[-1]

    def _score(q: str, symbol: str, name: str) -> float:
        nq, nsym, nname = _norm(q), _norm(symbol), _norm(name)
        if not nq:
            return -1e9
        if nq == nsym:
            return 1e9
        d_sym = _lev(nq, nsym)
        d_name = _lev(nq, nname)
        sym_norm = d_sym / max(len(nq), len(nsym), 1)
        name_norm = d_name / max(len(nq), len(nname), 1)
        return - (0.65 * sym_norm + 0.35 * name_norm)

    q = query.strip()
    if not q:
        return None

    base = "https://autoc.finance.yahoo.com/autoc"
    params = {"query": q, "region": str(region), "lang": lang}
    url = f"{base}?{urllib.parse.urlencode(params)}"

    ctx = ssl.create_default_context()
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})

    def _fetch():
        try:
            with urllib.request.urlopen(req, timeout=timeout, context=ctx) as resp:
                return json.loads(resp.read().decode("utf-8", errors="ignore"))
        except Exception:
            return None

    data = await asyncio.to_thread(_fetch)
    if not data:
        return None

    results = (data.get("ResultSet") or {}).get("Result") or []
    if not results:
        return None

    equities = [r for r in results if (r.get("typeDisp") or "").lower() in {"equity", "stocks"} or (r.get("type") or "").upper() == "S"]
    pool = equities if equities else results

    best, best_score = None, float("-inf")
    for r in pool:
        sym, name = r.get("symbol") or "", r.get("name") or ""
        if not sym:
            continue
        sc = _score(q, sym, name)
        if sc > best_score:
            best, best_score = r, sc

    if not best:
        return None
    return best.get("symbol", "").upper()


async def get_ticker_metadata(ticker : str, timeout: int = 10) -> Dict[str, Any]:
    """
    Fetch metadata for a given ticker using yfinance.
    """

    def _fetch():
        try:
            tk = yf.Ticker(ticker)
            _logger.info("Got ticker")
            info = tk.info
            return {
                #"symbol": info.get("symbol"),
                #"shortName": info.get("shortName"),
                "name": info.get("longName"),
                #"currency": info.get("currency"),
                #"marketCap": info.get("marketCap"),
                "sector": info.get("sector"),
                #"industry": info.get("industry"),
                #"website": info.get("website"),
                #"description": info.get("longBusinessSummary"),
            }
        except Exception:
            _logger.info("caught exception")
            return {}

    return await asyncio.wait_for(
        asyncio.to_thread(_fetch),
        timeout=timeout
    )