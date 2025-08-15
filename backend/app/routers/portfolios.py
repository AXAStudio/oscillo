"""
Portfolio related endpoints.

portfolios/ - get / post portfolios for an authenticated user
portfolios/{portfolio_id} - delete
portfolios/{portfolio_id}/orders - get / post
"""

from fastapi import APIRouter, Request, HTTPException
from app.dependencies.auth import get_current_user_id
from app.services.portfolios_service import get_all_portfolios, create_portfolio, delete_portfolio


router = APIRouter(prefix="/portfolios", tags=["Portfolios"])


@router.get("")
async def list_portfolios(request: Request):
    user_id = get_current_user_id(request)
    return get_all_portfolios(user_id)


@router.post("")
async def add_portfolio(request: Request, payload: dict):
    """
    Create a new portfolio for the authenticated user.
    Request body should include: name, initial_investment, capital.
    """
    user_id = get_current_user_id(request)

    name = payload.get("name")
    initial_investment = payload.get("initial_investment")

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
