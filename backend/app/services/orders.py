"""
Orders Service - searching, adding, updating, and deleting order records
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


def get_all_orders(portfolio_id: str):
    """
    Fetch Orders for a given portfolio
    """
    tickers_res = supabase.table(
        config.DB_SCHEMA.ORDERS
    ).select("*").eq(
        "portfolio_id", portfolio_id
    ).execute()
    
    return tickers_res.data
