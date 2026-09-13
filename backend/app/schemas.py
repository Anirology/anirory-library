from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field, field_validator


class BookFields(BaseModel):
    title: str = Field(min_length=2, max_length=255)
    author: str = Field(min_length=2, max_length=255)
    price: Decimal = Field(gt=0, max_digits=10, decimal_places=2)
    category: str = Field(min_length=2, max_length=100)
    available: bool = True

    @field_validator("title", "author", "category")
    @classmethod
    def trim_text(cls, value):
        value = value.strip()
        if len(value) < 2:
            raise ValueError("must contain at least two non-whitespace characters")
        return value


class BookCreate(BookFields):
    pass


class BookReplace(BookFields):
    pass


class BookUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=2, max_length=255)
    author: str | None = Field(default=None, min_length=2, max_length=255)
    price: Decimal | None = Field(default=None, gt=0, max_digits=10, decimal_places=2)
    category: str | None = Field(default=None, min_length=2, max_length=100)
    available: bool | None = None

    @field_validator("title", "author", "category")
    @classmethod
    def trim_optional_text(cls, value):
        if value is None:
            return value
        value = value.strip()
        if len(value) < 2:
            raise ValueError("must contain at least two non-whitespace characters")
        return value


class BookRead(BookFields):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime


class PaginatedBooks(BaseModel):
    items: list[BookRead]
    total: int
    page: int
    page_size: int
    pages: int

