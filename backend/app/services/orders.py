"""
Orders Service - adding, updating, and deleting order records
"""
from datetime import datetime
from supabase import create_client

from app.configs import config


supabase = create_client(
    config.SUPABASE_URL,
    config.SUPABASE_SERVICE_KEY
)

def create_order(portfolio_id: str, symbol: str, quantity: int, price: float):
    now = datetime.now().isoformat()

    res = supabase.table(config.DB_SCHEMA.ORDERS).insert({
        "portfolio_id": portfolio_id,
        "symbol": symbol.upper(),
        "quantity": quantity,
        "price": price,
        "timestamp": now,
    }).execute()

    supabase.rpc(
        "increment_quantity",
        {
            "p_portfolio_id": portfolio_id,
            "p_ticker": symbol.upper(),
            "p_quantity": quantity,
        }
    ).execute()

    return res.data[0]
