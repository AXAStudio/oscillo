"""
Orders-Related Endpoints - Adding, updating, and deleting orders

orders/ - get / post orders for an authenticated user
orders/{order_id} - delete
"""

from fastapi import APIRouter, Request, HTTPException
from app.dependencies.auth import get_current_user_id
from app.services.orders import create_order


router = APIRouter(prefix="/orders", tags=["Orders"])


@router.post("")
async def add_order(
    request: Request,
    portfolio_id: str,
    symbol: str,
    quantity: float,
    price: float
):
    """
    Create a new order (buy or sell) for a given portfolio.
    """
    try:
        get_current_user_id(request)

        new_order = create_order(portfolio_id, symbol, quantity, price)
        return {
            "status": "success",
            "order": new_order
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))