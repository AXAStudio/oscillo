import json
import asyncio
from fastapi import APIRouter, HTTPException
import app.services.market_data as market_data


router = APIRouter(
    prefix="/market-data",
    tags=["Market Data"],
    responses={404: {"description": "Not found"}}
)


@router.get("/prices")
async def get_recent_prices(
    tickers: str, 
    period: str = "1d",
    interval: str = "1m",
    timeout: int = 10
):
    """
    Fetch most recent price data for one or more tickers.
    """
    # Validate query params early
    if period not in ["1d", "5d", "1mo", "3mo", "6mo", "1y", "2y", "5y", "10y", "ytd", "max"]:
        raise HTTPException(status_code=400, detail="Invalid period specified.")

    if interval not in ["1m", "2m", "5m", "15m", "30m", "60m", "90m", "1d", "5d", "1wk", "1mo", "3mo"]:
        raise HTTPException(status_code=400, detail="Invalid interval specified.")

    if timeout <= 0 or timeout > 240:
        raise HTTPException(status_code=400, detail="Timeout must be between 1 and 240 seconds.")


    ticker_list = tickers.strip().upper().split(",")

    try:
        results = await asyncio.gather(*[
            market_data.fetch_last_single(
                t, period, interval, timeout
            ) for t in ticker_list
        ])

        # Map ticker -> result
        return {ticker: data for ticker, data in zip(ticker_list, results)} 

    except asyncio.TimeoutError:
        raise HTTPException(status_code=504, detail="Request timed out while fetching market data.")
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/historical")
async def get_price_history(
    tickers: str, 
    period: str = "1d",
    interval: str = "1m",
    timeout: int = 10
):
    """
    Fetch historical price data for one or more tickers.
    """
    # Validate query params early
    if period not in ["1d", "5d", "1mo", "3mo", "6mo", "1y", "2y", "5y", "10y", "ytd", "max"]:
        raise HTTPException(status_code=400, detail="Invalid period specified.")

    if interval not in ["1m", "2m", "5m", "15m", "30m", "60m", "90m", "1d", "5d", "1wk", "1mo", "3mo"]:
        raise HTTPException(status_code=400, detail="Invalid interval specified.")

    if timeout <= 0 or timeout > 240:
        raise HTTPException(status_code=400, detail="Timeout must be between 1 and 240 seconds.")

    try:
        ticker_dfs = await market_data.fetch_full_data(
            tickers,
            period=period,
            interval=interval,
            timeout=timeout
        )

        return {
            ticker: df.to_json(orient='index', date_format='iso')
            for ticker, df in ticker_dfs.items()
        }

    except asyncio.TimeoutError:
        raise HTTPException(status_code=504, detail="Request timed out while fetching market data.")
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
