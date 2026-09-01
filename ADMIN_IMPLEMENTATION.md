# Admin Panel Implementation Guide

## Overview

This document describes the complete implementation of the Fremtidsbarometer Admin Panel, including backend API endpoints, database models, and frontend components.

## Table of Contents

1. [Database Models](#database-models)
2. [Backend API Endpoints](#backend-api-endpoints)
3. [Frontend Components](#frontend-components)
4. [Configuration](#configuration)
5. [Migration & Deployment](#migration--deployment)
6. [Usage Guide](#usage-guide)

---

## Database Models

Three new database tables have been added to support admin functionality:

### 1. `ai_model_configs` Table

Manages AI model configurations for different pipeline stages.

**Fields:**
- `id` (Integer, PK): Auto-increment ID
- `task_type` (String): One of: `social_extraction`, `tech_extraction`, `jobs_extraction`, `final_synthesis`
- `model_name` (String): Model identifier (e.g., `gemini-3.6-flash`, `gpt-4o`)
- `provider` (String): Provider name (`google`, `openai`, `mistral`, `azure`, `custom`)
- `is_active` (Integer): 1 = active primary model, 0 = inactive
- `is_fallback` (Integer): 1 = fallback model, 0 = primary
- `created_at` (DateTime): Creation timestamp
- `updated_at` (DateTime): Last update timestamp

**Unique Constraint:** `(task_type, model_name, provider)`

### 2. `data_sources` Table

Manages data sources for scraping and analysis.

**Fields:**
- `id` (Integer, PK): Auto-increment ID
- `name` (String): Source name (e.g., `TeamTailor API`, `HackerNews`)
- `url` (String): Source URL or API endpoint
- `category` (String): One of: `jobs`, `salary`, `hype`, `news`, `tech`
- `source_type` (String): One of: `rss`, `api`, `html_scrape`
- `is_active` (Integer): 1 = active, 0 = inactive
- `created_at` (DateTime): Creation timestamp
- `updated_at` (DateTime): Last update timestamp

**Unique Constraint:** `(name, source_type)`

### 3. `source_logs` Table

Logs errors from data source scraping.

**Fields:**
- `id` (Integer, PK): Auto-increment ID
- `data_source_id` (Integer): Reference to `data_sources.id`
- `error_message` (Text): Error description
- `http_status` (Integer, nullable): HTTP status code if applicable
- `created_at` (DateTime): Error timestamp

---

## Backend API Endpoints

All admin endpoints require the `x-api-key` header with the `ADMIN_API_KEY` value.

### Authorization

```bash
# Header required for all requests
x-api-key: <ADMIN_API_KEY from .env>
```

### System Status

**GET** `/api/admin/status`

Check system health and data freshness.

**Query Parameters:**
- `max_age_hours` (int, default=12): Maximum acceptable data age in hours

**Response:**
```json
{
  "status": "ok|stale|no_data|error",
  "freshness": {
    "is_fresh": boolean,
    "latest_hype_topic": "string",
    "latest_hype_created_at": "ISO datetime",
    "recent_raw_records": number,
    "max_age_hours": number
  }
}
```

### System Logs

**GET** `/api/admin/logs`

Retrieve system logs with optional filtering.

**Query Parameters:**
- `level` (string, optional): Filter by `INFO`, `WARNING`, `ERROR`, `CRITICAL`
- `component` (string, optional): Filter by component name
- `limit` (int, default=50, max=1000): Number of logs to return
- `offset` (int, default=0): Pagination offset

**Response:** Array of SystemLog objects

### AI Model Management

#### GET `/api/admin/ai-models`

List all AI model configurations.

**Query Parameters:**
- `task_type` (string, optional): Filter by task type
- `is_active` (int, optional): Filter by active status (0 or 1)

#### POST `/api/admin/ai-models`

Create a new AI model configuration.

**Request Body:**
```json
{
  "task_type": "social_extraction",
  "model_name": "gemini-3.6-flash",
  "provider": "google",
  "is_active": 1,
  "is_fallback": 0
}
```

#### GET `/api/admin/ai-models/{model_id}`

Get a specific AI model configuration.

#### PATCH `/api/admin/ai-models/{model_id}`

Update an AI model configuration.

**Request Body:**
```json
{
  "is_active": 1,
  "is_fallback": 0
}
```

#### DELETE `/api/admin/ai-models/{model_id}`

Delete an AI model configuration.

### Data Sources Management

#### GET `/api/admin/data-sources`

List all data sources.

**Query Parameters:**
- `category` (string, optional): Filter by category
- `is_active` (int, optional): Filter by active status

#### POST `/api/admin/data-sources`

Create a new data source.

**Request Body:**
```json
{
  "name": "HackerNews",
  "url": "https://news.ycombinator.com",
  "category": "news",
  "source_type": "html_scrape",
  "is_active": 1
}
```

#### GET `/api/admin/data-sources/{source_id}`

Get a specific data source.

#### PATCH `/api/admin/data-sources/{source_id}`

Update a data source.

**Request Body:**
```json
{
  "name": "Updated Name",
  "is_active": 1
}
```

#### DELETE `/api/admin/data-sources/{source_id}`

Delete a data source.

### Source Logs

**GET** `/api/admin/source-logs`

Retrieve source error logs.

**Query Parameters:**
- `data_source_id` (int, optional): Filter by data source
- `limit` (int, default=50): Number of logs to return
- `offset` (int, default=0): Pagination offset

### Pipeline Control

**POST** `/api/admin/trigger-pipeline`

Trigger a data collection or synthesis pipeline.

**Query Parameters:**
- `sweep` (string, default="all"): Pipeline scope:
  - `all`: Full cycle
  - `social`: Social media only
  - `tech`: Tech news only
  - `jobs`: Jobs only
  - `synthesis`: Synthesis only
  - `news`: News only
- `force` (boolean, default=false): Force run even if data is fresh

**Response:**
```json
{
  "status": "dispatched|error",
  "sweep": "string",
  "force": boolean,
  "message": "string"
}
```

---

## Frontend Components

### 1. SystemStatusDisplay

Displays current system health and data freshness status.

**Props:** None

**Features:**
- Real-time status indicator
- Auto-refresh every 30 seconds
- Displays latest hype topic
- Shows data freshness status

### 2. PipelineControl

Control button for triggering data collection pipelines.

**Props:** None

**Features:**
- Pipeline scope selector
- Force run option
- Status feedback
- Auto-dismiss messages

### 3. AIModelManager

Manage AI model configurations.

**Props:** None

**Features:**
- List models grouped by task type
- Add new models
- Toggle active/fallback status
- Delete models
- Task type filtering

### 4. DataSourceManager

Manage data sources.

**Props:** None

**Features:**
- List data sources with metadata
- Category filtering
- Add new sources
- Toggle active status
- Delete sources
- URL preview

### 5. LogsViewer

View system and source logs.

**Props:** None

**Features:**
- Two tabs: System Logs and Source Logs
- Level-based filtering
- Component filtering
- Source filtering
- Full traceback display
- Metadata inspection

### 6. Main Admin Page

The main admin page aggregates all components in a tabbed interface.

**Navigation:**
- Overview & Status
- Pipeline Control
- AI Models
- Data Sources
- Logs

---

## Configuration

### Environment Variables

Add these to your `.env` file:

```env
# Admin Panel Authentication
ADMIN_API_KEY=super_secret_admin_key_change_me_in_production

# Frontend Admin API Key
VITE_ADMIN_API_KEY=admin_dev_key_12345
```

### Frontend Configuration

The admin panel uses the following environment variables from `.env.local` or `.env`:

```env
VITE_API_URL=http://localhost:8000
VITE_ADMIN_API_KEY=admin_dev_key_12345
```

---

## Migration & Deployment

### Database Migration

1. **Create migration (already done):**
   ```bash
   # Migration file already created at:
   # alembic/versions/add_admin_tables.py
   ```

2. **Run migration:**
   ```bash
   # Using Alembic
   alembic upgrade head
   
   # Or using Python
   python -m alembic upgrade head
   ```

3. **Verify migration:**
   ```sql
   -- Check if tables were created
   SELECT table_name 
   FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name IN ('ai_model_configs', 'data_sources', 'source_logs');
   ```

### Deployment Steps

1. **Backend:**
   - Update dependencies (none new)
   - Run database migration
   - Restart API server
   - Test endpoints with curl or admin panel

2. **Frontend:**
   - Install dependencies
   - Build frontend
   - Deploy to web server

3. **Verification:**
   - Access admin panel at `/admin`
   - Check system status
   - Try creating/editing configurations

---

## Usage Guide

### For System Administrators

#### 1. Accessing the Admin Panel

Navigate to `/admin` in the frontend. The page requires the admin API key to be configured.

#### 2. Monitoring System Health

- Go to **Overview & Status** tab
- Check the green/yellow/red status indicator
- View latest data topic and last update time
- Monitor recent record count

#### 3. Managing AI Models

- Navigate to **AI Models** tab
- Click "+ Add Model" to create a new configuration
- Select task type, model name, and provider
- Toggle Active/Fallback status as needed
- Delete unused configurations

**Important:** Only one model per task type should be active at a time.

#### 4. Managing Data Sources

- Go to **Data Sources** tab
- Add new sources with name, URL, category, and type
- Filter by category
- Toggle sources on/off without deleting
- Delete unused sources

**Note:** Disabling a source stops scraping without losing historical data.

#### 5. Triggering Pipelines

- Go to **Pipeline Control** tab
- Select collection scope (all/social/tech/jobs/synthesis/news)
- Check "Force Run" to bypass cache and use real-time data
- Click "Start Pipeline"
- Monitor progress in the Logs tab

#### 6. Reviewing Logs

- Go to **Logs** tab
- Switch between System Logs and Source Logs
- Filter by level, component, or data source
- Click "View Traceback" to see full error details
- Inspect metadata for request latency information

### For Developers

#### 1. Adding Custom AI Providers

1. Update the `PROVIDERS` constant in `AIModelManager.tsx`
2. Update backend validation in `admin.py`
3. Update model initialization code in orchestrator

#### 2. Extending Admin API

1. Add new models to `database/models.py`
2. Create Pydantic schemas in `api/schemas.py`
3. Add routes to `api/routes/admin.py`
4. Create frontend components as needed

#### 3. Testing Admin Endpoints

```bash
# Get system status
curl -H "x-api-key: your_key" http://localhost:8000/api/admin/status

# Get AI models
curl -H "x-api-key: your_key" http://localhost:8000/api/admin/ai-models

# Get data sources
curl -H "x-api-key: your_key" http://localhost:8000/api/admin/data-sources

# Trigger pipeline
curl -X POST -H "x-api-key: your_key" \
  "http://localhost:8000/api/admin/trigger-pipeline?sweep=all&force=false"
```

---

## Error Handling

### Common Issues

1. **401 Unauthorized**
   - Check ADMIN_API_KEY is set in backend `.env`
   - Verify VITE_ADMIN_API_KEY matches in frontend

2. **Network Error**
   - Ensure backend is running
   - Check CORS configuration
   - Verify API URL in frontend config

3. **Database Migration Failed**
   - Check database connection
   - Ensure previous migrations completed
   - Check for unique constraint violations

---

## Security Considerations

1. **API Key Management:**
   - Change `ADMIN_API_KEY` from default in production
   - Use strong, randomly generated keys
   - Rotate keys periodically
   - Never commit keys to version control

2. **Access Control:**
   - Restrict admin page to authenticated users (implement in auth.tsx)
   - Log all admin actions
   - Audit sensitive operations

3. **Input Validation:**
   - All endpoints validate task types, categories, and providers
   - URLs are validated before storage
   - Model names are sanitized

---

## File Structure

```
Admin Implementation Files:
├── backend/
│   ├── database/models.py (new: AIModelConfig, DataSource, SourceLog)
│   ├── api/schemas.py (new: admin schemas)
│   ├── api/routes/admin.py (new: admin endpoints)
│   └── api/database.py (existing)
├── alembic/
│   └── versions/add_admin_tables.py (new: migration)
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── SystemStatusDisplay.tsx (new)
    │   │   ├── PipelineControl.tsx (new)
    │   │   ├── AIModelManager.tsx (new)
    │   │   ├── DataSourceManager.tsx (new)
    │   │   └── LogsViewer.tsx (new)
    │   ├── pages/
    │   │   └── Admin.tsx (updated)
    │   ├── services/
    │   │   └── adminApi.ts (new)
    │   └── styles/
    │       └── admin.css (new)
```

---

## Support & Troubleshooting

For issues or questions:
1. Check logs in the admin panel
2. Review error messages in browser console
3. Check backend logs for API errors
4. Verify database migration completed successfully
5. Test API endpoints manually with curl

---

**Last Updated:** 2026-09-01
**Implementation Version:** 1.0.0
