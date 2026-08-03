# How to Run the Project (Fremtidsbarometer)

Hey! Everything is configured so you don't even need Docker to run this locally (it works fine with your local Postgres or fallback data).

## 🚀 Quick Start (Runs Everything)

Pop open a terminal in the root directory and just hit:

```bash
make dev
```

This single command automatically spins up:
1. **Agents** (`scheduler.py` for background data fetching)
2. **Backend API** (`uvicorn` on port 8000)
3. **Frontend** (`npm run dev` with Vite on port 5173)

---

## 🛑 How to Stop Everything

When you're done and want to kill all running background processes, just run:

```bash
make stop
```

---

## 🛠 Running Services Individually (If you need to debug / see logs)

If you want separate terminal tabs for each service so you can monitor the logs:

**1. Backend API (port 8000)**
```bash
make api
```

**2. Background Agents**
```bash
make agents
```

**3. Frontend (port 5173)**
```bash
make frontend
```

---

## 💾 Database Setup (First time only)

If you're running Postgres locally and configured your `.env`, initialize tables and seed data like this:

```bash
make db-init
make db-seed
```
