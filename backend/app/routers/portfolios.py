"""
Portfolio related endpoints.

portfolios/ - get / post portfolios for an authenticated user
portfolios/{portfolio_id} - delete
portfolios/{portfolio_id}/orders - get / post
"""

from pydantic import BaseModel
from fastapi import APIRouter, Request, HTTPException, Body

from app.services.orders import create_order
from app.utils.auth import get_current_user_id
from app.services.portfolios import (
    get_all_portfolios,
    create_portfolio,
    delete_portfolio,
    get_all_orders
)
from app.services.positions import get_all_positions


router = APIRouter(prefix="/portfolios", tags=["Portfolios"])


class OrderRequest(BaseModel):
    ticker: str
    quantity: int
    price: float


class PortfolioRequest(BaseModel):
    name: str
    initial_investment: float


@router.get("")
async def list_portfolios(request: Request):
    user_id = get_current_user_id(request)
    return get_all_portfolios(user_id)


@router.post("")
async def add_portfolio(request: Request, new_portfolio: PortfolioRequest = Body(...)):
    """
    Create a new portfolio for the authenticated user.
    Request body should include: name, initial_investment, capital.
    """
    user_id = get_current_user_id(request)

    name = new_portfolio.name
    initial_investment = new_portfolio.initial_investment

    if not name or initial_investment is None:
        raise HTTPException(
            status_code=400,
            detail="Missing required fields: name, initial_investment"
        )

    return create_portfolio(user_id, name, initial_investment)


@router.delete("/{portfolio_id}")
async def remove_portfolio(portfolio_id: str, request: Request):
    user_id = get_current_user_id(request)
    return delete_portfolio(user_id, portfolio_id)


@router.get("/{portfolio_id}/orders")
async def get_orders(
    request: Request,
    portfolio_id: str,
):
    try:
        get_current_user_id(request)

        pos = get_all_orders(portfolio_id)

        return {
            "status": "success",
            "orders": pos
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{portfolio_id}/orders")
async def add_order(
    request: Request,
    portfolio_id: str,
    order: OrderRequest = Body(...)
):
    """
    Create a new order (buy or sell) for a given portfolio.
    """
    try:
        get_current_user_id(request)

        new_order = create_order(
            portfolio_id,
            order.ticker,
            order.quantity,
            order.price
        )
        return {
            "status": "success",
            "order": new_order
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{portfolio_id}/positions")
async def get_positions(
    request: Request,
    portfolio_id: str,
):
    try:
        get_current_user_id(request)

        pos = get_all_positions(portfolio_id)

        return {
            "status": "success",
            "positions": pos
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
