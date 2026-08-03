.PHONY: dev stop db-up db-down frontend api agents

# ── Запуск всего проекта ──
dev:
	@echo "🚀 Запуск Fremtidsbarometer (локальный режим)..."
	@cd agents && python scheduler.py &
	@uvicorn api.main:app --reload --port 8000 &
	@cd frontend && npm run dev

# ── Остановка ──
stop:
	@pkill -f "scheduler.py"  || true
	@pkill -f "uvicorn"       || true
	@pkill -f "vite"          || true
	@echo "✅ Все сервисы остановлены"

# ── Отдельные компоненты ──
db-down:
	@docker-compose down

frontend:
	@cd frontend && npm run dev

api:
	@uvicorn api.main:app --reload --port 8000

agents:
	@cd agents && python scheduler.py

# ── Инициализация БД ──
db-init:
	@python database/init_db.py
	@echo "✅ Таблицы созданы"

db-seed:
	@python database/seed.py
	@echo "✅ Seed-данные загружены"
