from fastapi import FastAPI
from app.routers import market_data

app = FastAPI()

# Include routes
app.include_router(market_data.router)
