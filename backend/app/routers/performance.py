"""
Portfolio related endpoints.

performance/{portfolio_id}?period=1D|1W|1M|YTD|1Y|ALL
"""

from typing import Optional
from pydantic import BaseModel
from fastapi import APIRouter, Request, HTTPException, Body, Query

from app.utils.logger import setup_logger
from app.utils.auth import get_current_user_id

from app.services.performance import get_portfolio_data
from app.utils.logger import setup_logger
from fastapi.responses import ORJSONResponse
from app.utils.serialize import serialize_performance_legacy

router = APIRouter(prefix="/performance", tags=["Portfolios", "Performance"])
_logger = setup_logger()

@router.get("/{portfolio_id}")
async def get_portfolio_performance(request: Request, portfolio_id: str, period: str):
    _logger.info(period)
    user_id = get_current_user_id(request)
    raw = await get_portfolio_data(user_id=user_id, portfolio_id=portfolio_id, granularity=period)
    legacy = serialize_performance_legacy(raw.get("performance", {}))

    payload = {
        "id": str(raw.get("id", portfolio_id)),
        "user_id": str(user_id),
        "name": raw.get("name", ""),
        "created_at": raw.get("start_dt", ""),
        "last_updated": raw.get("start_dt", ""),
        "performance": legacy,
    }
    return ORJSONResponse(payload)

