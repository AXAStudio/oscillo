"""
Portfolio Model
"""

from .base import BaseModel


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
            last_updated: str = None,
            cash: int = None
        ):
        self.id = id
        self.user_id = user_id
        self.name = name
        self.created_at = created_at
        self.last_updated = last_updated
        self.cash = cash

    def verify(self) -> 'Portfolio':
        """
        Verify Portfolio: returns self for chaining
        """
        if not self.name:  # accounts for empty strings
            self.name = "Unnamed Portfolio"
        
        return self
