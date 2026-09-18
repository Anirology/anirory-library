from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field, field_validator
from typing import Literal


class StrictPayload(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


class Identity(StrictPayload):
    email: str = Field(min_length=3, max_length=255)

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value):
        value = value.strip().lower()
        if value.count("@") != 1 or any(c.isspace() for c in value) or not all(value.split("@")):
            raise ValueError("Enter a valid email address")
        return value


class Login(Identity):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=False)
    password: str = Field(min_length=1, max_length=128)


class UserCreate(Identity):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=False)
    name: str = Field(min_length=2, max_length=255)
    password: str = Field(min_length=12, max_length=128)
    role: Literal["admin", "librarian", "user"] = "user"

    @field_validator("name")
    @classmethod
    def trim_name(cls, value):
        value = value.strip()
        if len(value) < 2:
            raise ValueError("Name must contain at least two non-whitespace characters")
        return value


class UserRead(Identity):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    role: str
    active: bool


class UserUpdate(StrictPayload):
    role: Literal["admin", "librarian", "user"] | None = None
    active: bool | None = None


class PasswordChange(BaseModel):
    model_config = ConfigDict(extra="forbid")
    current_password: str = Field(min_length=1, max_length=128)
    new_password: str = Field(min_length=12, max_length=128)


class MemberCreate(Identity):
    name: str = Field(min_length=2, max_length=255)
    type: Literal["Adult", "Student", "Researcher", "Senior"] = "Adult"
    active: bool = True


class MemberRead(MemberCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int
    loans: int = 0
    standing: str = "Good"


class LoanCreate(StrictPayload):
    book_id: int = Field(gt=0)
    member_id: int = Field(gt=0)
    due_date: date


class LoanRead(BaseModel):
    id: int
    book_id: int
    member_id: int
    book: str
    member: str
    due_date: date
    issued_at: datetime
    returned_at: datetime | None
    status: str


class BookFields(StrictPayload):
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


class BookUpdate(StrictPayload):
    title: str | None = Field(default=None, min_length=2, max_length=255)
    author: str | None = Field(default=None, min_length=2, max_length=255)
    price: Decimal | None = Field(default=None, gt=0, max_digits=10, decimal_places=2)
    category: str | None = Field(default=None, min_length=2, max_length=100)
    available: bool | None = None

    @field_validator("title", "author", "price", "category", "available")
    @classmethod
    def reject_null(cls, value):
        if value is None:
            raise ValueError("Field cannot be null")
        return value

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
