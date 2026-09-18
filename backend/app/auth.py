"""Revocable bearer sessions. Only token digests are stored in the database."""
import hashlib
import hmac
import secrets

from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from .database import get_db
from .models import AuthSession, User
from .timeutils import utcnow

bearer = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    digest = hashlib.scrypt(password.encode(), salt=bytes.fromhex(salt), n=16384, r=8, p=1).hex()
    return f"scrypt${salt}${digest}"


def verify_password(password: str, stored: str) -> bool:
    _, salt, expected = stored.split("$")
    actual = hashlib.scrypt(password.encode(), salt=bytes.fromhex(salt), n=16384, r=8, p=1).hex()
    return hmac.compare_digest(actual, expected)


def token_digest(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def current_user(credentials: HTTPAuthorizationCredentials | None = Depends(bearer), db: Session = Depends(get_db)):
    unauthorized = HTTPException(401, "Please sign in", headers={"WWW-Authenticate": "Bearer"})
    if credentials is None:
        raise unauthorized
    session = db.get(AuthSession, token_digest(credentials.credentials))
    if session is None or session.expires_at <= utcnow():
        raise unauthorized
    user = db.get(User, session.user_id)
    if user is None or not user.active:
        raise unauthorized
    return user


def staff(user: User = Depends(current_user)):
    if user.role not in ("admin", "librarian"):
        raise HTTPException(403, "Staff access required")
    return user


def admin(user: User = Depends(current_user)):
    if user.role != "admin":
        raise HTTPException(403, "Administrator access required")
    return user
