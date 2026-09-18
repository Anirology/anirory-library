"""Explicitly create local demo logins; never run automatically on startup."""
import secrets

from sqlalchemy import select

from app.auth import hash_password
from app.database import SessionLocal, initialize_schema
from app.models import User


def create_demo_users():
    initialize_schema()
    created = []
    with SessionLocal() as db:
        for role in ("user", "librarian", "admin"):
            email = f"{role}@anirory.example"
            if db.scalar(select(User).where(User.email == email)):
                print(f"Skipped existing account: {email} (unchanged)")
                continue
            password = secrets.token_urlsafe(15)
            db.add(User(email=email, name=f"Demo {role.title()}", role=role,
                        password_hash=hash_password(password)))
            created.append((role, email, password))
        db.commit()
    for role, email, password in created:
        print(f"{role.title()} | {email} | {password}")
    return created


if __name__ == "__main__":
    create_demo_users()
