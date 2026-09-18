from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import Boolean, CheckConstraint, DateTime, Index, Numeric, String, ForeignKey, Date, func, true
from sqlalchemy.orm import Mapped, mapped_column

from .database import Base
from .timeutils import utcnow


class Book(Base):
    __tablename__ = "books"
    __table_args__ = (
        CheckConstraint("price > 0", name="ck_books_price_positive"),
        Index("ix_books_category_price", "category", "price"),
        Index("ix_books_title", "title"),
        Index("ix_books_author", "author"),
        Index("ix_books_available", "available"),
        Index("uq_books_seed_identity", "title", "author", unique=True),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    author: Mapped[str] = mapped_column(String(255), nullable=False)
    price: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    category: Mapped[str] = mapped_column(String(100), nullable=False)
    available: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, server_default=true())
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now(), onupdate=func.now()
    )


class User(Base):
    __tablename__ = "users"
    __table_args__ = (CheckConstraint("role IN ('admin', 'librarian', 'user')", name="ck_user_role"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(20), nullable=False, default="user")
    active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)


class AuthSession(Base):
    __tablename__ = "auth_sessions"
    token_hash: Mapped[str] = mapped_column(String(64), primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, index=True)


class LoginAttempt(Base):
    __tablename__ = "login_attempts"
    key: Mapped[str] = mapped_column(String(64), primary_key=True)
    failures: Mapped[int] = mapped_column(nullable=False, default=0)
    started_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)


class Member(Base):
    __tablename__ = "members"
    __table_args__ = (CheckConstraint("type IN ('Adult', 'Student', 'Researcher', 'Senior')", name="ck_member_type"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    type: Mapped[str] = mapped_column(String(20), nullable=False, default="Adult")
    active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)


class Loan(Base):
    __tablename__ = "loans"
    __table_args__ = (CheckConstraint(
        "(returned_at IS NULL AND active_book_id IS NOT NULL AND active_book_id = book_id) OR "
        "(returned_at IS NOT NULL AND active_book_id IS NULL)", name="ck_loan_active_book"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    book_id: Mapped[int] = mapped_column(ForeignKey("books.id"), index=True)
    active_book_id: Mapped[int | None] = mapped_column(unique=True)
    member_id: Mapped[int] = mapped_column(ForeignKey("members.id"), index=True)
    issued_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=utcnow)
    due_date: Mapped[date] = mapped_column(Date, nullable=False)
    returned_at: Mapped[datetime | None] = mapped_column(DateTime)
