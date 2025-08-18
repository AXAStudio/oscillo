from app.models import Portfolio
from app.services.market import fetch_full_data
from app.utils.performance import get_portfolio_history


TEST_PORTFOLIO = Portfolio(
    user_id="d62c7b0a-4af1-4520-9f35-ec7825d8c227",
    id="6821b1c8-6f21-42cc-bad3-0a1bf6a1cf86",
    created_at="2025-08-10T00:00:00Z",
)


async def test():
    test_agg = await get_portfolio_history(
        TEST_PORTFOLIO.id,
        TEST_PORTFOLIO.created_at,
        get_ticker_history=True,
        interval='1d',
        local_debug=True
    )

    with open('test.txt', 'a') as f:
        f.write('\n\n\n\nOUTPUT:')
        f.write(str(test_agg))

    import matplotlib.pyplot as plt
    plt.plot(test_agg['TIMESTAMP'], test_agg['pv:TOTAL'])
    plt.show()


async def test2():
    data = await fetch_full_data(
        tickers="AAPL,TSLA",
        period="1d",
        interval="1m"
    )

    for ticker, df in data.items():
        df.to_csv(f'{ticker}.csv')


if __name__ == "__main__":
    import asyncio
    asyncio.run(test())
