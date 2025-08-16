"""
Positions Management Service
"""

from supabase import create_client

from app.configs import config


supabase = create_client(
    config.SUPABASE_URL,
    config.SUPABASE_SERVICE_KEY
)

def get_all_positions(portfolio_id: str):
    tickers_res = supabase.table(config.DB_SCHEMA.POSITIONS).select("*").eq("portfolio_id", portfolio_id).execute()
    return tickers_res.data