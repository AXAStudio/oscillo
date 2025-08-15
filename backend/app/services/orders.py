"""
Orders Service - adding, updating, and deleting order records
"""

from supabase import create_client
from app.configs import configs
from datetime import datetime

supabase = create_client(
    config.SUPABASE_URL,
    config.SUPABASE_SERVICE_KEY
)

def create_order(portfolio_id: str, symbol: str, quantity: float, price: float):
    now = datetime.now().isoformat()

    res = supabase.table(config.DB_SCHEMA.ORDERS).insert({
        "portfolio_id": portfolio_id,
        "symbol": symbol.upper(),
        "quantity": quantity,
        "price": price,
        "timestamp": now,
    }).execute()

    res = supabase.table(config.DB_SCHEMA.ORDERS).insert({
        "portfolio_id": portfolio_id,
        "symbol": symbol.upper(),
        "quantity": quantity,
        "price": price,
        "timestamp": now,
    }).execute()

    return res.data[0]
