"""
Portfolio Model
"""

from .db import BaseModel


class Portfolio(BaseModel):
    """
    Portfolio model
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

    def verify(self) -> 'Portfolio':
        """
        Verify Portfolio: returns self for chaining
        """
        if not self.name:  # accounts for empty strings
            self.name = "Unnamed Portfolio"

        if self.initial_investment < 0:
            raise ValueError("Initial investment cannot be negative")
        
        return self
