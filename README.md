# Anirory Library Management System

Anirory is a library administration app built with React/Vite and FastAPI. Accounts, sessions, books, members and loans are persisted through SQLAlchemy in MySQL or PostgreSQL. The frontend has no fallback catalog, member directory or loan queue.

## Prerequisites

- Node.js 20 or newer and npm
- Python 3.11 or 3.12 (the pinned backend dependencies are tested on 3.12)
- MySQL 8.0 or newer

## 1. Create the MySQL database and account

Open a MySQL administrator shell and run:

```sql
CREATE USER IF NOT EXISTS 'anirory'@'localhost' IDENTIFIED BY 'choose-a-strong-password';
GRANT ALL PRIVILEGES ON anirory.* TO 'anirory'@'localhost';
FLUSH PRIVILEGES;
```

Then create the schema from the project root:

```bash
mysql -u root -p < backend/schema.sql
```

`schema.sql` creates the `anirory` database, the `books` table, its positive-price constraint, its stable title/author seed identity, and all requested indexes.

## 2. Configure and run the backend

```bash
cd backend
python -m venv .venv
```

Activate it on Windows:

```powershell
.venv\Scripts\Activate.ps1
```

Or on macOS/Linux:

```bash
source .venv/bin/activate
```

Install dependencies and create the local environment file:

```bash
pip install -r requirements.txt
cp .env.example .env
```

On Windows PowerShell, use `Copy-Item .env.example .env`. Edit `.env` and set `MYSQL_PASSWORD` to the account password created above. Credentials are never stored in application source.

Seed the catalog and start FastAPI:

```bash
python seed.py
python create_admin.py
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The deterministic seed adds exactly 350 starter records, including the five required titles. Re-running it is safe: the script checks stable title/author identities and inserts only missing seed records.

API documentation is available at [http://localhost:8000/docs](http://localhost:8000/docs), and the health endpoint is at [http://localhost:8000/health](http://localhost:8000/health).

`create_admin.py` prompts for the first administrator's email, name and password (at least 12 characters). It never supplies a default password or overwrites an account. Sign in with that account in the frontend; use Settings to create other accounts and manage their roles. For a hosted database, run this command locally with the hosted `DATABASE_URL` configured in your backend environment.

Startup creates missing tables without changing existing tables or records. Catalog seeding is explicit with `python seed.py`; alternatively set `SEED_CATALOG=true` to seed during startup. Leave it false to avoid restoring deliberately deleted starter titles. Schema changes to existing tables require a database migration; `create_all` does not migrate them.

## 3. Configure and run the frontend

In a second terminal:

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

On Windows PowerShell, use `Copy-Item .env.example .env`. The default setting is:

```dotenv
VITE_API_BASE_URL=http://localhost:8000
```

Open [http://localhost:5173](http://localhost:5173). To verify a production bundle:

```bash
npm run build
npm run preview
```

## Book API

All library endpoints require `Authorization: Bearer <access_token>`. `/auth/login` and `/health` are public. A viewer can read library records, librarians can manage books/members/loans, and administrators can also manage staff accounts. Missing/expired sessions return 401; insufficient permissions return 403.

| Method | Route | Purpose |
| --- | --- | --- |
| GET | `/books` | Paginated catalog search and filtering |
| GET | `/books/{book_id}` | Complete record by ID |
| POST | `/books` | Create a record |
| PUT | `/books/{book_id}` | Replace a record |
| PATCH | `/books/{book_id}` | Update selected fields |
| DELETE | `/books/{book_id}` | Delete a record; returns 204 |

`GET /books` accepts `category`, `max_price`, `available`, `search`, `sort`, `page`, and `page_size`. `sort` accepts `title`, `newest`, `price`, or `author`.

## Accounts, members and circulation

| Method | Route | Purpose |
| --- | --- | --- |
| POST | `/auth/login` | Sign in with JSON `email` and `password`; returns an eight-hour bearer token and user |
| GET | `/auth/me` | Current account; never exposes password hashes |
| POST | `/auth/logout` | Revoke the current session |
| POST | `/auth/password` | Change password using `current_password` and `new_password`; revoke all account sessions |
| GET / POST | `/users` | Administrator-only account directory and creation |
| PATCH | `/users/{id}` | Administrator-only role or activation changes; revoke affected sessions |
| GET / POST | `/members` | Member directory and registration |
| GET / PUT / DELETE | `/members/{id}` | Read, replace or delete a member |
| GET / POST | `/loans` | Loan queue and checkout using `book_id`, `member_id`, `due_date` |
| POST | `/loans/{id}/return` | Record a return and restore book availability |
| GET | `/dashboard` | Database counts and seven days of checkout activity |

Members and loans accept `page` and `page_size` (maximum 100); `/loans?active=false` includes history. Member searches accept `search` and `type`. PUT member payloads use `name`, `email`, `type`, and `active`. Deactivate members with loan history rather than deleting them. Books with loan history cannot be deleted. Active loans must be returned before making their books available. Checkout and return update loan records and book availability in one transaction, with row locks on MySQL/PostgreSQL to serialize concurrent requests for a book.

Passwords use salted scrypt hashes. Session tokens are random, stored only as SHA-256 digests on the server, and kept in browser session storage until sign-out or tab closure. Five failed logins for an email within 15 minutes temporarily block further attempts. Role changes, deactivation and password changes revoke affected sessions. There is no public account registration or password-reset endpoint; account creation is controlled by administrators.

## Verification

```bash
cd backend
pip install -r requirements-dev.txt
python -m unittest discover -s tests -t . -v
cd ../frontend
npm run build
```

Backend tests use an isolated temporary SQLite database, never the configured production database. They cover authenticated book CRUD, role restrictions, session expiry/logout, password revocation, account management, throttling, member persistence and loan/return conflicts. Production row-lock behavior needs MySQL/PostgreSQL integration testing.

## Operational notes

- CORS defaults to `http://localhost:5173`; use comma-separated `CORS_ORIGINS` values for additional trusted frontends.
- Prices use Python `Decimal`, MySQL `DECIMAL(10,2)`, and Pydantic validation.
- Duplicate title/author pairs return HTTP 409. Missing records return 404 and invalid payloads return 422.
- Member registration, checkout, returns and dashboard statistics are backed by the API. Settings preferences remain local to the device.
- Theme and interface preferences are kept in browser local storage.
- The UI respects reduced-motion settings, keyboard navigation, modal focus trapping, and Escape-to-close.

## GitHub Pages deployment

The frontend is configured for static hosting on GitHub Pages. The Vite build uses a relative base path so the app can load correctly from a repository project site such as `https://<username>.github.io/anirory-library/`.

1. Push the repository to GitHub.
2. In the repository settings, open Pages and choose the GitHub Actions deployment source.
3. The production build defaults to `https://anirory-library-api-anirology.vercel.app`. To use a different backend, configure the repository variable `VITE_API_BASE_URL` before pushing to `main`.
4. The workflow in `.github/workflows/deploy.yml` builds the React app and publishes the `frontend/dist` output automatically.

## Backend deployment from GitHub

GitHub Pages cannot execute FastAPI. The no-card deployment uses Vercel Hobby for the FastAPI serverless function and Neon Free for PostgreSQL. Both services can connect directly to this GitHub repository.

1. Push this repository to GitHub.
2. Import `Anirology/anirory-library` into Vercel, use `backend` as the Root Directory, and name the project `anirory-library-api-anirology`.
3. In the Vercel project, add a Neon database from Storage and connect it to Production. The integration supplies `DATABASE_URL` without exposing it to the frontend.
4. Set `CORS_ORIGINS=https://anirology.github.io` in the Vercel project environment and deploy.
5. Wait for `/health` to return a successful response. The GitHub Pages frontend is already configured to use that API URL.

The Vercel Hobby plan and Neon Free plan have usage limits, but neither requires a credit card for this deployment.

## Production deployment

Use a dedicated least-privilege MySQL account, terminate TLS at a reverse proxy, set explicit production `CORS_ORIGINS`, and run Uvicorn behind a process manager. Build `frontend/dist` and serve those static assets from a CDN or web server. Never commit `.env` files.
