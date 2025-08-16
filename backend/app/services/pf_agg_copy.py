def get_portfolio_time_series(
    portfolio_id: str,
    created_at: str,
    get_ticker_history: bool,
    interval: str = '1d'
) -> dict[str, list]:
    """
    Get the time series data for a portfolio. This function aggregates 
    the portfolio's performance over time, including ticker history if 
    requested. It does so by pulling orders from our database and
    iterating from inception to the current date, using yahoo finance
    historical prices to get a valuation at each time step.
    
    Args:
        portfolio_id (str): The ID of the portfolio.
        created_at (str): The creation date of the portfolio.
        get_ticker_history (bool): Whether to include ticker history.

    Returns:
        dict[str, list]: A dictionary containing time series data 
            per ticker. Cash is included as ticker CAPITAL, the 
            portfolio's total value is included as ticker 
            PORTFOLIO_AGG, and dates are included under TIMESTAMP
    """
    start_date = parse_timestamptz(created_at)

    time_series_data = {
        "TIMESTAMP": [start_date],
        "PORTFOLIO_AGG": [0],
        "CAPITAL": [0]
    }

    orders: pd.DataFrame = pd.DataFrame(
        get_all_orders(portfolio_id)
    )

    ticker_price_history = fetch_full_data(
        tickers=orders['ticker'].unique().tolist(),
        period=_get_nearest_yf_period(start_date, datetime.now()),
        interval=interval
    )

    ...

    return time_series_data
