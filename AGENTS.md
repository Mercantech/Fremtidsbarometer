# Project Rules & Architecture Guidelines (Mercantec / Fremtidsbarometer)

## 1. Dokploy Deployment & Container Lifecycle
- **Deployment Platform**: Dokploy with Docker Compose.
- **Service Topology**:
  - `web`: Nginx frontend (port 3000) reverse-proxying `/api/` to `fremtidsbarometer-api:8000`.
  - `api`: FastAPI application (Uvicorn).
  - `scheduler`: Background AP Scheduler (`python -m agents.scheduler`).
  - `db`: PostgreSQL 15.
- **Never Run Heavy Long-Running Tasks on Startup**:
  - Background workers (like `agents/scheduler.py`) must **NEVER** launch unconditional heavy multi-minute sweeps (`run_full_cycle()`) in `startup_tasks` or `main()`.
  - Containers must start quickly, pass healthchecks, and wait for scheduled cron triggers or explicit manual triggers from the Admin Panel.
  - Startup sweeps consume AI tokens unexpectedly, cause database lock contention, and exhaust connection pools during initial service discovery.

---

## 2. Database Migrations & Schema Auto-Healing
- **Alembic vs Pre-existing Tables (`Base.metadata.create_all`)**:
  - In Dokploy, the production database tables may already exist from earlier initialization (`create_all`).
  - **NEVER** run unconditioned `alembic upgrade head` at runtime without checking if tables exist. If `ats_companies` or `job_postings` already exist in the database, running `op.create_table('ats_companies')` will fail with `relation "ats_companies" already exists` and abort the transaction.
  - When tables are already present, the database must be stamped (`alembic stamp head`).
- **Idempotent DDL with Lock Timeouts & Catalog Inspection**:
  - In PostgreSQL, even `ALTER TABLE tbl ADD COLUMN IF NOT EXISTS ...` acquires an `ACCESS EXCLUSIVE` lock on `tbl` during parse/rewrite.
  - Runtime auto-healing routines (`ensure_database_schema`) must inspect existing columns and indexes via `inspect(engine)` (`pg_attribute` catalog check) *before* issuing any `ALTER TABLE`. If the column or index already exists, skip DDL entirely to eliminate unnecessary lock requests and prevent lock timeouts.
  - When DDL is actually required, **always set a lock timeout** (`SET lock_timeout = '3s';`) before running `ALTER TABLE` to prevent `ACCESS EXCLUSIVE` lock deadlocks that block incoming `SELECT` queries.
- **Worker Container Discipline**:
  - Background workers (like `agents/scheduler.py`) must **NOT** execute DDL migrations or data source repairs on startup. All schema initialization belongs solely to the API container / entrypoint migration script.
- **Strictly No DDL Inside HTTP Endpoints**:
  - **NEVER** execute `ALTER TABLE` or any DDL statements inside an API endpoint handler (e.g. `GET /api/jobs`).
  - Schema fixes belong solely in migration scripts or startup lifecycle hooks (`lifespan`), never in user-facing request paths.

---

## 3. SQLAlchemy Connection Pool & Concurrency
- **Pool Sizing & Fast-Fail Timeout**:
  - Configure `pool_size >= 15`, `max_overflow >= 25`.
  - **Always set `pool_timeout <= 10s`**: When the pool is saturated, queries must fail fast with a 503/500 rather than hanging for 60 seconds and causing Cloudflare 504 Gateway Timeouts.
  - Set `pool_recycle = 1800` (30 minutes) and `pool_pre_ping = True` to eliminate stale or dropped proxy connections.
- **Session Discipline**:
  - Long-running async functions (such as multi-stage scrapers or AI extractors) must **NOT** hold a single open `Session` or transaction for minutes across multiple network calls.
  - Check out a session, commit/read, and close immediately before making external HTTP requests or calling external LLM APIs.

---

## 4. Reverse Proxy & Gateway Timeouts (Nginx & Cloudflare)
- **Nginx Timeouts**:
  - `proxy_read_timeout` in Nginx is 60s. Cloudflare will return 504 Gateway Timeout if upstream does not respond within this window.
  - Any API endpoint must either return in < 10 seconds or be offloaded to an asynchronous background task with polling (like the Pipeline Execution engine).
- **Graceful Degradation**:
  - Read endpoints (`/api/jobs`, `/api/trends`, `/api/news`) must degrade gracefully (e.g., return empty list or cached data) rather than crashing or hanging on unexpected database anomalies.

---

## 5. External Data Sources & Scraper Policies
- **Strictly No Reddit Scraping or APIs**:
  - Reddit strictly blocks public `.json` endpoints, RSS, and free API access with HTTP 403 / IP rate limits.
  - **NEVER** re-introduce Reddit scrapers, Reddit OAuth calls, or Reddit entries in `DataSource` / `SOURCES_SEED`. Reddit is permanently deprecated.
  - Developer discussion signals must be collected solely from open, reliable developer platforms: **Dev.to API** (`/api/articles?tag=...`), **Lobste.rs** (`/hottest.json`, `/t/ai.json`), **HackerNews**, and **GitHub Trending**.

