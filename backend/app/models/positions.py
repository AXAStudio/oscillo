"""
Positions Model
"""

from typing import Dict, Any

from .base import BaseModel


class Positions(BaseModel):
    """
    Positions model
    """
    def __init__(
            self,
            positions: Dict[str, Any]
        ):
        self.positions = positions

    def verify(self) -> 'Positions':
        """
        Verify Portfolio: returns self for chaining
        """
        if not self.name:  # accounts for empty strings
            self.name = "Unnamed Portfolio"
        
        return self