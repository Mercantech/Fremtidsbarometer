# 📜 API Contract

This describes all available FastAPI endpoints for frontend integration.

## Base URL
`http://localhost:8000/` (local)

---

## 1. Technology Trends

### `GET /api/trends/`
Returns the most current data on technology popularity for the selected country.

**Parameters (Query):**
- `country` (string, optional) — Country code (e.g., "DK", "US", "GLOBAL"). Default: "GLOBAL".
- `limit` (int, optional) — Number of technologies in the response. Default: 20.

**Response (200 OK):**
```json
[
  {
    "technology": "Python",
    "popularity": 98.3,
    "mentions": 9831,
    "date": "2024-01-01T00:00:00+00:00"
  },
  {
    "technology": "Go",
    "popularity": 93.6,
    "mentions": 9359,
    "date": "2024-01-01T00:00:00+00:00"
  }
]
```

## 2. IT News

### `GET /api/news/`
Returns the latest IT news sorted by publication time (newest first).

**Parameters (Query):**
- `country` (string, optional) — Country code (e.g., "DK", "US", "GLOBAL"). Default: "GLOBAL".
- `limit` (int, optional) — Number of news items in response. Default: 50.

**Response (200 OK):**
```json
[
  {
    "id": "a1b2c3d4",
    "title": "New Python 3.12 release",
    "url": "https://example.com/news",
    "source": "hackernews",
    "score": 150.5,
    "tags": ["Python", "Release"],
    "ai_summary": "The new version improves performance...",
    "created_at": "2024-05-10T14:00:00+00:00"
  }
]
```

## 3. Historical Trends

### `GET /api/trends/history/`
Returns historical trend data for the graph (TimeSlider), grouped by year.

**Parameters (Query):**
- `country` (string, optional) — Country code. Default: "GLOBAL".
- `start_year` (int, optional) — Start year. Default: 1960.
- `end_year` (int, optional) — End year. Default: 2025.

**Response (200 OK):**
```json
[
  {
    "year": 1995,
    "data": [
      {
        "technology": "Java",
        "popularity": 15.5,
        "mentions": 1550
      }
    ]
  }
]
```

## 4. Countries

### `GET /api/countries/`
Returns a list of available countries with data in the database.

**Response (200 OK):**
```json
[
  "GLOBAL",
  "DK",
  "US"
]
```

## 5. Hype (AI Analytics)

### `GET /api/hype/`
Returns AI analysis results (hype trends).

**Parameters (Query):**
- `limit` (int, optional) — Number of trends. Default: 10.

**Response (200 OK):**
```json
[
  {
    "topic": "AI Agents",
    "score": 95.5,
    "direction": "rising",
    "summary": "AI Agents are becoming more popular...",
    "sources": ["hackernews", "reddit"],
    "date": "2024-05-10T14:00:00+00:00"
  }
]
```

## 6. Vacancies

### `GET /api/jobs/`
Returns latest vacancies.

**Parameters (Query):**
- `country` (string, optional) — Country. Default: "DK".
- `technology` (string, optional) — Technology filter (e.g., "Python").
- `limit` (int, optional) — Number of vacancies. Default: 20.

**Response (200 OK):**
```json
[
  {
    "id": 1,
    "title": "Senior Python Developer",
    "company": "Tech Corp",
    "url": "https://example.com/job",
    "source": "itjobbank",
    "city": "Copenhagen",
    "technology": "Python",
    "tags": ["Python", "Django", "PostgreSQL"],
    "match_score": 85.5,
    "match_reason": "Requires experience with Python...",
    "date": "2024-05-10T14:00:00+00:00"
  }
]
```

## 7. Salaries

### `GET /api/salary/`
Returns latest salary data.

**Parameters (Query):**
- `country` (string, optional) — Country. Default: "DK".
- `technology` (string, optional) — Technology filter (e.g., "Python").

**Response (200 OK):**
```json
[
  {
    "technology": "Python",
    "median": 85000.0,
    "p25": 70000.0,
    "p75": 105000.0,
    "currency": "USD",
    "role": "Software Engineer",
    "source": "levels_fyi",
    "date": "2024-05-10T14:00:00+00:00"
  }
]
```
