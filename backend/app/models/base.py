"""
Database models
"""

from abc import ABC, abstractmethod


class BaseModel(ABC):
    """
    Base Data Model
    """
    @abstractmethod
    def verify(self, *args) -> 'BaseModel':
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

    def __str__(self):
        return f"{self.__class__.__name__}({', '.join([
            f'{attr}={val}' for attr, val in self.raw.items()
        ])})"
