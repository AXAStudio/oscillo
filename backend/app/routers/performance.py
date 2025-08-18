"""
Portfolio related endpoints.

performance/{portfolio_id}?period=1D|1W|1M|YTD|1Y|ALL
"""

from typing import Optional
from pydantic import BaseModel
from fastapi import APIRouter, Request, HTTPException, Body

from app.utils.logger import setup_logger
from app.utils.auth import get_current_user_id

from app.services.performance import get_portfolio_data


router = APIRouter(prefix="/performance", tags=["Portfolios", "Performance"])
_logger = setup_logger()


@router.get("/{portfolio_id}")
async def get_portfolio(
    request: Request, 
    portfolio_id: str,
    interval : str = '1d',
    period: str = 'ALL'
):
    try:
        user_id = get_current_user_id(request)

        return get_portfolio_data(
            user_id=user_id,
            portfolio_id=portfolio_id,
            interval=interval,
            retreival_period=period
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException as e:
        raise HTTPException(status_code=500, detail=str(e))
