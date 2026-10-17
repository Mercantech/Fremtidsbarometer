# 🌍 Fremtidsbarometer (Future IT Barometer)

> **Future IT Barometer** is an interactive 3D platform for analyzing trends, vacancies, and technologies in the IT industry. It provides a "Live Spatial IT Data Radar" visualized on an interactive 3D globe.

**Tech Stack:** Python (FastAPI + AI Agents) + React (Vite) + PostgreSQL + Three.js

---

## 📁 Project Architecture & Components

The project is split into four distinct, decoupled components that work together to provide real-time data:

### 1. 🤖 Python AI Agents (`/agents`)
**Responsible for:** Data Collection, Scraping, and AI Analysis.
This is the heart of the background data pipeline. It runs automatically via `scheduler.py`.
- **`scrapers/jobs_scraper.py`**: Scrapes junior/student job postings from European job boards and ATS systems (Teamtailor, Jobicy, Sweden JobTech) via JSON APIs and RSS. Uses AI to extract tech stacks, normalise salaries, and deduplicate via PostgreSQL `ON CONFLICT`.
- **`scrapers/tech_scraper.py`**: Scrapes GitHub Trending and HackerNews to calculate real-time popularity indexes of programming languages and frameworks.
- **`scrapers/social_scraper.py`**: Collects developer sentiment and discussion topics from Dev.to and Lobste.rs (Reddit permanently removed).
- **`synthesizer.py`**: Aggregates raw scrape data, runs Gemini clustering, hype scoring, and historical trend calculations to produce the final `tech_trends` and `hype_analysis` rows.
- **`scheduler.py`**: APScheduler orchestrator — runs partitioned sweeps (Mon/Thu) and a live news feed every 15 min.

### 2. 📡 FastAPI Backend (`/api`)
**Responsible for:** Serving data to the Frontend via REST APIs.
- A lightweight, asynchronous Python API built with FastAPI.
- It connects to the PostgreSQL database and exposes endpoints like `/api/trends/`, `/api/jobs/`, and `/api/salary/`.
- It also acts as a live proxy for the IT News feed (`/api/news/`), pulling RSS data in real-time.

### 3. 💾 Database (`/database`)
**Responsible for:** Persistent data storage.
- Uses **PostgreSQL** (compatible with serverless Neon DB or local Docker).
- Interacts with Python via **SQLAlchemy** ORM (`models.py`).
- Includes scripts for initialization (`init_db.py`) and seeding historical data (`seed.py`).

### 4. 🎨 React Frontend (`/frontend`)
**Responsible for:** The Interactive 3D User Interface.
- Built with **React**, **Vite**, and **TypeScript**.
- Styled using a **Neo-Brutalist** design aesthetic (`index.css`) featuring high contrast, solid borders, and a stark black/yellow color palette.
- Renders an interactive 3D Earth using **Three.js** and **React Three Fiber** (`GlobeCanvas.tsx`). Data points are mapped to geographic coordinates and display dynamic floating SVG labels (`BranchLabels.tsx`).

---

## 🚀 Quick Start (Local Development)

The easiest way to run the entire stack locally is by using the provided `Makefile`.

### 1. Clone and Configure
```bash
git clone <repo-url>
cd fremtidsbarometer

# Create your environment variables file
cp .env.example .env
```
*Note: Make sure to fill in `DATABASE_URL` (your local Postgres or Neon DB) and `GEMINI_API_KEY` (for the AI agents) in the `.env` file.*

### 2. Initialize the Database (First time only)
```bash
# Create all tables in PostgreSQL
make db-init

# Load historical language data (1960-2024)
make db-seed
```

### 3. Run the Entire Stack
```bash
make dev
```
This single command automatically spins up:
1. The **Background Agents** orchestrator (`scheduler.py`)
2. The **FastAPI Backend** on `http://localhost:8000`
3. The **Vite Frontend** on `http://localhost:5173` (Note: the frontend is usually started on port 5173 by Vite)

### 4. Stop All Services
When you're done, gracefully kill all background processes:
```bash
make stop
```

---

## 🛠 Running Services Individually

If you prefer to run services in separate terminal tabs to monitor their logs:

- **Backend API:** `make api`
- **Background Agents:** `make agents`
- **Frontend UI:** `make frontend`

---

## 📚 Documentation

For more detailed technical documentation, check the `/docs` folder:
- **`API_CONTRACT.md`**: Detailed definitions of all FastAPI endpoints, parameters, and JSON response formats.
- **`CHANGELOG.md`**: Complete history of project decisions, architectural shifts, and implemented features.
