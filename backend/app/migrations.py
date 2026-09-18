"""Upgrade the original viewer role without losing accounts or sessions."""
from sqlalchemy import MetaData, inspect
from sqlalchemy.schema import CreateTable


def migrate_user_role(engine):
    checks = inspect(engine).get_check_constraints("users")
    if not any("viewer" in check["sqltext"] for check in checks):
        return
    if engine.dialect.name == "sqlite":
        from .models import User
        replacement = User.__table__.to_metadata(MetaData(), name="users_role_migration")
        with engine.connect() as connection:
            connection.exec_driver_sql("PRAGMA foreign_keys=OFF")
            connection.commit()
            try:
                # Explicit BEGIN makes SQLite DDL part of the rollback boundary.
                connection.exec_driver_sql("BEGIN IMMEDIATE")
                connection.execute(CreateTable(replacement))
                connection.exec_driver_sql(
                    "INSERT INTO users_role_migration (id, email, name, password_hash, role, active) "
                    "SELECT id, email, name, password_hash, "
                    "CASE WHEN role = 'viewer' THEN 'user' ELSE role END, active FROM users"
                )
                connection.exec_driver_sql("DROP TABLE users")
                connection.exec_driver_sql("ALTER TABLE users_role_migration RENAME TO users")
                if connection.exec_driver_sql("PRAGMA foreign_key_check").fetchall():
                    raise RuntimeError("Role migration failed foreign key validation")
                connection.commit()
            except Exception:
                connection.rollback()
                raise
            finally:
                connection.exec_driver_sql("PRAGMA foreign_keys=ON")
                connection.commit()
    else:
        with engine.begin() as connection:
            # MySQL DDL commits implicitly: the transitional constraint permits
            # both names, so interrupted upgrades remain safe to retry.
            keyword = "CHECK" if engine.dialect.name == "mysql" else "CONSTRAINT"
            connection.exec_driver_sql(f"ALTER TABLE users DROP {keyword} ck_user_role")
            connection.exec_driver_sql("ALTER TABLE users ADD CONSTRAINT ck_user_role CHECK (role IN ('admin', 'librarian', 'viewer', 'user'))")
            connection.exec_driver_sql("UPDATE users SET role = 'user' WHERE role = 'viewer'")
            connection.exec_driver_sql(f"ALTER TABLE users DROP {keyword} ck_user_role")
            connection.exec_driver_sql("ALTER TABLE users ADD CONSTRAINT ck_user_role CHECK (role IN ('admin', 'librarian', 'user'))")
