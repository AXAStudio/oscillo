"""
Portfolios Service
"""

import uuid

from datetime import datetime
from supabase import create_client

from app.configs import config
from app.models import Portfolio, Order
from app.utils.logger import setup_logger
from app.services.pf_agg import get_portfolio_history
from app.services.positions import get_portfolio_positions
from app.services.market_data import fetch_recent_quotes


_logger = setup_logger()


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


async def get_portfolio_data(
        user_id: str, 
        portfolio_id: str
    ):
    """
    Fetch all portfolios for a given user, including their tickers.
    """
    portfolio_res = (
        supabase.table(config.DB_SCHEMA.PORTFOLIOS)
        .select("*")
        .eq("user_id", user_id)
        .eq("id", portfolio_id)
        .execute()
    )

    if not portfolio_res.data[0]:
        raise ValueError('Portfolio not found')

    out = Portfolio(**portfolio_res.data[0]).raw
    positions = get_portfolio_positions(portfolio_id=portfolio_id)

    lean_positions = {}
    lean_positions[Order.CASH_TICKER] = dict(
        quantity=positions[Order.CASH_TICKER]['quantity'],
        value=positions[Order.CASH_TICKER]['quantity']
    )

    positions.pop('CA$H')
    prices = await fetch_recent_quotes(
        ','.join(positions.keys())
    )

    total_value = lean_positions[Order.CASH_TICKER]['value']
    for ticker, position_data in positions.items():
        position_value = position_data['quantity'] * prices[ticker]
        lean_positions[ticker] = dict(
            quantity=position_data['quantity'],
            value=position_value
        )
        total_value += position_value

    out.update(
        dict(present_value=total_value, positions=lean_positions)
    )

    return out


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
