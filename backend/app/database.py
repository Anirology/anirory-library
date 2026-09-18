import os
from urllib.parse import quote_plus

from dotenv import load_dotenv
from sqlalchemy import create_engine, inspect, event
from sqlalchemy.orm import DeclarativeBase, sessionmaker

load_dotenv()


def _database_url():
    explicit_url = os.getenv("DATABASE_URL")
    if explicit_url:
        if explicit_url.startswith("postgres://"):
            explicit_url = "postgresql://" + explicit_url[len("postgres://"):]
        return explicit_url

    user = quote_plus(os.getenv("MYSQL_USER", "anirory"))
    password = quote_plus(os.getenv("MYSQL_PASSWORD", ""))
    host = os.getenv("MYSQL_HOST", "127.0.0.1")
    port = os.getenv("MYSQL_PORT", "3306")
    database = os.getenv("MYSQL_DATABASE", "anirory")
    return f"mysql+pymysql://{user}:{password}@{host}:{port}/{database}?charset=utf8mb4"


DATABASE_URL = _database_url()
engine_options = {"pool_pre_ping": True, "pool_recycle": 1800}
if DATABASE_URL.startswith("sqlite"):
    engine_options["connect_args"] = {"check_same_thread": False}

engine = create_engine(DATABASE_URL, **engine_options)
if engine.dialect.name == "sqlite":
    @event.listens_for(engine, "connect")
    def enable_foreign_keys(connection, _record):
        cursor = connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


class Base(DeclarativeBase):
    pass


def initialize_schema():
    # The supplied MySQL SQL schema uses an unsigned book ID; older ORM-created
    # databases use a signed ID. MySQL requires matching FK column signedness.
    from .models import Book, Loan
    if engine.dialect.name == "mysql":
        inspector = inspect(engine)
        if inspector.has_table("books"):
            book_id_type = next(column["type"] for column in inspector.get_columns("books") if column["name"] == "id")
            Book.__table__.c.id.type = book_id_type
            Loan.__table__.c.book_id.type = book_id_type.copy()
            Loan.__table__.c.active_book_id.type = book_id_type.copy()
    Base.metadata.create_all(bind=engine)
    from .migrations import migrate_user_role
    migrate_user_role(engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
