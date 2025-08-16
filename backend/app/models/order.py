"""
Order Models
"""

from .db import BaseModel
from .types import (
    OrderType,
    TradeType,
    TransferType
)


class BaseOrder(BaseModel):
    """
    Base Class for Orders
    """
    def __init__(
            self,
            id: str = None,
            portfolio_id: str = None,
            ticker: str = None,
            quantity: int = None,
            price: float = None,
            created_at: str = None
        ):
        self.id = id
        self.portfolio_id = portfolio_id
        self.ticker = ticker
        self.quantity = quantity
        self.price = price
        self.created_at = created_at


class Trade(BaseOrder):
    """
    Order of Type Trade
    """
    @property
    def ORDER_TYPE(self) -> OrderType:
        """
        Return the type of order.
        """
        return OrderType.TRADE

    @property
    def type(self) -> TradeType:
        """
        Determine the order type based on quantity.
        """
        if self.quantity >= 0:
            return TradeType.BUY
        
        return TradeType.SELL


class Transfer(BaseOrder):
    """
    Order of Type Transfer
    """
    @property
    def ORDER_TYPE(self) -> OrderType:
        """
        Return the type of order.
        """
        return OrderType.TRANSFER

    @property
    def type(self) -> TransferType:
        """
        Determine the order type based on quantity.
        """
        if self.quantity >= 0:
            return TransferType.DEPOSIT
        
        return TransferType.WITHDRAWAL
