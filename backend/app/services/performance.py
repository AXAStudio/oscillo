"""
Performance Service
"""

import pandas as pd
from typing import Dict
from supabase import create_client
from datetime import datetime, timezone

from app.configs import config
from app.models import Order, Portfolio
from app.utils.logger import setup_logger
from app.services.orders import get_all_orders
from app.services.market import fetch_full_data
from app.utils.timestamps import parse_timestamptz
from app.utils.performance import (
    clean_orders_df,
    clean_prices_df,
    nearest_yf_period
)


_logger = setup_logger()


supabase = create_client(
    config.SUPABASE_URL,
    config.SUPABASE_SERVICE_KEY
)


async def get_portfolio_data(
        user_id: str, 
        portfolio_id: str,
        interval: str = '1d',  # TODO
        retreival_period: str = 'ALL'  # TODO
    ):
    """
    Get the time series data for a portfolio. This function aggregates
    the portfolio's performance over time, including ticker history if
    requested. It does so by pulling orders from our database and
    iterating from inception to the current date, using Yahoo Finance
    historical prices to get a valuation at each time step.
    Args:
        portfolio_id (str): The ID of the portfolio.
        created_at (str): The creation date of the portfolio.
        get_ticker_history (bool): Whether to include ticker history.
        interval (str): The time interval for historical data.
        local_debug (bool): If True, runs in local debug mode.
    Returns:
        dict[str, list]: A dictionary containing time series data
            per ticker. Cash is included as ticker CA$H, the
            values are included under pv:<ticker> (or TOTAL),
            deltas are under dv:<ticker> (or TOTAL), and dates 
            are included under TIMESTAMP.
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

    # ------------------- TIMESTAMP -------------------
    start_dt = parse_timestamptz(portfolio.created_at)
    tzinfo = start_dt.tzinfo or timezone.utc
    now_ts = pd.Timestamp.now(tz=tzinfo)

    # --------------------- ORDERS ---------------------
    from data import ORDERS as raw_orders
    # raw_orders = get_all_orders(portfolio_id)
    orders = clean_orders_df(raw_orders).copy()

    # --------------------- PRICES ---------------------
    tickers = sorted(orders["ticker"].dropna().unique().tolist())
    tickers_no_cash = [t for t in tickers if t != Order.CASH_TICKER]

    prices_raw: Dict[str, pd.DataFrame] = {}
    if tickers_no_cash:
        prices_raw = await fetch_full_data(
            tickers=tickers_no_cash,
            period=nearest_yf_period(start_dt, datetime.now(timezone.utc)),
            interval=interval
        )

    price_df = clean_prices_df(prices_raw).copy()

    out = portfolio.raw
    out.update(dict(
        performance = portfolio.get_performance(
            start_date=start_dt,
            orders_df=orders,
            prices_df=price_df
        ) # TODO: interval, should also have a retrieval periodfolio_history)
    ))
    return out

