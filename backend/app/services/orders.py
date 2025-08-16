"""
Orders Service - adding, updating, and deleting order records
"""

from datetime import datetime
from supabase import create_client

from app.core import BaseOrder
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
