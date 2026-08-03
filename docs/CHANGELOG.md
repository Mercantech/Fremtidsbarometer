# 📝 CHANGELOG — Fremtidsbarometer

> Changelog. Updated by AI agent automatically after each step.

---

## [Step 0.1] — 2026-07-29
### What was done
- Created full project directory structure according to `ARCHITECTURE.md`
- Moved frontend files (`index.html`, `css/`, `js/`, `assets/`) to `frontend/`
- Deleted temporary scripts (`split.py`, `split_js.py`)
- Created configuration files: `.env.example`, `.gitignore`, `Makefile`
- Created `README.md` with structure description and launch instructions

### Files
- [NEW] `.env.example` — environment variables template
- [NEW] `.gitignore` — rules for Git
- [NEW] `Makefile` — run all services with one command
- [NEW] `README.md` — project description
- [NEW] `docs/CHANGELOG.md` — this file
- [NEW] Directories: `collector/`, `agents/`, `database/`, `api/routes/`, `docs/`, `logs/`, `tests/`
- [MOVED] `index.html` → `frontend/index.html`
- [MOVED] `css/` → `frontend/css/`
- [MOVED] `js/` → `frontend/js/`
- [MOVED] `assets/` → `frontend/assets/`
- [DELETED] `split.py`, `split_js.py` (temporary scripts)

### Verification
- ✅ Directory structure confirmed
- ✅ Frontend works on http://localhost:8080

---

## [Step 0.2] — 2026-07-29
### What was done
- Created `docker-compose.yml` (PostgreSQL 15-alpine, port 5432, healthcheck)
- Hardened `.gitignore`: added pgdata/, .env.production, .env.staging, .agents/, .gemini/

### Files
- [NEW] `docker-compose.yml`
- [MODIFIED] `.gitignore` — added rules for Docker and secrets

### Verification
- ⬜ Docker not installed (user confirmed — skipping launch)
- ✅ `.gitignore` audited — secrets are protected

---

## [Step 0.3] — 2026-07-29
### What was done
- Created ORM models (`NewsItem`, `TechTrend`, `JobPosting`, `SalaryData`, `HypeAnalysis`, `ScrapeError`) using `SQLAlchemy`.
- Configured indexes and `UniqueConstraint` to prevent duplicates.
- Added support for Neon Serverless PostgreSQL (SSL requirements) and local Docker.
- Created `init_db.py` script for table generation.
- Created `requirements.txt` for Python dependencies.

### Files
- [NEW] `database/models.py`
- [NEW] `database/init_db.py`
- [NEW] `database/__init__.py`
- [NEW] `requirements.txt`
- [MODIFIED] `.env.example` — added example for Neon

### Verification
- ✅ Code written. Execution of `init_db.py` expected after Neon DATABASE_URL is provided in `.env`.

---

## [Step 0.4] — 2026-07-29
### What was done
- Created `database/seed.py` script to generate historical popularity data for programming languages from 1960 to 2024.
- Implemented heuristic to simulate popularity curves (rise and fall) for 11 languages.
- Used `on_conflict_do_nothing` method for safe multiple executions (protection against duplicate seed data).

### Files
- [NEW] `database/seed.py`

### Verification
- ✅ Script is ready to execute. After DB initialization via `init_db.py`, data can be loaded via `python database/seed.py`.

---

## [Step 1.1] — 2026-07-29
### What was done
- Created base structure of FastAPI application (`api/main.py`).
- Added CORS middleware to allow requests from frontend.
- Created `get_db` dependency (`api/database.py`) to manage DB sessions in routes.
- Written test routes `/` and `/health`.

### Files
- [NEW] `api/main.py`
- [NEW] `api/database.py`

### Verification
- ✅ Server started via `uvicorn`. Request to `http://localhost:8000/health` returns `{"status":"ok"}`.

---

## [Step 1.2] — 2026-07-29
### What was done
- Written endpoint `/api/trends/` to get list of trends (technologies) by country (`api/routes/trends.py`).
- Endpoint integrated into main file `api/main.py`.
- Created document `docs/API_CONTRACT.md` with API description.

### Files
- [NEW] `api/routes/trends.py`
- [NEW] `api/routes/__init__.py`
- [NEW] `docs/API_CONTRACT.md`
- [MODIFIED] `api/main.py` — connected trends router

### Verification
- ✅ Executed request `curl -s http://localhost:8000/api/trends/`.
- ✅ Received correct JSON with list of technologies and their popularity from Neon Database.

---

## [Step 1.3] — 2026-07-29
### What was done
- Written endpoint `/api/news/` to get fresh IT news (`api/routes/news.py`).
- Endpoint integrated into main file `api/main.py`.
- Documentation `docs/API_CONTRACT.md` updated.

### Files
- [NEW] `api/routes/news.py`
- [MODIFIED] `api/main.py` — connected news router
- [MODIFIED] `docs/API_CONTRACT.md`

### Verification
- ✅ Executed request `curl -s http://localhost:8000/api/news/`. Received empty array `[]`, as news have not been collected yet.

---

## [Step 1.4] — 2026-07-29
### What was done
- Created routes for historical trend data (`api/routes/history.py`), country list (`api/routes/countries.py`), hype trends (`api/routes/hype.py`), jobs (`api/routes/jobs.py`) and salaries (`api/routes/salary.py`).
- All routes successfully registered in main application `api/main.py`.
- Documentation `docs/API_CONTRACT.md` fully updated with description of all five new endpoints.

### Files
- [NEW] `api/routes/history.py`
- [NEW] `api/routes/countries.py`
- [NEW] `api/routes/hype.py`
- [NEW] `api/routes/jobs.py`
- [NEW] `api/routes/salary.py`
- [MODIFIED] `api/main.py`
- [MODIFIED] `docs/API_CONTRACT.md`

### Verification
- ✅ Uvicorn automatically restarted without errors. Request `curl -s http://localhost:8000/api/trends/history/` returned historical data grouped by year.

---

## [Step 2.1] — 2026-07-29
### What was done
- Created base classes for Python AI agents (`agents/base_agent.py`) with retry logic.
- Integrated Gemini AI via `google-generativeai` into `GeminiProvider` class (`agents/ai_provider.py`).
- Created wrapper class for `patchright` (stealth Playwright) (`agents/scraper.py`) based on experience from `elevpladsproger`.
- Installed and configured `patchright` and `playwright-stealth` libraries.

### Files
- [NEW] `agents/base_agent.py`
- [NEW] `agents/ai_provider.py`
- [NEW] `agents/scraper.py`
- [NEW] `agents/__init__.py`
- [MODIFIED] `requirements.txt` — added `patchright` and `playwright-stealth`

### Verification
- ✅ Dependencies installed successfully. Chromium downloaded for `patchright`.

---

## [Step 2.2] — 2026-07-29
### What was done
- Fully reworked news mechanism (`api/routes/news.py`).
- Canceled use of database and heavyweight AI agent for news parsing in favor of a lightweight "Live Feed".
- Implemented proxy endpoint that dynamically fetches current news (titles, links, dates) via Google News RSS using `feedparser` library.

### Files
- [MODIFIED] `api/routes/news.py`

### Verification
- ✅ Request to `/api/news/` returns list of live IT news from Google News, without delays for AI generation or database.

---

## [Step 2.5] — 2026-07-29
### What was done
- Developed **Jobs Agent** (`agents/jobs_agent.py`) to analyze junior and student vacancies in European and Danish markets (according to project priorities).
- Configured integration with `PlaywrightScraper` (stealth mode `patchright`), allowing script to successfully access protected resources like LinkedIn and Jobindex.dk without bans.
- Configured prompt for Gemini AI, which parses raw page text and structures found skills and technologies required for juniors into JSON.
- Fixed operation of `playwright-stealth` library (version 2.0.3) inside `scraper.py` for asynchronous evasion application.

### Files
- [NEW] `agents/jobs_agent.py`
- [MODIFIED] `agents/scraper.py`
- [MODIFIED] `database/models.py` (added `ats_companies`)

### Verification
- ✅ Agent `jobs_agent.py` successfully started. Stealth browser bypasses bans, RSS parser instantly extracts vacancies from Teamtailor, and AI parses tech stack and saves to DB without string truncation.

---

## [Step 2.5 Auto-Discovery Update] — 2026-07-29
### What was done
- **Self-Seeding Architecture**: Agent transformed into a smart spider. When parsing Jobindex and LinkedIn, it dynamically finds `*.teamtailor.com` links using RegEx.
- **Persistent Storage**: Upon discovering a new domain, it is automatically saved in the new DB table `ats_companies`. This allows abandoning static company lists and hardcoding.
- Database seeded with first Scandinavian ATS clients (`netnordic`, `dfds`, `securitas`, `gire`, `polestar`, `bankdata` etc.).
- Fixed `StringDataRightTruncation` error — added safe string truncation before saving to PostgreSQL.
- Updated Gemini model to the 2026 version (`gemini-3.6-flash`).

---

## [Step 2.3 GitHub Agent] — 2026-07-29
### What was done
- Developed `github_agent.py` for collecting global technology trends.
- Since GitHub disabled RSS (`/trending.atom`), parsing is implemented via `PlaywrightScraper`.
- AI (Gemini) extracts programming languages and frameworks, as well as the number of stars collected "today".
- Data is aggregated (if a language is mentioned multiple times) and saved to the `tech_trends` table with a normalized `popularity` index calculation (0 to 100 based on max stars per day).

---

## [Step 2.4 Reddit Agent] — 2026-07-29
### What was done
- Created script `agents/reddit_agent.py`.
- Implemented parsing of hyped technologies from subreddit titles (`r/programming`, `r/webdev`, `r/cscareerquestions`).
- The agent uses Playwright to bypass basic protection and fallback raw text parsing via Gemini.
- AI counts technology mentions, and the agent normalizes and saves them in the DB as `popularity`.

---

## [Step 2.6 & 2.7 Hype Agent & Scheduler] — 2026-07-29
### What was done
- Written `agents/hype_agent.py`. It collects fresh trends from the DB (from Reddit and GitHub agents) and passes them to Gemini.
- AI analyzes the "zeitgeist", extracting main narratives and discussions in the IT/AI sphere (e.g., "Shift to Agentic AI", "Junior Fears", "React Alternatives") and saves to the `hype_analysis` table.
- Developed a unified Scheduler (`agents/scheduler.py`) based on `APScheduler`, which automatically runs the entire agent chain (`Jobs -> GitHub -> Reddit -> Hype`) at 07:55 every day.
