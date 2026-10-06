.PHONY: dev stop db-up db-down frontend api agents test

# ── Run the entire project ──
dev:
	@echo "🚀 Starting Fremtidsbarometer (local mode)..."
	@uvicorn api.main:app --reload --port 8000 &
	@cd frontend && npm run dev

# ── Stop ──
stop:
	@pkill -f "scheduler.py"  || true
	@pkill -f "uvicorn"       || true
	@pkill -f "vite"          || true
	@echo "✅ All services stopped"

# ── Individual components ──
db-up:
	@docker-compose up -d db

db-down:
	@docker-compose down

frontend:
	@cd frontend && npm run dev

api:
	@uvicorn api.main:app --reload --port 8000

agents:
	@PYTHONPATH=. python agents/scheduler.py

# ── Database Initialization ──
db-init:
	@python database/init_db.py
	@echo "✅ Tables created"

db-seed:
	@python database/seed.py
	@echo "✅ Seed data loaded"

# ── Testing ──
test:
	@PYTHONPATH=. python3 -m pytest -v tests/ || ./venv/bin/pytest -v tests/


