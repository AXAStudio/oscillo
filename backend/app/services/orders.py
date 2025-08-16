"""
Orders Service - searching, adding, updating, and deleting order records
"""

from datetime import datetime
from supabase import create_client

from app.models import Order
from app.configs import config
from app.models.types import OrderType
from app.utils.logger import setup_logger
from .positions import get_portfolio_positions


_logger = setup_logger()


supabase = create_client(
    config.SUPABASE_URL,
    config.SUPABASE_SERVICE_KEY
)


def create_order(portfolio_id: str, ticker: str, quantity: int, price: float):
    """
    Create order record
    """
    now = datetime.now().isoformat()

    _logger.info("Verifying order...")

    new_order = Order(
        portfolio_id=portfolio_id,
        ticker=ticker,
        quantity=quantity,
        price=price,
        timestamp=now
    ).verify(
        positions=get_portfolio_positions(portfolio_id)
    )

    _logger.info("Inserting order record...")

    res = supabase.table(
        config.DB_SCHEMA.ORDERS
    ).insert(new_order.raw).execute()

    _logger.info(f"Updating positions for portfolio {portfolio_id}")

    # updating ticker by quantity
    supabase.rpc(
        "increment_quantity",
        {
            "p_portfolio_id": portfolio_id,
            "p_ticker": new_order.ticker.upper(),
            "p_quantity": new_order.quantity,
        }
    ).execute()

    # updating cash if it wasn't a cash transaction
    if not new_order.is_cash_transaction:
        cash_adjustment = new_order.quantity * new_order.price

        if new_order.type == OrderType.BUY:
            cash_adjustment *= -1

        supabase.rpc(
            "increment_quantity",
            {
                "p_portfolio_id": portfolio_id,
                "p_ticker": Order.CASH_TICKER,
                "p_quantity": cash_adjustment,
            }
        ).execute()

    return res.data[0]


def get_all_tickers(portfolio_id: str):
    """
    Get any ticker that has ever appeared in a given portfolio
    """
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
