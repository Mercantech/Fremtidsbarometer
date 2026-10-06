# Fremtidsbarometer — Инструкция по запуску и деплою

Проект полностью настроен для работы как в локальном режиме разработки, так и для продакшн-развертывания через Docker и Cloudflare Tunnel.

---

## 🖥️ 1. Локальный запуск для разработки

Для одновременного запуска всех компонентов (FastAPI, React, Планировщик фоновых агентов):

```bash
# Запуск всего стека одной командой
make dev
```

- **Frontend**: http://localhost:5173
- **Backend API & Swagger Docs**: http://localhost:8000/docs
- **Остановка всех процессов**:
  ```bash
  make stop
  ```

---

## 🚀 2. Продакшн-развертывание на сервере (Docker)

На сервере используется контейнеризация через `docker-compose.prod.yml`.

### Шаг 1: Подготовка конфигурации `.env`
Создайте файл `.env` на сервере:
```bash
cp .env.example .env
```
Заполните обязательные переменные:
- `GEMINI_API_KEY` — ключ API для Gemini (или другой выбранный провайдер).
- `ADMIN_API_KEY` — секретный ключ для защиты административных эндпоинтов.
- `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` — реквизиты базы данных.

### Шаг 2: Запуск контейнеров
```bash
docker-compose -f docker-compose.prod.yml up --build -d
```
Стек запустит:
1. **`db`** — PostgreSQL 15 с постоянным хранилищем.
2. **`api`** — FastAPI бэкенд (порт 8000 внутри сети, автоматически накатывает миграции Alembic).
3. **`scheduler`** — Планировщик сбора данных (каждые 15 мин — Live News, по Пн/Чт — глубокие парсеры и Синтезатор).
4. **`frontend`** — Nginx сервер (порт 80), отдающий React SPA и проксирующий `/api` к бэкенду.

### Шаг 3: Начальный сидинг базы данных (выполняется один раз)
```bash
docker-compose -f docker-compose.prod.yml exec api python database/seed.py
```

---

## ☁️ 3. Подключение через Cloudflare Tunnel (Рекомендуемый способ)

Cloudflare Tunnel позволяет безопасно пробросить трафик к сайту без открытия портов наружу в файрволе сервера.

1. Установите `cloudflared` на сервере:
   ```bash
   curl -L --output cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
   sudo dpkg -i cloudflared.deb
   ```
2. Авторизуйтесь в Cloudflare:
   ```bash
   cloudflared tunnel login
   ```
3. Создайте туннель:
   ```bash
   cloudflared tunnel create fremtidsbarometer
   ```
4. В панели Cloudflare Zero Trust (Tunnels) укажите маршрут:
   - **Service Type**: `HTTP`
   - **URL**: `localhost:80` (наш контейнер Nginx)
5. Запустите туннель как системный сервис:
   ```bash
   sudo cloudflared service install <TOKEN>
   ```

Готово! Весь внешний HTTPS трафик будет безопасно идти на порт 80 контейнера Nginx.
