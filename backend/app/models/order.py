"""
Order Models
"""

from .base import BaseModel
from .types import OrderType
from app.utils.logger import setup_logger
from app.utils.market import verify_ticker


_logger = setup_logger()


class Order(BaseModel):
    """
    Base Class for Orders
    """
    CASH_TICKER = 'CA$H'

    def __init__(
            self,
            portfolio_id: str,
            ticker: str,
            name: str,
            sector: str,
            quantity: int,
            price: float,
            id: str = None,
            timestamp: str = None
        ):
        self.id = id
        self.portfolio_id = portfolio_id
        self.ticker = ticker
        self.name = name
        self.sector = sector
        self.quantity = quantity
        self.price = price
        self.timestamp = timestamp

    @property
    def type(self) -> OrderType:
        """
        Determine the order type based on quantity.
        """
        return OrderType.BUY if self.quantity > 0 else OrderType.SELL

    @property
    def is_cash_transaction(self) -> bool:
        return self.ticker == self.CASH_TICKER

    def verify(
            self,
            positions: dict[str, int]
        ) -> 'Order':
        """
        Verify Order: returns self for chaining
        """
        if self.quantity == 0:
            raise ValueError("Order quantity cannot be 0")

        if self.is_cash_transaction and self.type == OrderType.BUY:
            # this is a deposit
            _logger.info(f"Verified deposit: {self}")
            return self

        if not self.is_cash_transaction and not verify_ticker(self.ticker):
            raise ValueError("Ticker not found")

        if self.type == OrderType.BUY:  # buy
            if self.price * self.quantity > positions[self.CASH_TICKER]['quantity']:
                raise ValueError("Portfolio does not have enough \
cash to make this trade / withdrawal")
        elif self.ticker is not None:  # sell
            if self.quantity > positions[self.ticker]['quantity']:
                raise ValueError("Portfolio does not have the inventory \
to make this trade")

        _logger.info(f"Verified order: {self}")

        return self
