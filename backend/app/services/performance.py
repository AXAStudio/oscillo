"""
Performance Service
"""

import uuid

import pandas as pd
from typing import Dict, Tuple
from supabase import create_client
from datetime import datetime, timezone

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


async def get_portfolio_data(
    user_id: str,
    portfolio_id: str,
    granularity: str = "ALL"
):
    """
    Fetch orders and prices using an effective (period, interval) that’s valid for Yahoo,
    and return consistent metadata that reflects what was actually fetched.
    """
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

    # ---- Orders ----
    # Swap this to your real fetch when ready:
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

    price_df = clean_prices_df(prices_raw).copy()

    _logger.info(len(price_df))

    _logger.info({"start_dt": start_dt, "rows": len(price_df)})

    return {
        "performance": portfolio.get_performance(orders, price_df),
    }


