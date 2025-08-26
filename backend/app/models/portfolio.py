"""
Portfolio Model
"""

import numpy as np
import pandas as pd
from datetime import datetime

from .order import Order
from .base import BaseModel

from app.utils.timeseries import compute_portfolio_timeseries

class Portfolio(BaseModel):
    """
    Portfolio model
    """
    def __init__(
            self,
            id: str = None,
            user_id: str = None,
            name: str = None,
            created_at: str = None,
            last_updated: str = None
        ):
        self.id = id
        self.user_id = user_id
        self.name = name
        self.created_at = created_at
        self.last_updated = last_updated

    def verify(self) -> 'Portfolio':
        """
        Verify Portfolio: returns self for chaining
        """
        if not self.name:  # accounts for empty strings
            self.name = "Unnamed Portfolio"
        
        return self

    def get_performance(
        self,
        orders_df: pd.DataFrame,
        prices_df: pd.DataFrame,
    ) -> dict[str, list]:
        return compute_portfolio_timeseries(prices_df, orders_df, cash_ticker=Order.CASH_TICKER, include_weights=True, compute_simple_returns=True)
