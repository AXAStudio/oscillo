"""
Database models
"""

from abc import ABC, abstractmethod


class DBSchema:
    """
    Database Schema
    """
    def __init__(self):
        self.USERS = "users"
        self.PORTFOLIOS = "portfolios"
        self.ORDERS = "orders"
        self.POSITIONS = "positions"


class BaseModel(ABC):
    """
    Base Data Model
    """
    @abstractmethod
    def verify(self) -> 'BaseModel':
        """
        Verify the model's data integrity
        """
        raise NotImplementedError("Subclasses must implement verify method")

    @property
    def raw(self):
        """
        Dict of attribute name: attribute 

        Only includes non-null public attributes
        """
        return {
            k: v for k, v in self.__dict__.items() if (
                k[0] != '_'
                and v is not None
            )
        }
