"""
Portfolios Service
"""

import uuid

from datetime import datetime
from supabase import create_client

from app.configs import config
from app.models import Portfolio
from app.services.pf_agg import get_portfolio_history


supabase = create_client(
    config.SUPABASE_URL,
    config.SUPABASE_SERVICE_KEY
)


def get_all_portfolios(user_id: str):
    """
    Fetch all portfolios for a given user, including their tickers.
    """
    # Step 1: Get all portfolios for the user
    portfolios_res = supabase.table(
        config.DB_SCHEMA.PORTFOLIOS
    ).select("*").eq("user_id", user_id).execute()

    portfolios = portfolios_res.data

    if not portfolios:
        return []

    return portfolios


def get_portfolio_data(
        user_id: str, 
        portfolio_id: str, 
        get_value_history: bool, 
        get_ticker_value_history: bool,
        interval: str = '1d'
    ):
    """
    Fetch all portfolios for a given user, including their tickers.
    """
    portfolio_res = (
        supabase.table(config.DB_SCHEMA.PORTFOLIOS)
        .select("*")
        .eq("user_id", user_id)
        .eq("portfolio_id", portfolio_id)
        .execute()
    )

    portfolio = portfolio_res.data

    if not portfolio:
        raise ValueError("Portfolio not found")

    if get_value_history:
        portfolio["value_history"] = get_portfolio_history(
            portfolio_id,
            portfolio["created_at"],
            get_ticker_value_history,
            interval
        )

    return portfolio
    


def create_portfolio(user_id: str, name: str):
    """
    Insert a new portfolio into the portfolios table with initial capital.
    """
    portfolio_id = str(uuid.uuid4())
    now = datetime.now().isoformat()

    new_portfolio = Portfolio(
        id=portfolio_id,
        user_id=user_id,
        name=name,
        last_updated=now
    ).verify()

    res = supabase.table("portfolios").insert(
        new_portfolio.raw
    ).execute()

    if not res.data:
        raise Exception(f"Failed to create portfolio: {res}")

    return res.data[0]


def delete_portfolio(user_id: str, portfolio_id: str):
    """
    Delete a portfolio for the given user and portfolio_id.
    Also removes all associated tickers/orders.
    """
    # First delete any related tickers/orders
    supabase.table(config.DB_SCHEMA.ORDERS) \
        .delete() \
        .eq("portfolio_id", portfolio_id) \
        .execute()

    # Then delete the portfolio itself (scoped by user_id for safety)
    res = supabase.table(config.DB_SCHEMA.PORTFOLIOS) \
        .delete() \
        .eq("id", portfolio_id) \
        .eq("user_id", user_id) \
        .execute()

    if not res.data:
        raise Exception(f"Portfolio {portfolio_id} not found or could not be deleted")

    return {"message": f"Portfolio {portfolio_id} deleted successfully"}


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