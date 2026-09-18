"""Create the initial administrator locally; no public bootstrap endpoint."""
import getpass
from sqlalchemy import select
from app.auth import hash_password
from app.database import SessionLocal, initialize_schema
from app.models import User
from app.schemas import UserCreate


def main():
    email = input("Administrator email: ").strip()
    name = input("Administrator name: ").strip()
    password = getpass.getpass("Password (at least 12 characters): ")
    if password != getpass.getpass("Confirm password: "):
        raise SystemExit("Passwords do not match")
    payload = UserCreate(email=email, name=name, password=password, role="admin")
    initialize_schema()
    with SessionLocal() as db:
        if db.scalar(select(User).where(User.email == payload.email)):
            raise SystemExit("This email already exists; no changes made")
        db.add(User(email=payload.email, name=payload.name, role="admin", password_hash=hash_password(payload.password)))
        db.commit()
    print("Administrator created.")


if __name__ == "__main__":
    main()
