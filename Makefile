.PHONY: dev stop db-up db-down frontend api agents

# ── Run the entire project ──
dev:
	@echo "🚀 Starting Fremtidsbarometer (local mode)..."
	@start "Fremtidsbarometer Scheduler" cmd /K "python -m agents.scheduler"
	@start "Fremtidsbarometer API" cmd /K "python -m uvicorn api.main:app --reload --port 8000"
	@cd frontend && npm run dev

# ── Stop ──
stop:
	@pkill -f "scheduler.py"  || true
	@pkill -f "uvicorn"       || true
	@pkill -f "vite"          || true
	@echo "✅ All services stopped"

# ── Individual components ──
db-down:
	@docker-compose down

frontend:
	@cd frontend && npm run dev

api:
	@uvicorn api.main:app --reload --port 8000

agents:
	@python -m agents.scheduler

# ── Database Initialization ──
db-init:
	@python database/init_db.py
	@echo "✅ Tables created"

db-seed:
	@python database/seed.py
	@echo "✅ Seed data loaded"
