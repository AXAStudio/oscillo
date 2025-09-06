"""
Performance Service
"""

import uuid

import pandas as pd
from typing import Dict, Tuple
from supabase import create_client
from datetime import datetime, timezone
from pandas.tseries.offsets import DateOffset

from app.configs import config
from app.models import Order, Portfolio
from app.utils.logger import setup_logger
from app.services.orders import get_all_orders
from app.services.market import fetch_full_data
from app.utils.timestamps import parse_timestamptz
from app.utils.performance import (
    clean_orders_df,
    clean_prices_df,
    nearest_yf_period
)


_logger = setup_logger()


supabase = create_client(
    config.SUPABASE_URL,
    config.SUPABASE_SERVICE_KEY
)


def _ensure_uuid_str(value: str, field_name: str) -> str:
    """Validate input is a UUID and return its canonical string form."""
    try:
        return str(uuid.UUID(str(value)))
    except Exception:
        raise ValueError(f"{field_name} must be a valid UUID string; got: {value!r}")

def _choose_period(start_dt, now_dt, retrieval_period: str | None) -> str:
    """
    Prefer explicit retrieval_period (if valid) else fall back to nearest_yf_period().
    """
    valid = {"1d","5d","7d","1mo","3mo","6mo","ytd","1y","2y","5y","10y","max"}
    if retrieval_period and retrieval_period.lower() in valid:
        return retrieval_period.lower()
    return nearest_yf_period(start_dt, now_dt)


def _validate_yf(period: str, interval: str) -> Tuple[str, str]:
    """
    Yahoo rule of thumb:
    - 1m allowed only for short windows (~7 days). We allow {'1d','5d','7d'}.
    - For 1mo windows, prefer 5m or 15m or 30m depending on your taste; 30m is safe & light.
    - Otherwise, default to daily.
    """
    p = period.lower()
    i = interval.lower()

    if i == "1m" and p not in {"1d", "5d", "7d"}:
        if p == "1mo":
            return ("1mo", "5m")  # lighter alt: ("1mo", "30m")
        return (p, "1d")

    # 90m typically good up to ~60 days; if user maps YTD to 90m it can break mid-year.
    # We'll leave other combos as-is and rely on the backend to error if illegal.
    return (p, i)


def _parse_granularity(granularity: str) -> Tuple[str, str]:
    """
    Map a UI granularity to (period, interval) *intent* before validation.
    We’ll still run it through _validate_yf to make sure Yahoo allows it.
    """
    g = granularity.upper().strip()
    mapping: Dict[str, Tuple[str, str]] = {
        "1D":  ("1d",  "1m"),   # intraday minute bars (valid)
        "1W":  ("5d",  "5m"),   # 5 trading days -> 5m
        "1M":  ("1mo", "30m"),  # 1 month -> 30m (or 5m/15m if you want denser)
        "YTD": ("ytd", "1d"),   # YTD -> daily (avoid 90m mid-year issues)
        "1Y":  ("1y",  "1d"),   # 1 year -> daily
        "ALL": ("max", "1d"),   # max history -> daily
    }
    if g not in mapping:
        raise ValueError(
            f"Invalid granularity: {granularity}. "
            f"Must be one of {list(mapping.keys())}"
        )
    return mapping[g]



NY = "America/New_York"

def compute_window(granularity: str, now_utc: pd.Timestamp | None = None) -> Tuple[pd.Timestamp, pd.Timestamp]:
    """
    Return (start_utc, end_utc) for the requested granularity.
    """
    if now_utc is None:
        now_utc = pd.Timestamp.utcnow().tz_localize("UTC")

    now_ny = now_utc.tz_convert(NY)
    end_utc = now_utc
    g = granularity.upper().strip()

    if g == "1D":
        # same-calendar-day regular session (09:30–16:00 NY), minus 1 minute to align with minute bars
        day = now_ny.date()
        start_ny = pd.Timestamp(day, tz=NY) + pd.Timedelta(hours=9, minutes=30)
        end_ny   = pd.Timestamp(day, tz=NY) + pd.Timedelta(hours=16) - pd.Timedelta(minutes=1)
        return start_ny.tz_convert("UTC"), end_ny.tz_convert("UTC")

    if g == "1W":
        return (now_utc - pd.Timedelta(days=7), end_utc)

    if g == "1M":
        return (now_utc - DateOffset(months=1), end_utc)

    if g == "YTD":
        ytd_start_ny = pd.Timestamp(year=now_ny.year, month=1, day=1, tz=NY)
        return (ytd_start_ny.tz_convert("UTC"), end_utc)

    if g in ("1Y", "1YR"):
        return (now_utc - DateOffset(years=1), end_utc)

    # ALL: let caller widen to earliest seen data/first order
    return (pd.Timestamp("1970-01-01", tz="UTC"), end_utc)


async def get_portfolio_data(
    user_id: str,
    portfolio_id: str,
    granularity: str = "ALL"
):
    # ---- Validate IDs ----
    user_id_str = _ensure_uuid_str(user_id, "user_id")
    portfolio_id_str = _ensure_uuid_str(portfolio_id, "portfolio_id")

    portfolio_res = (
        supabase.table(config.DB_SCHEMA.PORTFOLIOS)
        .select("*")
        .eq("user_id", user_id_str)
        .eq("id", portfolio_id_str)
        .execute()
    )
    if not portfolio_res.data:
        raise ValueError("Portfolio not found or not accessible by user")

    portfolio = Portfolio(**portfolio_res.data[0])

    # ---- Time context ----
    start_dt = parse_timestamptz(portfolio.created_at)  # tz-aware
    tzinfo = start_dt.tzinfo or timezone.utc
    now_dt = datetime.now(tzinfo)
    now_utc = pd.Timestamp(now_dt).tz_convert("UTC")

    # ---- Orders ----
    # raw_orders = await get_all_orders(portfolio_id_str)
    from test_data import ORDERS as raw_orders
    orders = clean_orders_df(raw_orders).copy()

    # ---- Granularity -> intended (period, interval) ----
    intended_period, intended_interval = _parse_granularity(granularity)

    # ---- Choose final period; validate with Yahoo rules ----
    yf_period = _choose_period(start_dt, now_dt, intended_period)
    effective_period, effective_interval = _validate_yf(yf_period, intended_interval)

    # ---- Tickers ----
    tickers = sorted(orders["ticker"].dropna().unique().tolist())
    tickers_no_cash = [t for t in tickers if t != Order.CASH_TICKER]
    _logger.info({
        "granularity_in": granularity,
        "intended": (intended_period, intended_interval),
        "effective": (effective_period, effective_interval),
    })

    # ---- Fetch prices ----
    prices_raw: Dict[str, pd.DataFrame] = {}
    if tickers_no_cash:
        prices_raw = await fetch_full_data(
            tickers=tickers_no_cash,
            period=effective_period,
            interval=effective_interval,
        )

    price_df = clean_prices_df(prices_raw).copy()  # may be wide; index must be tz-aware UTC

    # ==== NORMALIZE BEFORE ANY LOGGING/SLICE ====
    if not price_df.empty:
        if price_df.index.tz is None:
            price_df.index = price_df.index.tz_localize("UTC")
        else:
            price_df.index = price_df.index.tz_convert("UTC")
        price_df = price_df[~price_df.index.duplicated(keep="last")].sort_index()

    # ---- Coverage print (pre-slice) ----
    pre_min = None if price_df.empty else str(price_df.index.min())
    pre_max = None if price_df.empty else str(price_df.index.max())
    unique_ny_days = (
        0 if price_df.empty
        else pd.Index(price_df.index.tz_convert(NY).date).nunique()
    )
    print({
        "effective": (effective_period, effective_interval),
        "pre_slice_min": pre_min,
        "pre_slice_max": pre_max,
        "pre_slice_unique_days_ny": unique_ny_days,
        "pre_slice_rows": int(len(price_df)),
    })

    # ---- Apply time window slice (CRITICAL) ----
    win_start_utc, win_end_utc = compute_window(granularity, now_utc=now_utc)

    # ---- Clamp window start to inception (first order), with daily edge fix ----
    earliest_orders = orders["timestamp"].min() if not orders.empty else None
    if earliest_orders is not None:
        # Ensure tz-aware UTC
        eo_utc = (earliest_orders.tz_convert("UTC")
                if getattr(earliest_orders, "tzinfo", None)
                else pd.Timestamp(earliest_orders, tz="UTC"))

        daily_like = effective_interval in {"1d", "1wk", "1mo"}

        if eo_utc > win_start_utc:
            if daily_like:
                eo_day = eo_utc.normalize()  # midnight UTC of that day (yfinance daily bar)
                # If our start is before that day, start AT that day.
                win_start_utc = max(win_start_utc, eo_day)

                # If we’re starting ON the same day as the first order,
                # bump to the next day so positions exist at first bar.
                if win_start_utc == eo_day:
                    win_start_utc = eo_day + pd.Timedelta(days=1)
            else:
                # Intraday: can start exactly at the first order timestamp
                win_start_utc = max(win_start_utc, eo_utc)



    # For ALL, widen to earliest data or order
    # ---- ALL: start at inception (first order), else earliest price ----
    if granularity.upper() == "ALL":
        earliest_prices = price_df.index.min() if not price_df.empty else None

        if not orders.empty:
            # eo_utc already computed above (tz-aware UTC)
            if effective_interval in {"1d", "1wk", "1mo"}:
                eo_day = eo_utc.normalize()
                # start the day AFTER the first order so positions exist at the first bar
                win_start_utc = eo_day + pd.Timedelta(days=1)

                # optional: if you prefer to align to the next available timestamp in the data:
                # if not price_df.empty:
                #     next_idx = price_df.index[price_df.index > eo_day]
                #     if len(next_idx) > 0:
                #         win_start_utc = next_idx[0]
            else:
                # intraday can start exactly at the first order timestamp
                win_start_utc = eo_utc
        elif earliest_prices is not None:
            win_start_utc = (earliest_prices.tz_convert("UTC")
                            if getattr(earliest_prices, "tzinfo", None)
                            else pd.Timestamp(earliest_prices, tz="UTC"))
    # else keep computed window


    if granularity.upper() == "1D" and not price_df.empty:
        last_day_ny = price_df.index.tz_convert(NY).date.max()
        today_ny = now_utc.tz_convert(NY).date()
        if last_day_ny != today_ny:
            s_ny = pd.Timestamp(last_day_ny, tz=NY) + pd.Timedelta(hours=9, minutes=30)
            e_ny = pd.Timestamp(last_day_ny, tz=NY) + pd.Timedelta(hours=16) - pd.Timedelta(minutes=1)
            win_start_utc, win_end_utc = s_ny.tz_convert("UTC"), e_ny.tz_convert("UTC")

    # ---- Authoritative slice ----
    if not price_df.empty:
        price_df = price_df.loc[(price_df.index >= win_start_utc) & (price_df.index <= win_end_utc)]

        # (Optional) FFILL per ticker for a wide MultiIndex to avoid NaNs at the first bar
        try:
            if isinstance(price_df.columns, pd.MultiIndex):
                # forward-fill within each ticker group
                price_df = (price_df.sort_index()
                            .groupby(level=0, axis=1, sort=False)
                            .apply(lambda g: g.ffill()))
            else:
                price_df = price_df.ffill()
            price_df = price_df.dropna(how="all")
        except Exception:
            # keep going even if ffill grouping isn't needed
            pass

    _logger.info({"window": (str(win_start_utc), str(win_end_utc)),
                  "rows_after_window": len(price_df)})

    # ---- Compute performance ----
    return {
        "performance": portfolio.get_performance(
            orders_df=orders,     # full history (do NOT window orders)
            prices_df=price_df,   # normalized, clamped, sliced
        ),
    }


