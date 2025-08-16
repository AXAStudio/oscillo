"""
Core data objects
"""

from abc import ABC, abstractmethod

from .types import (
    OrderType,
    TradeType,
    TransferType
)


class Portfolio:
    """
    Portfolio Row Schema
    """
    def __init__(
            self,
            id: str = None,
            user_id: str = None,
            name: str = None,
            initial_investment: float = None,
            created_at: str = None,
            last_updated: str = None
        ):
        self.id = id
        self.user_id = user_id
        self.name = name
        self.initial_investment = initial_investment
        self.created_at = created_at
        self.last_updated = last_updated

    @property
    def raw(self):
        """
        Dict of attribute name: attribute
        """
        return self.__dict__


class BaseOrder:
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

    @property
    def raw(self):
        """
        Dict of attribute name: attribute
        """
        return {k: v for k, v in self.__dict__.items() if k[0] != '_'}


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

    @property
    def raw(self):
        """
        Dict of attribute name: attribute
        """
        return self.__dict__


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

    @property
    def raw(self):
        """
        Dict of attribute name: attribute
        """
        return self.__dict__

