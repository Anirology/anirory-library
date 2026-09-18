import hashlib
import secrets
from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy import delete, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ..auth import admin, bearer, current_user, hash_password, token_digest, verify_password
from ..database import get_db
from ..models import AuthSession, LoginAttempt, User
from ..schemas import Login, PasswordChange, UserCreate, UserRead, UserUpdate
from ..timeutils import utcnow

router = APIRouter(tags=["authentication"])
# Equal-cost verification prevents disclosing whether an email is registered.
dummy_hash = hash_password(secrets.token_urlsafe(32))


@router.post("/auth/login")
def login(payload: Login, response: Response, db: Session = Depends(get_db)):
    now = utcnow()
    key = hashlib.sha256(payload.email.encode()).hexdigest()
    attempt = db.get(LoginAttempt, key)
    if attempt and now - attempt.started_at < timedelta(minutes=15) and attempt.failures >= 5:
        raise HTTPException(429, "Too many attempts. Try again in 15 minutes.", headers={"Retry-After": "900"})
    user = db.scalar(select(User).where(User.email == payload.email))
    valid = verify_password(payload.password, user.password_hash if user else dummy_hash)
    if not valid or not user or not user.active:
        if attempt is None:
            attempt = LoginAttempt(key=key, failures=0, started_at=now)
            db.add(attempt)
        if now - attempt.started_at >= timedelta(minutes=15):
            attempt.failures = 0
            attempt.started_at = now
        attempt.failures += 1
        db.commit()
        raise HTTPException(401, "Invalid email or password", headers={"WWW-Authenticate": "Bearer"})
    if attempt:
        db.delete(attempt)
    db.execute(delete(AuthSession).where(AuthSession.expires_at <= now))
    token = secrets.token_urlsafe(48)
    expires = now + timedelta(hours=8)
    db.add(AuthSession(token_hash=token_digest(token), user_id=user.id, expires_at=expires))
    db.commit()
    response.headers["Cache-Control"] = "no-store"
    return {"access_token": token, "token_type": "bearer", "expires_at": expires, "user": UserRead.model_validate(user)}


@router.get("/auth/me", response_model=UserRead)
def me(user: User = Depends(current_user)):
    return user


@router.post("/auth/logout", status_code=204)
def logout(user: User = Depends(current_user), credentials=Depends(bearer), db: Session = Depends(get_db)):
    db.execute(delete(AuthSession).where(AuthSession.token_hash == token_digest(credentials.credentials)))
    db.commit()
    return Response(status_code=204)


@router.post("/auth/password", status_code=204)
def change_password(payload: PasswordChange, user: User = Depends(current_user), db: Session = Depends(get_db)):
    if not verify_password(payload.current_password, user.password_hash):
        raise HTTPException(400, "Current password is incorrect")
    user.password_hash = hash_password(payload.new_password)
    db.execute(delete(AuthSession).where(AuthSession.user_id == user.id))
    db.commit()
    return Response(status_code=204)


@router.get("/users", response_model=list[UserRead], dependencies=[Depends(admin)])
def users(db: Session = Depends(get_db)):
    return db.scalars(select(User).order_by(User.id)).all()


@router.post("/users", response_model=UserRead, status_code=201, dependencies=[Depends(admin)])
def create_user(payload: UserCreate, db: Session = Depends(get_db)):
    user = User(email=payload.email, name=payload.name, role=payload.role, password_hash=hash_password(payload.password))
    db.add(user)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(409, "Email address already exists") from exc
    db.refresh(user)
    return user


@router.patch("/users/{user_id}", response_model=UserRead)
def update_user(user_id: int, payload: UserUpdate, actor: User = Depends(admin), db: Session = Depends(get_db)):
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(404, "User not found")
    changes = payload.model_dump(exclude_unset=True)
    if not changes or any(value is None for value in changes.values()):
        raise HTTPException(422, "Provide non-null fields")
    if actor.id == user_id and (changes.get("active") is False or changes.get("role", "admin") != "admin"):
        raise HTTPException(409, "You cannot remove your own administrator access")
    for key, value in changes.items():
        setattr(user, key, value)
    db.execute(delete(AuthSession).where(AuthSession.user_id == user_id))
    db.commit()
    return user
