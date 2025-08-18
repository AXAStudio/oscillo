"""
Portfolio Aggregation Utils
"""

from __future__ import annotations
from threading import local

import numpy as np
import pandas as pd
from typing import Dict, Any
from collections import defaultdict
from datetime import datetime, timezone

from app.models import Order
from .orders import get_all_orders
from .market import fetch_full_data
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


def _floor_to_interval(ts: pd.Series, interval: str, tzinfo) -> pd.Series:
    freq = _freq_from_interval(interval)
    if ts.dt.tz is None:
        ts = ts.dt.tz_localize(timezone.utc)
    ts = ts.dt.tz_convert(tzinfo)
    return ts.dt.floor(freq)


def _freq_from_interval(interval: str) -> str:
    iv = interval.lower()
    return {
        "1m":"T","2m":"2T","5m":"5T","15m":"15T","30m":"30T","60m":"60T","90m":"90T",
        "1h":"H","1d":"D","1wk":"W-FRI","1mo":"M"
    }.get(iv, "D")


def _local_debug(msg: str):
    """
    Local logger for debugging purposes.
    """
    with open('test.txt', 'a') as f:
        f.write(msg + '\n')


async def get_portfolio_history(
    portfolio_id: str,
    created_at: str,
    get_ticker_history: bool,
    interval: str = '1d',
    local_debug: bool = False
) -> dict[str, list]:
    if local_debug:
        _local_debug('\n\n=== get_portfolio_history DEBUG START ===\n')

    # ------------------- TIMESTAMP -------------------
    start_dt = parse_timestamptz(created_at)
    tzinfo = start_dt.tzinfo or timezone.utc
    now_ts = pd.Timestamp.now(tz=tzinfo)

    # --------------------- ORDERS ---------------------
    from data import ORDERS as raw_orders
    # raw_orders = get_all_orders(portfolio_id)
    orders = _orders_df(raw_orders).copy()

    if local_debug:
        _local_debug('Loaded orders: \n' + orders)

    # --------------------- PRICES ---------------------
    tickers = sorted(orders["ticker"].dropna().unique().tolist())
    tickers_no_cash = [t for t in tickers if t != Order.CASH_TICKER]

    prices_raw: Dict[str, pd.DataFrame] = {}
    if tickers_no_cash:
        if local_debug:
            _local_debug("fetch_full_data: requesting vendor prices...")
        prices_raw = await fetch_full_data(
            tickers=tickers_no_cash,
            period=_get_nearest_yf_period(start_dt, datetime.now(timezone.utc)),
            interval=interval
        )
        if local_debug:
            _local_debug(f"fetch_full_data returned keys={list(prices_raw.keys())}")
    else:
        if local_debug:
            _local_debug("no non-cash tickers -> skipping fetch_full_data")

    price_df = _prices_df(prices_raw).copy()
    if local_debug:
        _local_debug(f"_prices_df -> shape={price_df.shape}, columns={list(price_df.columns)}")
    if not price_df.empty:
        if price_df.index.tz is None:
            price_df.index = price_df.index.tz_localize(timezone.utc)
            if local_debug:
                _local_debug("price_df.index tz_localized to UTC")
        price_df.index = price_df.index.tz_convert(tzinfo)
        if local_debug:
            _local_debug(f"price_df.index tz_converted to tzinfo={tzinfo}; index[0:5]={list(price_df.index[:5])}")
            _local_debug("price_df.head(3):\n" + price_df.head(3).to_string())
            _local_debug("price_df.tail(3):\n" + price_df.tail(3).to_string())
    else:
        _local_debug("price_df EMPTY")

    # --------------------- MAIN ---------------------
    timestamps = pd.date_range(start=start_dt, end=now_ts, freq=_freq_from_interval(interval), tz=tzinfo)

    for timestamp in timestamps:
        if local_debug:
            _local_debug(f"Processing timestamp: {timestamp}")

   
async def other_func(
        portfolio_id: str,
        created_at: str,
        get_ticker_history: bool,
        interval: str = '1d',
        local_debug: bool = False
):
    # ---------------- DEBUG UTIL ----------------
    import math, json
    from collections import defaultdict

    def _dbg_write(line: str):
        try:
            with open("test.txt", "a", encoding="utf-8") as f:
                f.write(line + "\n")
        except Exception:
            with open("test.txt", "a") as f:
                f.write(line + "\n")

    # fresh file header
    try:
        with open("test.txt", "w", encoding="utf-8") as f:
            f.write("=== get_portfolio_history DEBUG START ===\n")
    except Exception:
        pass

    _dbg_write(f"params: portfolio_id={portfolio_id}, created_at={created_at}, get_ticker_history={get_ticker_history}, interval={interval}")

    # --------------- MAIN ----------------------
    start_dt = parse_timestamptz(created_at)
    tzinfo = start_dt.tzinfo or timezone.utc
    start_day = pd.Timestamp(start_dt.date(), tz=tzinfo)
    now_ts = pd.Timestamp.now(tz=tzinfo)

    _dbg_write(f"parsed: start_dt={start_dt} (tz={getattr(start_dt,'tzinfo',None)}), tzinfo={tzinfo}")
    _dbg_write(f"start_day={start_day}, now_ts={now_ts}")

    # 1) Orders
    from data import ORDERS as raw_orders
    # raw_orders = get_all_orders(portfolio_id)
    _dbg_write(f"\n\nget_all_orders={raw_orders}\n\n")
    _dbg_write(f"raw_orders type={type(raw_orders)} len={len(raw_orders) if hasattr(raw_orders,'__len__') else 'n/a'}")

    orders = _orders_df(raw_orders).copy()
    _dbg_write(f"_orders_df -> shape={orders.shape}, columns={list(orders.columns)}")
    _dbg_write(f"orders.dtypes:\n{orders.dtypes}")

    orders["timestamp"] = pd.to_datetime(orders["timestamp"], utc=True, errors="coerce").dt.tz_convert(tzinfo)
    orders = orders[orders["timestamp"] >= start_day]
    orders["ticker"]   = orders["ticker"].astype(str)
    orders["quantity"] = pd.to_numeric(orders["quantity"], errors="coerce").fillna(0.0)
    orders["price"]    = pd.to_numeric(orders["price"],    errors="coerce")

    _dbg_write(f"orders after tz/filters -> shape={orders.shape}")
    _dbg_write("orders.head(10):\n" + orders.head(10).to_string(index=False))

    # Floor to interval (and force tz alignment)
    orders["bucket"] = _floor_to_interval(orders["timestamp"], interval, tzinfo)
    if getattr(orders["bucket"].dt, "tz", None) is None:
        orders["bucket"] = orders["bucket"].dt.tz_localize(tzinfo)
        _dbg_write("orders.bucket tz_localized to tzinfo")
    else:
        orders["bucket"] = orders["bucket"].dt.tz_convert(tzinfo)
        _dbg_write("orders.bucket tz_converted to tzinfo")

    # Sort by bucket then timestamp
    orders = orders.sort_values(["bucket", "timestamp"]).reset_index(drop=True)

    _dbg_write("orders (post bucket & sort) head(10):\n" + orders[["ticker","quantity","price","timestamp","bucket"]].head(10).to_string(index=False))
    if not orders.empty:
        _dbg_write(f"orders.time_range: min_ts={orders['timestamp'].min()}, max_ts={orders['timestamp'].max()}, min_bucket={orders['bucket'].min()}, max_bucket={orders['bucket'].max()}")
        _dbg_write(f"orders unique tickers: {sorted(orders['ticker'].dropna().unique().tolist())}")
    else:
        _dbg_write("orders is EMPTY after filtering by start_day")

    tickers = sorted(orders["ticker"].dropna().unique().tolist())
    tickers_no_cash = [t for t in tickers if t != Order.CASH_TICKER]
    _dbg_write(f"tickers={tickers}, tickers_no_cash={tickers_no_cash}")

    # 2) Prices (exclude CA$H)
    prices_raw: Dict[str, pd.DataFrame] = {}
    if tickers_no_cash:
        _dbg_write("fetch_full_data: requesting vendor prices...")
        prices_raw = await fetch_full_data(
            tickers=tickers_no_cash,
            period=_get_nearest_yf_period(start_dt, datetime.now(timezone.utc)),
            interval=interval
        )
        _dbg_write(f"fetch_full_data returned keys={list(prices_raw.keys())}")
    else:
        _dbg_write("no non-cash tickers -> skipping fetch_full_data")

    price_df = _prices_df(prices_raw).copy()
    _dbg_write(f"_prices_df -> shape={price_df.shape}, columns={list(price_df.columns)}")
    if not price_df.empty:
        if price_df.index.tz is None:
            price_df.index = price_df.index.tz_localize(timezone.utc)
            _dbg_write("price_df.index tz_localized to UTC")
        price_df.index = price_df.index.tz_convert(tzinfo)
        _dbg_write(f"price_df.index tz_converted to tzinfo={tzinfo}; index[0:5]={list(price_df.index[:5])}")
        _dbg_write("price_df.head(3):\n" + price_df.head(3).to_string())
        _dbg_write("price_df.tail(3):\n" + price_df.tail(3).to_string())
    else:
        _dbg_write("price_df EMPTY")

    # 2.x) Normalize price_df columns so they match tickers (AAPL, TSLA, ...)
    px = pd.DataFrame()
    if not price_df.empty:
        if isinstance(price_df.columns, pd.MultiIndex):
            _dbg_write(f"price_df has MultiIndex columns levels={price_df.columns.nlevels}")
            last_levels = price_df.columns.get_level_values(-1)
            _dbg_write(f"last level sample: {list(last_levels[:10])}")
            chosen = None
            for fld in ("Adj Close", "Close", "adjclose", "close", "price", "last"):
                if fld in last_levels:
                    chosen = fld
                    px = price_df.xs(fld, axis=1, level=-1)
                    _dbg_write(f"chose field from last level: {fld}")
                    break
            if px.empty:
                tmp = {}
                first_level = price_df.columns.get_level_values(0)
                uniq = sorted(set(first_level))
                _dbg_write(f"fallback collapsing MultiIndex; first-level uniq={uniq}")
                for tkr in uniq:
                    sub = price_df.loc[:, first_level == tkr]
                    tmp[str(tkr).upper()] = sub.iloc[:, -1]
                px = pd.DataFrame(tmp)
            else:
                px.columns = [str(c).upper() for c in px.columns]
        else:
            ren = {}
            for c in price_df.columns:
                s = str(c)
                base = s.split("_")[0].split(" ")[0].split("/")[0].split("|")[0].upper()
                ren[c] = base
            _dbg_write(f"single-index rename map (first 20): {dict(list(ren.items())[:20])}")
            px = price_df.rename(columns=ren)
        # Keep only tickers we care about (non-cash)
        if tickers_no_cash:
            cols_keep = [t for t in tickers_no_cash if t in px.columns]
            _dbg_write(f"px pre-filter columns={list(px.columns)}")
            px = px[cols_keep] if cols_keep else pd.DataFrame(index=price_df.index)
            _dbg_write(f"px post-filter columns={list(px.columns)}; shape={px.shape}")
        else:
            _dbg_write("no non-cash tickers -> px will remain empty")
    else:
        _dbg_write("skip px normalization (price_df empty)")

    # 3) Timeline (DENSE, UNIFORMLY SPACED)  **FIXED START**
    freq = _freq_from_interval(interval)
    _dbg_write(f"_freq_from_interval -> {freq}")

    # Build candidate starts: created_at, first order bucket, first price bar
    start_candidates = []
    # created_at floored to grid in tz
    created_bucket = (pd.Timestamp(start_dt).tz_convert(tzinfo) if pd.Timestamp(start_dt).tzinfo
                      else pd.Timestamp(start_dt).tz_localize(tzinfo)).floor(freq)
    start_candidates.append(created_bucket)
    if not orders.empty:
        start_candidates.append(orders["bucket"].min())
    if not price_df.empty:
        start_candidates.append(price_df.index.min())

    # Choose earliest candidate
    start_bucket = min(start_candidates)
    _dbg_write(f"TIMELINE START CANDIDATES -> created_bucket={created_bucket}, "
               f"min_order_bucket={orders['bucket'].min() if not orders.empty else 'n/a'}, "
               f"min_price_idx={price_df.index.min() if not price_df.empty else 'n/a'}")
    _dbg_write(f"start_bucket (chosen earliest) = {start_bucket}")

    end_candidates = [now_ts]
    if not orders.empty:
        end_candidates.append(orders["bucket"].max())
    if not price_df.empty:
        end_candidates.append(price_df.index.max())
    end_dt = max(end_candidates)
    end_bucket = pd.Timestamp(end_dt).tz_convert(tzinfo).floor(freq)

    _dbg_write(f"timeline bounds: start_bucket={start_bucket}, end_bucket={end_bucket}")

    idx = pd.date_range(start=start_bucket, end=end_bucket, freq=freq, tz=tzinfo)
    if len(idx) == 0:
        idx = pd.DatetimeIndex([start_bucket], tz=tzinfo)
        _dbg_write("idx was empty; forced to [start_bucket]")

    _dbg_write(f"idx len={len(idx)}; first 10={list(idx[:10])}; last 10={list(idx[-10:]) if len(idx)>=10 else list(idx)}")
    if not orders.empty:
        _dbg_write(f"orders unique buckets (first 20): {list(pd.unique(orders['bucket']))[:20]}")

    # 4) Prices aligned to idx (use normalized px)
    if not px.empty:
        prices = (px.sort_index()
                    .resample(freq).last()
                    .reindex(idx)
                    .ffill())
        _dbg_write(f"prices after resample/reindex/ffill -> shape={prices.shape}, cols={list(prices.columns)}")
        if prices.shape[1] > 0:
            try:
                _dbg_write("prices.head(5):\n" + prices.head(5).to_string())
            except Exception:
                pass
    else:
        prices = pd.DataFrame(index=idx)
        _dbg_write("prices empty (no px)")

    prices[Order.CASH_TICKER] = 1.0  # constant cash price across the grid
    _dbg_write(f"set prices['{Order.CASH_TICKER}']=1.0; final price cols={list(prices.columns)}")

    # BEFORE the main loop
    out = {"timestamp": [ts.isoformat() for ts in idx], "pv:TOTAL": [], "dv:TOTAL": []}
    pos = defaultdict(float)                # running quantities per ticker (CA$H in $ units)
    last_value_by_ticker = defaultdict(float)
    last_total_value = 0.0
    last_trade_price: Dict[str, float] = {}

    if get_ticker_history:
        per_asset_pv: Dict[str, list] = {t: [] for t in tickers}
        per_asset_dv: Dict[str, list] = {t: [] for t in tickers}
        _dbg_write(f"initialized per_asset_* for tickers={tickers}")

    # POINTER over orders: apply all with bucket <= current bar
    i = 0
    n_orders = len(orders)
    _dbg_write(f"entering main loop; n_orders={n_orders}")

    def _pos_snapshot():
        try:
            return {k: float(v) for k, v in pos.items()}
        except Exception:
            return dict(pos)

    for ts_idx, ts in enumerate(idx):
        if ts_idx < 5 or ts_idx >= len(idx)-5 or (ts_idx % 60 == 0):
            _dbg_write(f"\n--- BAR {ts_idx}/{len(idx)} ts={ts} ---")
            _dbg_write(f"pos before orders: {json.dumps(_pos_snapshot())}")

        # Apply all orders up to and including this bucket
        while i < n_orders and orders.at[i, "bucket"] <= ts:
            row = orders.iloc[i]
            tkr = str(row["ticker"])
            q   = float(row["quantity"])
            pxv = row["price"]
            prev_cash = pos.get(Order.CASH_TICKER, 0.0)

            pos[tkr] += q
            if pd.notna(pxv):
                last_trade_price[tkr] = float(pxv)

            cash_leg = 0.0
            if tkr != Order.CASH_TICKER:
                trade_px = float(pxv) if pd.notna(pxv) else float(last_trade_price.get(tkr, 0.0))
                cash_leg = - q * trade_px
                pos[Order.CASH_TICKER] += cash_leg

            _dbg_write(f"APPLY ORDER i={i}: ts={row['timestamp']} bucket={row['bucket']} tkr={tkr} q={q} px={pxv} "
                       f"-> pos[{tkr}]={pos[tkr]} cash_leg={cash_leg} cash_before={prev_cash} cash_after={pos.get(Order.CASH_TICKER,0.0)}")
            i += 1

        # Compute PV for all active tickers
        price_row = prices.loc[ts] if ts in prices.index else pd.Series(dtype=float)
        total_value = 0.0

        active_tickers = list(pos.keys())
        if ts_idx < 5 or ts_idx % 60 == 0:
            _dbg_write(f"active_tickers: {active_tickers}")

        for tkr in active_tickers:
            if tkr == Order.CASH_TICKER:
                p = 1.0
                used_fallback = False
            else:
                p = price_row.get(tkr, math.nan)
                used_fallback = False
                if (isinstance(p, float) and math.isnan(p)) or pd.isna(p):
                    p = last_trade_price.get(tkr, math.nan)
                    used_fallback = True

            pv = 0.0 if (isinstance(p, float) and math.isnan(p)) else float(pos[tkr]) * float(p)
            dv = pv - float(last_value_by_ticker[tkr])
            if ts_idx == 0:
                dv = 0.0  # first bar delta optional normalization

            last_value_by_ticker[tkr] = pv
            total_value += pv

            if ts_idx < 5 or ts_idx % 60 == 0:
                _dbg_write(f"PV CALC tkr={tkr}: qty={pos[tkr]} price={p} fallback={used_fallback} pv={pv} dv={dv}")

            if get_ticker_history:
                if tkr not in per_asset_pv:
                    per_asset_pv[tkr] = [0.0] * ts_idx
                    per_asset_dv[tkr] = [0.0] * ts_idx
                    _dbg_write(f"init per-asset arrays for late tkr={tkr} with pad={ts_idx}")
                per_asset_pv[tkr].append(float(pv))
                per_asset_dv[tkr].append(float(dv))

        # Carry-forward for idle tickers
        if get_ticker_history:
            for tkr in per_asset_pv.keys():
                if len(per_asset_pv[tkr]) == ts_idx:
                    pv_cf = float(last_value_by_ticker[tkr])
                    per_asset_pv[tkr].append(pv_cf)
                    per_asset_dv[tkr].append(0.0)
                    if ts_idx < 5 or ts_idx % 60 == 0:
                        _dbg_write(f"carry-forward tkr={tkr}: pv={pv_cf} dv=0.0")

        dv_total = float(total_value - last_total_value) if ts_idx > 0 else 0.0
        out["pv:TOTAL"].append(float(total_value))
        out["dv:TOTAL"].append(dv_total)
        if ts_idx < 5 or ts_idx % 60 == 0:
            _dbg_write(f"TOTAL: pv={total_value} dv={dv_total}")
        last_total_value = total_value

    # After loop: finalize per-ticker
    if get_ticker_history:
        out["tickers"] = sorted(per_asset_pv.keys())
        _dbg_write(f"final tickers={out['tickers']}")
        for tkr in out["tickers"]:
            out[f"pv:{tkr}"] = per_asset_pv[tkr]
            out[f"dv:{tkr}"] = per_asset_dv[tkr]
            _dbg_write(f"series lengths {tkr}: pv={len(per_asset_pv[tkr])}, dv={len(per_asset_dv[tkr])}")

    # Final consistency checks
    L = len(out["timestamp"])
    _dbg_write(f"FINAL lengths: timestamp={L}, pv:TOTAL={len(out['pv:TOTAL'])}, dv:TOTAL={len(out['dv:TOTAL'])}")
    if get_ticker_history:
        for tkr in out.get("tickers", []):
            _dbg_write(f"len check: pv:{tkr}={len(out.get(f'pv:{tkr}',[]))}, dv:{tkr}={len(out.get(f'dv:{tkr}',[]))}")

    _dbg_write("=== get_portfolio_history DEBUG END ===")
    return out
