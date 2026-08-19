# Admin Panel Developer Handoff

> **Документация и спецификация для разработчика панели администратора.**
> Здесь описана архитектура бэкенда, эндпоинты авторизации (`ADMIN_API_KEY`), таблицы базы данных и правила взаимодействия с многоэтапным ИИ-пайплайном сбора и синтеза данных.

---

## 🔐 1. Авторизация и Безопасность (ADMIN_API_KEY)

Все административные маршруты защищены обязательным заголовком **`x-api-key`**. Без него бэкенд возвращает статус `401 Unauthorized` или `403 Forbidden`.

### Переменная окружения:
На сервере в файле `.env` задается ключ:
```env
ADMIN_API_KEY=super_secret_admin_key_change_me_in_production
```

### Заголовки HTTP-запроса от Админ-панели:
```http
GET /api/admin/logs?limit=50 HTTP/1.1
Host: your-domain.com
x-api-key: super_secret_admin_key_change_me_in_production
Content-Type: application/json
```

**Пример вызова на JavaScript (Fetch / Axios):**
```javascript
const response = await fetch('/api/admin/logs', {
  headers: {
    'x-api-key': process.env.VITE_ADMIN_API_KEY || 'admin_dev_key_12345',
    'Content-Type': 'application/json'
  }
});
```

---

## 🤖 2. Управление Моделями ИИ (Таблица `ai_model_configs`)

Система оркестрации (`agents/orchestrator.py`) больше не использует жестко зашитые модели. При каждом запуске скрипт запрашивает из БД активную модель для конкретного этапа.

### Поля таблицы `ai_model_configs`:
- `id`: Integer (PK)
- `task_type`: String — **Строго одно из 4 значений**:
  - `"social_extraction"` — Этап 1 (09:00): Анализ постов и веток Reddit / Threads / Social.
  - `"tech_extraction"` — Этап 2 (10:00): Анализ историй HackerNews и GitHub Trending.
  - `"jobs_extraction"` — Этап 3 (11:00): Анализ требований вакансий TeamTailor / LinkedIn.
  - `"final_synthesis"` — Этап 4 (12:00): Семантическая кластеризация тем и математический синтез хайпа.
- `model_name`: String — Название модели (например, `"gemini-3.6-flash"`, `"gemini-3.1-pro"`, `"gpt-4o"`, `"mistral-large-latest"`).
- `provider`: String — Провайдер (`"google"`, `"openai"`, `"mistral"`, `"azure"`, `"custom"`).
- `is_active`: Integer (`1` = основная активная модель, `0` = отключена).
- `is_fallback`: Integer (`1` = резервная модель на случай сбоя квоты или таймаута основной).

### Поддерживаемые провайдеры и модели:
1. **Google Gemini** (включены по умолчанию):
   - `gemini-3.6-flash` — быстрая и дешевая для извлечения данных (Run 1–3).
   - `gemini-3.1-pro` — мощная reasoning-модель для финального синтеза (Run 4).
   - `gemini-3.5-flash` — резервная модель (Fallback).
2. **Школьные / Собственные модели**:
   - `openai` (`gpt-4o`, `gpt-4o-mini`)
   - `mistral` (`mistral-large-latest`, `codestral-latest`)
   - `azure` (корпоративные инстансы Azure OpenAI)
   - `custom` / `ollama` (локальные серверы)

---

## 📡 3. Управление Источниками (Таблица `data_sources`)

Оркестратор считывает список целей парсинга из таблицы `data_sources`.

### Поля таблицы `data_sources`:
- `id`: Integer (PK)
- `name`: String (например, `"TeamTailor API"`, `"HackerNews"`, `"Reddit Dev"`)
- `url`: String (URL источника / ленты)
- `category`: String (`"jobs"`, `"salary"`, `"hype"`, `"news"`)
- `source_type`: String (`"rss"`, `"api"`, `"html_scrape"`)
- `is_active`: Integer (`1` = парсить, `0` = временно отключен)

**Требования к UI**:
- Список источников с фильтром по `category`.
- Быстрый переключатель (Toggle) для поля `is_active`. Если какой-то RSS-источник перестал отвечать, админ выключает его в 1 клик.
- Форма добавления нового источника.

---

## 📊 4. Логи и Мониторинг Здоровья Системы

### А. Таблица `system_logs` (Логи оркестратора и сервисов)
- `level`: `"INFO"`, `"WARNING"`, `"ERROR"`
- `component`: `"Orchestrator"`, `"Scheduler"`, `"Synthesizer"`, `"FastAPI"`, `"SocialScraper"`, `"TechScraper"`, `"JobsScraper"`
- `message`: Краткое описание события
- `traceback`: Полный стек ошибки Python (при наличии)
- `metadata`: JSONB с таймингами задержки (`latency_ms`) и путями запросов

**Эндпоинт получения логов**:
```http
GET /api/admin/logs?level=ERROR&component=Synthesizer&limit=50&offset=0
```

### Б. Таблица `source_logs` (Ошибки парсинга)
- `data_source_id`: Ссылка на `data_sources.id`
- `error_message`: Описание ошибки сети / таймаута
- `http_status`: Например, `429 (Rate Limit)` или `404 (Not Found)`

---

## ⚡ 5. Кнопка «Пуск» и Ручной Запуск (Ручное Управление)

В админ-панели реализована возможность ручного запуска всего цикла сбора данных либо отдельных этапов, а также проверка свежести данных.

### А. Проверка свежести данных:
```http
GET /api/admin/status?max_age_hours=12 HTTP/1.1
x-api-key: <ADMIN_API_KEY>
```

**Пример ответа (200 OK):**
```json
{
  "status": "ok",
  "freshness": {
    "is_fresh": true,
    "latest_hype_topic": "Accelerated Frontier LLM Inference",
    "latest_hype_created_at": "2026-08-18T11:53:28.864000+00:00",
    "recent_raw_records": 64,
    "max_age_hours": 12
  }
}
```
*Если `is_fresh === true`, на дашборде админки можно отобразить зеленую плашку: «Данные актуальны, повторный запуск не требуется».*

---

### Б. Эндпоинт кнопки «Пуск» (Запуск сбора в фоне):
```http
POST /api/admin/trigger-pipeline?sweep=all&force=true HTTP/1.1
x-api-key: <ADMIN_API_KEY>
```

**Параметры Query:**
- `sweep` (string, по умолчанию `"all"`):
  - `"all"` — Полный цикл (Соцсети $\to$ Технические блоги $\to$ Вакансии $\to$ Синтезатор).
  - `"social"` — Запуск только сбора соцсетей (Reddit / Threads).
  - `"tech"` — Запуск только сбора HackerNews и GitHub.
  - `"jobs"` — Запуск только сбора вакансий TeamTailor.
  - `"synthesis"` — Запуск только ИИ-синтеза и кластеризации хайпа.
  - `"news"` — Немедленный опрос мировых новостей IT (Google News / RSS).
- `force` (boolean, по умолчанию `false`):
  - `false` — Если данные уже свежие ($< 12$ часов), бэкенд пропустит повторный сбор и сэкономит токены ИИ.
  - `true` — **Принудительный запуск («Жесткий Пуск»)**: скраперы и ИИ пройдутся по интернету в реальном времени, даже если данные собирались 5 минут назад.

**Пример ответа (200 OK — задача принята и выполняется в фоне):**
```json
{
  "status": "dispatched",
  "sweep": "all",
  "force": true,
  "message": "Pipeline task 'all' (force=True) has been queued and started in background."
}
```

**Пример вызова на JavaScript (Fetch):**
```javascript
async function triggerPipeline(sweepType = 'all', force = false) {
  const response = await fetch(`/api/admin/trigger-pipeline?sweep=${sweepType}&force=${force}`, {
    method: 'POST',
    headers: {
      'x-api-key': 'admin_dev_key_12345',
      'Content-Type': 'application/json'
    }
  });
  const data = await response.json();
  console.log('Task dispatched:', data);
}
```
