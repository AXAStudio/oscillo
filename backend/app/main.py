from fastapi import FastAPI

from app.routers import market_data
from app.routers import portfolios


def build_app():
    app = FastAPI(
        title="Oscillo Backend API"
    )

    # Include routes
    app.include_router(market_data.router)
    app.include_router(portfolios.router)

    return app
