from fastapi import FastAPI
from app.routers import market_data
from app.routers import portfolios
from app.routers import orders

app = FastAPI()

# Include routes
app.include_router(market_data.router)
app.include_router(portfolios.router)
app.include_router(orders.router)
