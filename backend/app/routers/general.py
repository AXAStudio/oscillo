"""
General router
"""

from fastapi import APIRouter, Request, Response


router = APIRouter(
    prefix="/market",
    tags=["Market Data"],
    responses={404: {"description": "Not found"}}
)


# OPTIONS catch-all for this router
@router.options("/{rest_of_path:path}")
async def options_preflight(rest_of_path: str, request: Request):
    """
    Handles CORS preflight requests for all routes in this router.
    """
    return Response(status_code=200)
