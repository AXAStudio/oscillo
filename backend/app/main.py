import os
import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import orders
from app.routers import market
from app.routers import portfolios
from app.routers import performance


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

    origins = [
        os.getenv("FRONTEND_URL", "http://localhost:8080"),
    ]

    api.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Include routes
    api.include_router(market.router)
    api.include_router(portfolios.router)
    api.include_router(orders.router)
    api.include_router(performance.router)

    app.mount(f"/api/{SEM_VER}/", api)

    return app
