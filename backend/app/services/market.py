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
    timeout: int = 10,
    *,
    auto_adjust: bool = True,
    prepost: bool = False,
) -> Dict[str, pd.DataFrame]:
    """
    Fetch full OHLCV data from yfinance with caching.
    Returns a dict {ticker: DataFrame}, index tz-aware UTC.
    Cache is keyed by (sorted tickers, period, interval, auto_adjust, prepost).
    """
    import pandas as pd
    import yfinance as yf
    import asyncio, time

    # Normalize ticker list & cache key
    if isinstance(tickers, str):
        tickers_list = [t.strip().upper() for t in tickers.split(",") if t.strip()]
    else:
        tickers_list = [t.strip().upper() for t in tickers if t.strip()]

    tickers_list = sorted(set(tickers_list))
    if not tickers_list:
        return {}

    key = "|".join([
        ",".join(tickers_list),
        f"period={period}",
        f"interval={interval}",
        f"auto_adjust={int(bool(auto_adjust))}",
        f"prepost={int(bool(prepost))}",
    ])

    now = time.time()
    if key in _cache and (now - _cache[key]["timestamp"] < CACHE_TTL):
        return _cache[key]["data"]

    # yfinance: use a **space-separated** ticker string
    ticker_str = " ".join(tickers_list)

    # Do the download in a thread (async safe)
    df: pd.DataFrame = await asyncio.wait_for(
        asyncio.to_thread(
            yf.download,
            tickers=ticker_str,
            period=period,
            interval=interval,
            group_by="ticker",       # ensure first level = ticker
            auto_adjust=auto_adjust, # silence the FutureWarning & be explicit
            prepost=prepost,         # regular-hours default; set True if you want RTH+AH
            progress=False,
        ),
        timeout=timeout,
    )

    # Normalize to per-ticker frames with tz-aware UTC index
    results: Dict[str, pd.DataFrame] = {}

    # yfinance with group_by="ticker" yields a MultiIndex whose first level is the ticker.
    # For a single ticker, columns are flat; handle both cases.
    if isinstance(df.columns, pd.MultiIndex):
        # Expected: top level = ticker, second level = OHLCV
        for t in tickers_list:
            if t in df.columns.get_level_values(0):
                sub = df[t].copy()
                # Ensure tz-aware UTC
                if sub.index.tz is None:
                    sub.index = sub.index.tz_localize("UTC")
                else:
                    sub.index = sub.index.tz_convert("UTC")
                results[t] = sub
            else:
                results[t] = pd.DataFrame(index=pd.DatetimeIndex([], tz="UTC"))
    else:
        # Single ticker case
        sub = df.copy()
        if sub.index.tz is None:
            sub.index = sub.index.tz_localize("UTC")
        else:
            sub.index = sub.index.tz_convert("UTC")
        results[tickers_list[0]] = sub

    # Store in cache with the full key
    _cache[key] = {"data": results, "timestamp": now}
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