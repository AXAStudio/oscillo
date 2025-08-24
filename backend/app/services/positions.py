"""
Positions Management Service
"""

from typing import Dict, Any
from supabase import create_client

from app.configs import config
from app.models import Positions
from app.utils.logger import setup_logger

_logger = setup_logger()

supabase = create_client(
    config.SUPABASE_URL,
    config.SUPABASE_SERVICE_KEY
)


def get_portfolio_positions(portfolio_id: str) -> Dict[str, Any]:
    """
    Returns: { "<TICKER>": { ...all row fields incl. portfolio_id } }
    """
    res = supabase.table(config.DB_SCHEMA.POSITIONS)\
        .select("ticker, portfolio_id, name, sector, quantity, created_at, updated_at")\
        .eq("portfolio_id", portfolio_id)\
        .execute()

    items = res.data or []

    _logger.info({row["ticker"]: row for row in items if row.get("ticker")})

    return {row["ticker"]: row for row in items if row.get("ticker")}
