# Fremtidsbarometer Architecture & Documentation

This document serves as the central source of truth for the project's architecture, design decisions, and data flow. Maintaining this document prevents confusion and ensures alignment on "what is where and why".

## 1. Tech Stack Overview

### Backend
- **Framework**: FastAPI (Python)
- **Database**: SQLite (via SQLAlchemy ORM)
- **API Documentation**: Built-in Swagger UI (Accessible at `http://localhost:8000/docs`)
- **Background Tasks**: APScheduler (for scraping agents like NewsAgent)

### Frontend
- **Framework**: React 19 + Vite + TypeScript
- **Styling**: Tailwind CSS v4 + custom CSS (`index.css`) for neon-brutalist aesthetic
- **State Management**: Zustand (`useStore.ts`)
- **3D Engine**: Three.js + React Three Fiber / Drei (`GlobeCanvas.tsx`)
- **2D Maps**: React-Leaflet (`FlatMapView.tsx`)
- **Animations**: Framer Motion (`App.tsx`)

---

## 2. Project Structure

### `/api` (Backend)
- `main.py`: The entry point for the FastAPI application. Configures CORS, rate limiting, logging, and registers routers. Also hosts the Swagger UI at `/docs`.
- `routes/`: Contains all endpoint definitions, grouped by feature (`eras.py`, `news.py`, `countries.py`, etc.).
- `schemas.py`: Pydantic models for request validation and response serialization (used heavily by Swagger).
- `database/`: SQLAlchemy setup (`database.py`), ORM models (`models.py`), and the seed script (`seed.py`).

### `/frontend/src` (Frontend)
- `App.tsx`: Main layout orchestrator. Handles switching between Globe/Map modes and coordinates the entrance/exit animations of UI panels.
- `store/useStore.ts`: Centralized state management. Responsible for fetching live data from the backend APIs and managing user selections (active era, topic, view mode).
- `components/`:
  - **`GlobeCanvas.tsx`**: Renders the 3D globe using NASA Blue Marble textures.
  - **`BranchLabels.tsx`**: Calculates and renders 2D HTML markers positioned over the 3D globe. Uses radial collision avoidance to prevent overlapping text.
  - **`FlatMapView.tsx`**: Renders a 2D Leaflet map using CARTO dark tiles. Used when the spatial toggle is switched to 'Map'.
  - **`RightPanel.tsx` / `NewsFeed.tsx`**: UI overlays for displaying data (stats, stack, roles, live news). These use `framer-motion` for slide-in animations.
- `utils/GeoLookup.ts`: A dictionary and resolver function that maps city/country names from the API to precise Lat/Lng coordinates.

---

## 3. Key Architectural Decisions

1. **Zero Hardcoding**: 
   - All era definitions and statistics have been moved to the backend database (`Era` model with JSONB `stats` field). The frontend dynamically renders whatever the backend provides.
2. **Persistence over Unmounting**:
   - The 3D `<Canvas>` in `GlobeCanvas.tsx` is computationally expensive to initialize. When switching to the 2D map, the canvas is hidden via CSS (`display: none`) rather than unmounted. This prevents memory leaks and ensures instant switching.
3. **Radial Collision Avoidance**:
   - In `BranchLabels.tsx`, multiple markers appearing in the same physical region (e.g., Silicon Valley or Europe) are pushed outwards radially from the center of the globe to ensure legibility.
4. **Animation Stacking Context**:
   - UI Panels wrapped in Framer Motion `<motion.div>` elements are explicitly given `absolute inset-0 pointer-events-none` classes to ensure they span the full viewport. This guarantees that internal absolute positioning (like `right: 40px` in `RightPanel.tsx`) works correctly and prevents layout collapse.

---

## 4. API & Swagger

FastAPI automatically generates an OpenAPI schema.
- **Swagger UI**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`
- **Raw Schema**: `http://localhost:8000/openapi.json`

When creating new endpoints, always use Pydantic models in `api/schemas.py` for `response_model` to ensure the Swagger documentation remains accurate and helpful for frontend integration.
