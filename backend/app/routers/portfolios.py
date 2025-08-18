"""
Portfolio related endpoints.

portfolios/ - get / post portfolios for an authenticated user
portfolios/{portfolio_id} - delete
portfolios/{portfolio_id}/orders - get / post
"""

from typing import Optional
from pydantic import BaseModel
from fastapi import APIRouter, Request, HTTPException, Body

from app.utils.logger import setup_logger
from app.utils.auth import get_current_user_id
from app.services.positions import get_portfolio_positions
from app.services.portfolios import (
    get_all_portfolios,
    create_portfolio,
    delete_portfolio,
    get_portfolio_data
)


router = APIRouter(prefix="/portfolios", tags=["Portfolios"])
_logger = setup_logger()


class OrderRequest(BaseModel):
    ticker: str
    quantity: int
    price: float


class PortfolioRequest(BaseModel):
    name: str


@router.get("")
async def list_portfolios(request: Request):
    try:
        user_id = get_current_user_id(request)
        return get_all_portfolios(user_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{portfolio_id}")
async def get_portfolio(
    request: Request, 
    portfolio_id: str
):
    try:
        user_id = get_current_user_id(request)
        return await get_portfolio_data(user_id, portfolio_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("")
async def add_portfolio(request: Request, new_portfolio: PortfolioRequest = Body(...)):
    """
    Create a new portfolio for the authenticated user.
    Request body should include: name, initial_investment, capital.
    """
    try:
        user_id = get_current_user_id(request)

        name = new_portfolio.name

        if not name:
            raise HTTPException(
                status_code=400,
                detail="Missing required fields: name, initial_investment"
            )

        return create_portfolio(user_id, name)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{portfolio_id}")
async def remove_portfolio(portfolio_id: str, request: Request):
    try:
        user_id = get_current_user_id(request)
        return delete_portfolio(user_id, portfolio_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{portfolio_id}/positions")
async def get_positions(
    request: Request,
    portfolio_id: str,
):
    try:
        get_current_user_id(request)

        pos = get_portfolio_positions(portfolio_id)

        return {
            "status": "success",
            "positions": pos
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
