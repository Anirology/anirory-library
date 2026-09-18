# Login and permissions

The three roles are `user`, `librarian`, and `admin`.

| Action | User | Librarian | Admin |
| --- | --- | --- | --- |
| Browse books and library summary | Yes | Yes | Yes |
| Change own password and sign out | Yes | Yes | Yes |
| Create, update, delete books | No | Yes | Yes |
| View and manage members and circulation | No | Yes | Yes |
| Create accounts, change roles, activate/deactivate accounts | No | No | Yes |

Sign in through the frontend (normally http://localhost:5173). The local frontend
uses http://localhost:8000. Sign out from the profile button before switching
accounts. Each account sees controls appropriate to its role; the API separately
enforces all permissions. Admin account management is under Settings.

Run `python create_demo_users.py` against the intended database to explicitly
create one demo account per role. It prints unique generated passwords once and
does not overwrite existing accounts. Demo emails are `user@anirory.example`,
`librarian@anirory.example`, and `admin@anirory.example`. Passwords are stored only
as salted scrypt hashes. Demo accounts are never created automatically at startup.
Use Settings to change their passwords or deactivate them when finished.

Existing `viewer` accounts migrate to `user` at backend startup, preserving IDs,
passwords, and sessions. Restart an already running backend after updating.

API authentication uses `POST /auth/login` with email and password, then
`Authorization: Bearer <access_token>`. Sessions expire after eight hours.
Logout revokes the current session. Password, role, and activation changes revoke
the affected account's sessions. Five failed attempts for an email temporarily
block login for fifteen minutes. Only admins can create accounts; there is no
public role selection or signup endpoint. Unauthenticated requests receive 401;
requests with insufficient permissions receive 403.

Verification: `python -m unittest discover -s tests -v` uses an isolated SQLite
database. MySQL/PostgreSQL migration and concurrent operation behavior require
separate integration validation before deployment to those databases.
