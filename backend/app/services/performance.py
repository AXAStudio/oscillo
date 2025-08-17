"""
Performance Service
"""

from supabase import create_client

from app.configs import config
from app.models import Portfolio
from app.utils.logger import setup_logger
from app.services.pf_agg import get_portfolio_history


_logger = setup_logger()


supabase = create_client(
    config.SUPABASE_URL,
    config.SUPABASE_SERVICE_KEY
)


async def get_portfolio_data(
        user_id: str, 
        portfolio_id: str,
        get_ticker_history: bool,
        interval: str = '1d',
        retreival_period: str = 'ALL'
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

    portfolio = Portfolio(**portfolio_res.data[0])

    if not portfolio:
        raise ValueError("Portfolio not found")

    performance_data = get_portfolio_history(
        portfolio_id=portfolio.id,
        created_at=portfolio.created_at,
        get_ticker_history=get_ticker_history,
        interval=interval # should also have a retrieval period
    )

    out = portfolio.raw
    out.update(dict(performance=performance_data))
    return out

