# Anirory Library Management System

Anirory is a production-oriented administrative catalog built with React/Vite and FastAPI. Book data is always read from and persisted to MySQL through SQLAlchemy; the frontend contains no fallback book catalog.

## Prerequisites

- Node.js 20 or newer and npm
- Python 3.11 or newer
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
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The deterministic seed adds exactly 350 starter records, including the five required titles. Re-running it is safe: the script checks stable title/author identities and inserts only missing seed records.

API documentation is available at [http://localhost:8000/docs](http://localhost:8000/docs), and the health endpoint is at [http://localhost:8000/health](http://localhost:8000/health).

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

| Method | Route | Purpose |
| --- | --- | --- |
| GET | `/books` | Paginated catalog search and filtering |
| GET | `/books/{book_id}` | Complete record by ID |
| POST | `/books` | Create a record |
| PUT | `/books/{book_id}` | Replace a record |
| PATCH | `/books/{book_id}` | Update selected fields |
| DELETE | `/books/{book_id}` | Delete a record; returns 204 |

`GET /books` accepts `category`, `max_price`, `available`, `search`, `sort`, `page`, and `page_size`. `sort` accepts `title`, `newest`, `price`, or `author`.

## Operational notes

- CORS defaults to `http://localhost:5173`; use comma-separated `CORS_ORIGINS` values for additional trusted frontends.
- Prices use Python `Decimal`, MySQL `DECIMAL(10,2)`, and Pydantic validation.
- Duplicate title/author pairs return HTTP 409. Missing records return 404 and invalid payloads return 422.
- Member and circulation pages are deliberately interactive administrative placeholders; only the requested book domain is persisted.
- Theme and interface preferences are kept in browser local storage.
- The UI respects reduced-motion settings, keyboard navigation, modal focus trapping, and Escape-to-close.

## GitHub Pages deployment

The frontend is configured for static hosting on GitHub Pages. The Vite build uses a relative base path so the app can load correctly from a repository project site such as `https://<username>.github.io/anirory-library/`.

1. Push the repository to GitHub.
2. In the repository settings, open Pages and choose the GitHub Actions deployment source.
3. The production build defaults to `https://anirory-library-api-anirology.onrender.com`. To use a different backend, configure the repository variable `VITE_API_BASE_URL` before pushing to `main`.
4. The workflow in `.github/workflows/deploy.yml` builds the React app and publishes the `frontend/dist` output automatically.

## Backend deployment from GitHub

GitHub Pages cannot execute FastAPI, so the repository includes a Render Blueprint in `render.yaml`. Render pulls the backend from GitHub, provisions PostgreSQL, seeds the catalog, and publishes the API at `https://anirory-library-api-anirology.onrender.com`.

1. Push this repository to GitHub.
2. Open [the Render Blueprint deployment page](https://render.com/deploy?repo=https://github.com/Anirology/anirory-library).
3. Sign in, review the free web service and PostgreSQL database, and apply the Blueprint.
4. Wait for `/health` to return a successful response. The GitHub Pages frontend is already configured to use that API URL.

The free Render web service can sleep while idle and its free PostgreSQL database is intended for evaluation rather than permanent production data. Select paid plans in `render.yaml` before deployment if the catalog must remain continuously available.

## Production deployment

Use a dedicated least-privilege MySQL account, terminate TLS at a reverse proxy, set explicit production `CORS_ORIGINS`, and run Uvicorn behind a process manager. Build `frontend/dist` and serve those static assets from a CDN or web server. Never commit `.env` files.
