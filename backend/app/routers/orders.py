"""
Orders related endpoints.

portfolios/{portfolio_id}/orders - get / post
"""

from pydantic import BaseModel
from fastapi import APIRouter, Request, HTTPException, Body

from app.utils.auth import get_current_user_id
from app.services.orders import create_order, get_all_orders


router = APIRouter(prefix="/portfolios", tags=["Orders", "Portfolios"])


class OrderRequest(BaseModel):
    ticker: str
    quantity: int
    price: float


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
        _logger.info("Verifying user...")
        get_current_user_id(request)

        _logger.info("Creating order...")
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