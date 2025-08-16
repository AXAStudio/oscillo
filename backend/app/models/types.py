"""
Core Types
"""

from enum import Enum


class OrderType(Enum):
    """
    Enum for Order Types
    """
    BUY = "buy"
    SELL = "sell"

    def __str__(self):
        return self.value
