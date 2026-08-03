# How to Run the Project (Fremtidsbarometer)

Hey! The project is fully configured so you don't even need Docker to run this locally (it works perfectly with your local Postgres or fallback data if connected to Neon).

## 🚀 Quick Start (Runs Everything)

Pop open a terminal in the root directory and just hit:

```bash
make dev
```

This single command automatically spins up the entire stack:
1. **Background Agents** (`scheduler.py`): The Python orchestrator that fetches GitHub trends, scrapes job postings, and generates AI hype analysis.
2. **Backend API** (`uvicorn`): The FastAPI backend running on **port 8000** that serves data to the frontend.
3. **Frontend** (`npm run dev`): The Vite-powered React UI running on **port 5173** (or 3000 depending on Vite config).

---

## 🛑 How to Stop Everything

When you're done and want to cleanly kill all running background processes (React, FastAPI, and Python Agents), just run:

```bash
make stop
```

---

## 🛠 Running Services Individually

If you prefer separate terminal tabs for each service so you can monitor the logs independently:

**1. Backend API (port 8000)**
Handles all data requests and serves the live IT news feed.
```bash
make api
```

**2. Background Agents**
The data collection engine. Runs scheduled jobs to populate the database.
```bash
make agents
```

**3. Frontend (port 5173)**
The 3D interactive Globe interface.
```bash
make frontend
```

---

## 💾 Database Setup (First time only)

Before running the project for the first time, you need to set up the database tables and seed them with historical data. Make sure you have your `.env` configured with the `DATABASE_URL`.

**1. Create the database tables:**
```bash
make db-init
```

**2. Load historical simulation data:**
```bash
make db-seed
```

You are good to go!
