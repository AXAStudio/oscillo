import logging

from fastapi import FastAPI

from app.routers import market_data
from app.routers import portfolios


TITLE = "Oscillo Backend API"
SEM_VER = "1.0"
DESCRIPTION = "Developer API for Oscillo, a portfolio tracking & paper trading platform."


def build_app():
    app = FastAPI()

    api = FastAPI(
        title=TITLE,
        version=SEM_VER,
        description=DESCRIPTION,
    )

    # Include routes
    api.include_router(market_data.router)
    api.include_router(portfolios.router)

    app.mount(f"/api/{SEM_VER}/", api)

    return app
