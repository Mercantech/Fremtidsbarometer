# 🌍 Fremtidsbarometer

> Future IT Barometer — an interactive 3D platform for analyzing trends, vacancies, and technologies in the IT industry.

**Stack:** Go + Python + FastAPI + React (Vite) + PostgreSQL + Three.js

---

## 📁 Project Structure

```
fremtidsbarometer/
├── collector/          ← Go module: data parsing (RSS, APIs, HTML)
├── agents/             ← Python AI agents (Gemini/Groq analysis)
├── database/           ← SQLAlchemy models + seed data
├── api/                ← FastAPI backend (:8000)
│   └── routes/         ← API endpoints
├── frontend/           ← React + Vite frontend (:3000)
│   ├── index.html      ← Entry point
│   ├── css/            ← Styles
│   ├── js/             ← Globe + UI logic
│   └── assets/         ← SVG assets
├── docs/               ← Documentation (API_CONTRACT, AGENTS, CHANGELOG)
├── logs/               ← Agent logs (RotatingFileHandler)
├── tests/              ← Tests
├── Plan/               ← Architecture and plans
├── docker-compose.yml  ← PostgreSQL
├── Makefile            ← Single-command runner
├── .env.example        ← Environment variables template
└── .gitignore
```

## 🚀 Quick Start

### 1. Clone and Configure
```bash
git clone <repo-url>
cd fremtidsbarometer
cp .env.example .env
# Fill in keys in .env
```

### 2. Run Everything (Mac/Linux)
```bash
make dev
```

### 3. Run Individually
```bash
make db-up        # PostgreSQL
make db-init      # Create tables
make db-seed      # Load historical data
make api          # FastAPI on :8000
make frontend     # Vite on :3000
make collector    # Go on :8001
make agents       # Python agents
```

### 4. Stop
```bash
make stop
```

---

## 📊 Current Status

| Component | Status |
|---|---|
| Project Structure | ✅ Ready |
| 3D Globe (Three.js) | ✅ Working |
| UI: panels, timeline, SVG lines | ✅ Working |
| Docker + PostgreSQL | ⬜ Step 0.2 |
| DB Schema | ⬜ Step 0.3 |
| FastAPI Backend | ⬜ Phase 1 |
| Python AI agents | ⬜ Phase 2 |
| Go Collector | ⬜ Phase 3 |
| Frontend integration | ⬜ Phase 4 |
| Telegram + CI/CD | ⬜ Phase 5 |
