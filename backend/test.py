from app.models import Portfolio
from app.services.portfolios import get_portfolio_data


TEST_PORTFOLIO = Portfolio(
    user_id="user_12345",
    portfolio_id="portfolio_67890",
    name="Test Portfolio",
    created_at="2023-01-01T00:00:00Z",
    updated_at="2023-01-02T00:00:00Z"
)



get_portfolio_data(
    user_id="user_12345",
    portfolio_id="portfolio_67890",
    get_value_history=True,
    get_ticker_value_history=True,
    interval='1d'
)
