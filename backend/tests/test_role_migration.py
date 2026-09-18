import unittest

from sqlalchemy import create_engine, inspect

from app.migrations import migrate_user_role


class RoleMigrationTests(unittest.TestCase):
    def test_legacy_accounts_and_sessions_survive_repeated_upgrade(self):
        engine = create_engine("sqlite://")
        with engine.begin() as connection:
            connection.exec_driver_sql("PRAGMA foreign_keys=ON")
            connection.exec_driver_sql("CREATE TABLE users (id INTEGER PRIMARY KEY, email VARCHAR(255) UNIQUE NOT NULL, name VARCHAR(255) NOT NULL, password_hash VARCHAR(255) NOT NULL, role VARCHAR(20) NOT NULL, active BOOLEAN NOT NULL, CONSTRAINT ck_user_role CHECK (role IN ('admin', 'librarian', 'viewer')))")
            connection.exec_driver_sql("CREATE TABLE auth_sessions (token_hash TEXT PRIMARY KEY, user_id INTEGER REFERENCES users(id) ON DELETE CASCADE)")
            connection.exec_driver_sql("INSERT INTO users VALUES (7, 'legacy@example.com', 'Legacy User', 'existing-hash', 'viewer', 1)")
            connection.exec_driver_sql("INSERT INTO auth_sessions VALUES ('existing-token', 7)")
        migrate_user_role(engine)
        migrate_user_role(engine)
        with engine.connect() as connection:
            self.assertEqual(connection.exec_driver_sql("SELECT id, role, password_hash FROM users").one(), (7, "user", "existing-hash"))
            self.assertEqual(connection.exec_driver_sql("SELECT user_id FROM auth_sessions").scalar(), 7)
            self.assertEqual(connection.exec_driver_sql("PRAGMA foreign_keys").scalar(), 1)
            self.assertEqual(connection.exec_driver_sql("PRAGMA foreign_key_check").all(), [])
            self.assertNotIn("viewer", inspect(connection).get_check_constraints("users")[0]["sqltext"])
        engine.dispose()
