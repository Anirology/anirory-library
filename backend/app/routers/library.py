from datetime import date, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy import func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ..auth import current_user, staff
from ..database import get_db
from ..models import Book, Loan, Member
from ..schemas import LoanCreate, LoanRead, MemberCreate, MemberRead
from ..timeutils import utcnow

router = APIRouter(tags=["library"], dependencies=[Depends(current_user)])


def commit(db):
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(409, "The record conflicts with an existing record") from exc


def member_read(member, db, activity=None):
    if activity is None:
        activity = db.execute(select(func.count(Loan.id), func.min(Loan.due_date)).where(Loan.member_id == member.id, Loan.returned_at.is_(None))).one()
    loans, earliest_due = activity
    overdue = earliest_due is not None and earliest_due < date.today()
    result = MemberRead.model_validate(member)
    result.loans = loans
    result.standing = "Inactive" if not member.active else "Review" if overdue else "Good"
    return result


@router.get("/members", response_model=list[MemberRead], dependencies=[Depends(staff)])
def members(search: str = Query("", max_length=255), type: str | None = None, page: int = Query(1, ge=1), page_size: int = Query(100, ge=1, le=100), db: Session = Depends(get_db)):
    query = select(Member).order_by(Member.id)
    if search:
        query = query.where(or_(Member.name.ilike(f"%{search}%"), Member.email.ilike(f"%{search}%")))
    if type:
        query = query.where(Member.type == type)
    items = db.scalars(query.offset((page - 1) * page_size).limit(page_size)).all()
    activity = {member_id: (count, due) for member_id, count, due in db.execute(
        select(Loan.member_id, func.count(Loan.id), func.min(Loan.due_date))
        .where(Loan.member_id.in_([m.id for m in items]), Loan.returned_at.is_(None)).group_by(Loan.member_id))}
    return [member_read(m, db, activity.get(m.id, (0, None))) for m in items]


@router.post("/members", response_model=MemberRead, status_code=201, dependencies=[Depends(staff)])
def create_member(payload: MemberCreate, db: Session = Depends(get_db)):
    member = Member(**payload.model_dump())
    db.add(member)
    commit(db)
    return member_read(member, db)


@router.get("/members/{member_id}", response_model=MemberRead, dependencies=[Depends(staff)])
def get_member(member_id: int, db: Session = Depends(get_db)):
    member = db.get(Member, member_id)
    if not member:
        raise HTTPException(404, "Member not found")
    return member_read(member, db)


@router.put("/members/{member_id}", response_model=MemberRead, dependencies=[Depends(staff)])
def replace_member(member_id: int, payload: MemberCreate, db: Session = Depends(get_db)):
    member = db.scalar(select(Member).where(Member.id == member_id).with_for_update())
    if not member:
        raise HTTPException(404, "Member not found")
    for key, value in payload.model_dump().items():
        setattr(member, key, value)
    commit(db)
    return member_read(member, db)


@router.delete("/members/{member_id}", status_code=204, dependencies=[Depends(staff)])
def delete_member(member_id: int, db: Session = Depends(get_db)):
    member = db.scalar(select(Member).where(Member.id == member_id).with_for_update())
    if not member:
        raise HTTPException(404, "Member not found")
    if db.scalar(select(Loan.id).where(Loan.member_id == member_id).limit(1)):
        raise HTTPException(409, "Members with loan history must be deactivated instead")
    db.delete(member)
    commit(db)
    return Response(status_code=204)


def loan_read(loan, db, book=None, member=None):
    return LoanRead(id=loan.id, book_id=loan.book_id, member_id=loan.member_id,
        book=book or db.get(Book, loan.book_id).title, member=member or db.get(Member, loan.member_id).name,
        due_date=loan.due_date, issued_at=loan.issued_at, returned_at=loan.returned_at,
        status="Returned" if loan.returned_at else "Overdue" if loan.due_date < date.today() else "Active")


@router.get("/loans", response_model=list[LoanRead], dependencies=[Depends(staff)])
def loans(active: bool = True, page: int = Query(1, ge=1), page_size: int = Query(100, ge=1, le=100), db: Session = Depends(get_db)):
    query = select(Loan, Book.title, Member.name).join(Book, Loan.book_id == Book.id).join(Member, Loan.member_id == Member.id).order_by(Loan.due_date, Loan.id)
    if active:
        query = query.where(Loan.returned_at.is_(None))
    return [loan_read(loan, db, book, member) for loan, book, member in db.execute(query.offset((page - 1) * page_size).limit(page_size))]


@router.post("/loans", response_model=LoanRead, status_code=201, dependencies=[Depends(staff)])
def issue_loan(payload: LoanCreate, db: Session = Depends(get_db)):
    if payload.due_date < date.today():
        raise HTTPException(422, "Due date cannot be in the past")
    book = db.scalar(select(Book).where(Book.id == payload.book_id).with_for_update())
    member = db.scalar(select(Member).where(Member.id == payload.member_id).with_for_update())
    if not book or not member:
        raise HTTPException(404, "Book or member not found")
    if not book.available or not member.active:
        raise HTTPException(409, "Book unavailable or member inactive")
    if db.scalar(select(Loan.id).where(Loan.book_id == book.id, Loan.returned_at.is_(None)).limit(1)):
        raise HTTPException(409, "Book already has an active loan")
    book.available = False
    loan = Loan(**payload.model_dump(), active_book_id=book.id)
    db.add(loan)
    commit(db)
    return loan_read(loan, db)


@router.post("/loans/{loan_id}/return", response_model=LoanRead, dependencies=[Depends(staff)])
def return_loan(loan_id: int, db: Session = Depends(get_db)):
    loan = db.get(Loan, loan_id)
    if not loan:
        raise HTTPException(404, "Loan not found")
    book = db.scalar(select(Book).where(Book.id == loan.book_id).with_for_update())
    db.refresh(loan)
    if loan.returned_at:
        raise HTTPException(409, "Loan already returned")
    loan.returned_at = utcnow()
    loan.active_book_id = None
    book.available = True
    commit(db)
    return loan_read(loan, db)


@router.get("/dashboard")
def dashboard(db: Session = Depends(get_db)):
    today = date.today()
    active = Loan.returned_at.is_(None)
    count = lambda model, *filters: db.scalar(select(func.count()).select_from(model).where(*filters)) or 0
    days = [today - timedelta(days=offset) for offset in range(6, -1, -1)]
    return {"books": count(Book), "members": count(Member), "active_loans": count(Loan, active),
        "overdue": count(Loan, active, Loan.due_date < today),
        "due_this_week": count(Loan, active, Loan.due_date >= today, Loan.due_date <= today + timedelta(days=7)),
        "returns_today": count(Loan, Loan.returned_at >= datetime.combine(today, datetime.min.time())),
        "activity": [{"day": day.isoformat(), "count": count(Loan, Loan.issued_at >= datetime.combine(day, datetime.min.time()), Loan.issued_at < datetime.combine(day + timedelta(days=1), datetime.min.time()))} for day in days]}
