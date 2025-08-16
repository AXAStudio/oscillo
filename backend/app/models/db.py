"""
Database models
"""

class DBSchema:
    """
    Database Schema
    """
    def __init__(self):
        self.USERS = "users"
        self.PORTFOLIOS = "portfolios"
        self.ORDERS = "orders"
        self.POSITIONS = "positions"


class BaseModel:
    """
    Base Data Model
    """

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
