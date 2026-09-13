import math
from decimal import Decimal
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import asc, desc, func, or_, select
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Book
from ..schemas import BookCreate, BookRead, BookReplace, BookUpdate, PaginatedBooks

router = APIRouter(prefix="/books", tags=["books"])


def _get_book_or_404(book_id: int, db: Session):
    book = db.get(Book, book_id)
    if book is None:
        raise HTTPException(status_code=404, detail="Book not found")
    return book


def _commit(db: Session, message="Unable to save the book"):
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=409, detail="A book with this title and author already exists") from exc
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail=message) from exc


@router.get("", response_model=PaginatedBooks)
def list_books(
    category: str | None = None,
    max_price: Decimal | None = Query(default=None, gt=0),
    available: bool | None = None,
    search: str | None = Query(default=None, max_length=255),
    sort: Literal["title", "newest", "price", "author"] = "newest",
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=24, ge=1, le=100),
    db: Session = Depends(get_db),
):
    filters = []
    if category:
        filters.append(Book.category == category)
    if max_price is not None:
        filters.append(Book.price <= max_price)
    if available is not None:
        filters.append(Book.available == available)
    if search and search.strip():
        term = f"%{search.strip()}%"
        id_filter = Book.id == int(search) if search.strip().isdigit() else False
        filters.append(or_(Book.title.ilike(term), Book.author.ilike(term), Book.category.ilike(term), id_filter))

    order_by = {
        "title": asc(Book.title),
        "newest": desc(Book.created_at),
        "price": asc(Book.price),
        "author": asc(Book.author),
    }[sort]

    try:
        total = db.scalar(select(func.count(Book.id)).where(*filters)) or 0
        items = db.scalars(
            select(Book).where(*filters).order_by(order_by, Book.id).offset((page - 1) * page_size).limit(page_size)
        ).all()
    except SQLAlchemyError as exc:
        raise HTTPException(status_code=503, detail="The catalog database is temporarily unavailable") from exc

    return PaginatedBooks(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        pages=math.ceil(total / page_size) if total else 0,
    )


@router.get("/{book_id}", response_model=BookRead)
def get_book(book_id: int, db: Session = Depends(get_db)):
    return _get_book_or_404(book_id, db)


@router.post("", response_model=BookRead, status_code=status.HTTP_201_CREATED)
def create_book(payload: BookCreate, db: Session = Depends(get_db)):
    book = Book(**payload.model_dump())
    db.add(book)
    _commit(db)
    db.refresh(book)
    return book


@router.put("/{book_id}", response_model=BookRead)
def replace_book(book_id: int, payload: BookReplace, db: Session = Depends(get_db)):
    book = _get_book_or_404(book_id, db)
    for key, value in payload.model_dump().items():
        setattr(book, key, value)
    _commit(db)
    db.refresh(book)
    return book


@router.patch("/{book_id}", response_model=BookRead)
def update_book(book_id: int, payload: BookUpdate, db: Session = Depends(get_db)):
    book = _get_book_or_404(book_id, db)
    changes = payload.model_dump(exclude_unset=True)
    if not changes:
        raise HTTPException(status_code=422, detail="At least one field is required")
    for key, value in changes.items():
        setattr(book, key, value)
    _commit(db)
    db.refresh(book)
    return book


@router.delete("/{book_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_book(book_id: int, db: Session = Depends(get_db)):
    book = _get_book_or_404(book_id, db)
    db.delete(book)
    _commit(db, "Unable to delete the book")
    return Response(status_code=status.HTTP_204_NO_CONTENT)

