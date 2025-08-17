"""
Positions Model
"""

from typing import Dict, Any, List

from .base import BaseModel

from app.models import Order


class Positions(BaseModel):
    """
    Positions model
    """
    def __init__(
            self,
            positions: Dict[str, Any]
        ):
        self.positions = positions

    @property
    def cash(self) -> str:
        """
        Cash value
        """
        return self.quantity_of(Order.CASH_TICKER)

    @property
    def tickers(self) -> List[str]:
        """
        All tickers within positions (not including CA$H)
        """
        tickers = list(self.positions.keys())
        tickers.remove(Order.CASH_TICKER)
        return tickers

    @property
    def raw(self) -> Dict[str, Any]:
        return self.positions

    def quantity_of(self, ticker: str) -> int:
        """
        Get quantity of a ticker

        Raises an error if ticker not in positions
        """
        try:
            out = self.positions[ticker]["quantity"]
        except:
            raise ValueError("Ticker not in positions")
        return out
    
    def value_of(self, ticker: str, price: float) -> float:
        """
        Given a ticker, returns value given a price

        Raises an error if ticker not in positions
        """
        return self.quantity_of(ticker) * price

    def verify(self) -> 'Positions':
        """
        Verify Positions: returns self for chaining
        """
        return self