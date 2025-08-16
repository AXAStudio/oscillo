"""
Core Types
"""

from enum import Enum


class OrderType(Enum):
    """
    Enum for Order Types
    """
    TRADE = "trade"
    TRANSFER = "transfer"

    def __str__(self):
        return self.value


class TradeType(OrderType):
    """
    Enum for Trade Types
    """
    BUY = "buy"
    SELL = "sell"

    def __str__(self):
        return self.value


class TransferType(OrderType):
    """
    Enum for Transfer Types
    """
    WITHDRAWAL = "withdrawal"
    DEPOSIT = "deposit"

    def __str__(self):
        return self.value
