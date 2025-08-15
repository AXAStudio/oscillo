"""
Portfolios Service
"""
import uuid

from datetime import datetime
from supabase import create_client

from app.configs import config


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

    # Step 2: For each portfolio, fetch tickers and append them
    for portfolio in portfolios:
        tickers_res = supabase.table(
            config.DB_SCHEMA.ORDERS
        ).select("*").eq(
            "portfolio_id", portfolio["id"]
        ).execute()

        portfolio["order_history"] = tickers_res.data

    return portfolios


def create_portfolio(user_id: str, name: str, initial_investment: float):
    """
    Insert a new portfolio into the portfolios table with initial capital.
    """
    portfolio_id = str(uuid.uuid4())
    now = datetime.now().isoformat()

    res = supabase.table("portfolios").insert({
        "id": portfolio_id,
        "user_id": user_id,
        "name": name,
        "initial_investment": initial_investment,
        "created_at": now,
        "last_updated": now
    }).execute()

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


