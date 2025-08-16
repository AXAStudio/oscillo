"""
Orders Service - adding, updating, and deleting order records
"""
from datetime import datetime
from supabase import create_client

import pandas as pd

from app.models import BaseOrder
from app.configs import config


supabase = create_client(
    config.SUPABASE_URL,
    config.SUPABASE_SERVICE_KEY
)


def create_order(portfolio_id: str, ticker: str, quantity: int, price: float):
    now = datetime.now().isoformat()

    new_order = BaseOrder(
        portfolio_id=portfolio_id,
        ticker=ticker.upper(),
        quantity=quantity,
        price=price,
        created_at=now
    ).verify()

    res = supabase.table(
        config.DB_SCHEMA.ORDERS
    ).insert(new_order.raw).execute()

    supabase.rpc(
        "increment_quantity",
        {
            "p_portfolio_id": portfolio_id,
            "p_ticker": ticker.upper(),
            "p_quantity": quantity,
        }
    ).execute()

    return res.data[0]

def get_all_tickers(portfolio_id: str):
    orders_res = (
        supabase.table(config.DB_SCHEMA.ORDERS)
        .select("ticker", distinct=True)
        .eq("portfolio_id", portfolio_id)
        .execute()
    )   

    unique_tickers = [row["ticker"] for row in orders_res.data]

    return unique_tickers

from datetime import datetime
from zoneinfo import ZoneInfo  # Python 3.9+

def parse_timestamptz(ts: str, to_tz: str | None = None, naive: bool = False) -> datetime:
    """
    Parse an ISO 8601 timestamptz like '2025-08-15T22:42:45.581734+00:00'
    into a datetime. Returns timezone-aware by default.

    Args:
        ts: timestamp string
        to_tz: optional IANA tz name to convert to (e.g., 'America/New_York')
        naive: if True, drop tzinfo before returning

    """
    # Handle both '+00:00' and 'Z'
    dt = datetime.fromisoformat(ts.replace('Z', '+00:00'))
    if to_tz:
        dt = dt.astimezone(ZoneInfo(to_tz))
    if naive:
        dt = dt.replace(tzinfo=None)
    return dt
