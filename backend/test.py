from app.models import Portfolio
from app.services.market_data import fetch_full_data
from app.services.portfolios import get_portfolio_data


TEST_PORTFOLIO = Portfolio(
    user_id="d62c7b0a-4af1-4520-9f35-ec7825d8c227",
    id="6821b1c8-6f21-42cc-bad3-0a1bf6a1cf86",
)


async def test():
    test_agg = await get_portfolio_data(
        user_id=TEST_PORTFOLIO.user_id,
        portfolio_id=TEST_PORTFOLIO.id,
        get_value_history=True,
        get_ticker_value_history=True,
        interval='1m'
    )

    print("******** PORTFOLIO AGGREGATION *********")
    print(test_agg)


async def test2():
    data = await fetch_full_data(
        tickers="AAPL,MSFT,GOOGL",
        period="1d",
        interval="1m"
    )

    print(data)


if __name__ == "__main__":
    import asyncio
    asyncio.run(test())
