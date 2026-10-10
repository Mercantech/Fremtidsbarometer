from typing import Optional, List
import asyncio
import httpx
import feedparser
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from database.session import get_db
from database.models import DataSource, SourceLog
from api.schemas import (
    DataSourceSchema,
    DataSourceCreateSchema,
    DataSourceUpdateSchema,
    DataSourceTestRequest,
    DataSourceTestResponse,
    DataSourceIngestResponse,
)

router = APIRouter()

VALID_CATEGORIES = {"jobs", "salary", "hype", "news", "tech", "social"}
VALID_SOURCE_TYPES = {"rss", "api", "html_scrape"}


def normalize_url(url: str) -> str:
    """Normalizes URL string and validates scheme."""
    cleaned = url.strip()
    if not (cleaned.startswith("http://") or cleaned.startswith("https://")):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="URL must start with http:// or https://"
        )

    parts = cleaned.split("://", 1)
    scheme = parts[0].lower()
    rest = parts[1]

    if "/" in rest:
        domain, path = rest.split("/", 1)
        path = "/" + path.rstrip("/")
    else:
        domain = rest
        path = ""

    return f"{scheme}://{domain.lower()}{path}"


@router.get("/data-sources", response_model=List[DataSourceSchema])
def get_data_sources(
    category: Optional[str] = Query(None),
    is_active: Optional[int] = Query(None),
    db: Session = Depends(get_db)
):
    """Get all data sources with optional filtering."""
    if db.query(DataSource).count() == 0:
        from database.seeds.sources import seed_sources
        seed_sources(db)

    query = db.query(DataSource)
    if category:
        query = query.filter(DataSource.category == category.strip().lower())
    if is_active is not None:
        query = query.filter(DataSource.is_active == is_active)
    return query.order_by(DataSource.category, DataSource.name).all()


@router.post("/data-sources", response_model=DataSourceSchema, status_code=status.HTTP_201_CREATED)
def create_data_source(source_data: DataSourceCreateSchema, db: Session = Depends(get_db)):
    """Create a new data source."""
    name = source_data.name.strip()
    if not name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Source name cannot be empty."
        )

    category = source_data.category.strip().lower()
    if category not in VALID_CATEGORIES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid category '{source_data.category}'. Allowed categories: {', '.join(sorted(VALID_CATEGORIES))}"
        )

    source_type = source_data.source_type.strip().lower()
    if source_type not in VALID_SOURCE_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid source type '{source_data.source_type}'. Allowed types: {', '.join(sorted(VALID_SOURCE_TYPES))}"
        )

    clean_url = normalize_url(source_data.url)

    existing = db.query(DataSource).filter(
        (DataSource.url == clean_url) | (DataSource.url == clean_url + "/")
    ).first()
    if existing:
        status_label = "Active" if existing.is_active else "Inactive"
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Data source URL already exists: '{existing.name}' "
                f"(Category: {existing.category}, Type: {existing.source_type}, Status: {status_label}). "
                f"Please edit the existing source or use a different endpoint."
            )
        )

    country_code = (source_data.country_code or "GLOBAL").strip().upper()[:10]

    new_source = DataSource(
        name=name,
        url=clean_url,
        category=category,
        source_type=source_type,
        country_code=country_code,
        is_active=source_data.is_active if source_data.is_active is not None else 1,
    )

    try:
        db.add(new_source)
        db.commit()
        db.refresh(new_source)
        return new_source
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Data source with URL '{clean_url}' already exists in database."
        )


@router.post("/data-sources/test", response_model=DataSourceTestResponse)
async def test_data_source(payload: DataSourceTestRequest):
    """
    Tests a data source URL before adding or saving it.
    Validates HTTP connectivity, detects format (RSS/Atom XML, JSON API, HTML),
    and counts available entries.
    """
    clean_url = payload.url.strip()
    if not (clean_url.startswith("http://") or clean_url.startswith("https://")):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="URL must start with http:// or https://"
        )

    headers = {
        "User-Agent": "Fremtidsbarometer-Bot/1.0 (+https://fremtidsbarometer.dk; tech trend observatory)",
        "Accept": "application/rss+xml, application/atom+xml, application/xml, application/json, text/xml, text/html, */*"
    }

    try:
        async with httpx.AsyncClient(headers=headers, timeout=12.0, follow_redirects=True) as client:
            resp = await client.get(clean_url)
    except Exception as e:
        return DataSourceTestResponse(
            status_code=0,
            is_valid=False,
            detected_type="unreachable",
            item_count=0,
            sample_titles=[],
            error=f"Connection failed: {str(e)}"
        )

    if resp.status_code != 200:
        return DataSourceTestResponse(
            status_code=resp.status_code,
            is_valid=False,
            detected_type="http_error",
            item_count=0,
            sample_titles=[],
            error=f"HTTP {resp.status_code} ({resp.reason_phrase})"
        )

    body_text = resp.text
    content_type = resp.headers.get("content-type", "").lower()

    # 1. Try parsing as RSS / Atom XML
    is_xml_hint = (
        "xml" in content_type or
        "rss" in content_type or
        "atom" in content_type or
        clean_url.endswith((".rss", ".xml", ".atom")) or
        "/rss" in clean_url or
        body_text.lstrip().startswith("<?xml") or
        "<rss" in body_text[:500] or
        "<feed" in body_text[:500]
    )

    if is_xml_hint:
        feed = await asyncio.to_thread(feedparser.parse, body_text)
        entries = getattr(feed, "entries", [])
        if entries:
            sample_titles = [e.get("title", "").strip() for e in entries[:3] if e.get("title")]
            return DataSourceTestResponse(
                status_code=200,
                is_valid=True,
                detected_type="rss",
                item_count=len(entries),
                sample_titles=sample_titles,
                error=None
            )

    # 2. Try parsing as JSON API
    if "application/json" in content_type or clean_url.endswith(".json") or body_text.lstrip().startswith(("{", "[")):
        try:
            data = resp.json()
            items = []
            if isinstance(data, list):
                items = data
            elif isinstance(data, dict):
                for key in ["jobs", "data", "results", "articles", "stories", "items", "vacancies"]:
                    if key in data and isinstance(data[key], list):
                        items = data[key]
                        break
                if not items and data:
                    items = [data]

            sample_titles = []
            for item in items[:3]:
                if isinstance(item, dict):
                    t = item.get("title") or item.get("name") or item.get("headline") or item.get("position")
                    if t:
                        sample_titles.append(str(t).strip())

            return DataSourceTestResponse(
                status_code=200,
                is_valid=True,
                detected_type="json_api",
                item_count=len(items),
                sample_titles=sample_titles,
                error=None
            )
        except Exception:
            pass

    # 3. HTML or Web page fallback
    return DataSourceTestResponse(
        status_code=200,
        is_valid=True,
        detected_type="html",
        item_count=1,
        sample_titles=["HTML document received (200 OK)"],
        error=None
    )


@router.post("/data-sources/{source_id}/ingest", response_model=DataSourceIngestResponse)
async def ingest_single_data_source(source_id: int, db: Session = Depends(get_db)):
    """
    Instantly scrapes a single data source on-demand and returns ingestion results.
    Clears any prior failure logs on success.
    """
    source = db.query(DataSource).filter(DataSource.id == source_id).first()
    if not source:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Data source not found")

    saved = 0
    try:
        url_lower = (source.url or "").lower()
        name_lower = (source.name or "").lower()

        if source.category == "jobs":
            from agents.scrapers.jobs_scraper import scrape_single_job_source
            saved = await scrape_single_job_source(source, db)
        elif source.category == "salary":
            from agents.scrapers.salary_scraper import scrape_developer_salaries
            saved = await scrape_developer_salaries(db, source_id=source.id)
        elif source.category == "news":
            from agents.news_agent import scrape_single_news_source
            saved = await scrape_single_news_source(source, db)
        elif source.category in ("social", "tech"):
            if "hackernews" in name_lower or "news.ycombinator.com" in url_lower:
                from agents.scrapers.tech_scraper import scrape_hackernews
                saved = await scrape_hackernews(db, source_id=source.id)
            elif "github" in name_lower or "github.com" in url_lower:
                from agents.scrapers.tech_scraper import scrape_github_trending
                saved = await scrape_github_trending(db, source_id=source.id)
            elif "lobste.rs" in url_lower:
                from agents.scrapers.social_scraper import scrape_lobsters
                async with httpx.AsyncClient(timeout=15.0) as client:
                    saved = await scrape_lobsters(client, db, source_id=source.id)
            elif "dev.to" in url_lower:
                from agents.scrapers.social_scraper import scrape_dev_to
                async with httpx.AsyncClient(timeout=15.0) as client:
                    saved = await scrape_dev_to(client, db, source_id=source.id)
            elif source.source_type == "rss" or url_lower.endswith((".rss", ".xml", ".atom")) or "/rss" in url_lower:
                from agents.scrapers.social_scraper import scrape_generic_discussion_rss
                saved = await scrape_generic_discussion_rss(source, db)
            else:
                from agents.scrapers.jobs_scraper import scrape_single_job_source
                saved = await scrape_single_job_source(source, db)
        else:
            from agents.scrapers.jobs_scraper import scrape_single_job_source
            saved = await scrape_single_job_source(source, db)

        # On success, clear any failure logs
        db.query(SourceLog).filter(SourceLog.data_source_id == source.id).delete(synchronize_session=False)
        db.commit()

        return DataSourceIngestResponse(
            success=True,
            source_id=source.id,
            source_name=source.name,
            items_saved=saved,
            message=f"Successfully ingested: {saved} records saved/updated."
        )
    except Exception as e:
        db.rollback()
        try:
            db.add(SourceLog(data_source_id=source.id, error_message=str(e)[:500]))
            db.commit()
        except Exception:
            pass
        return DataSourceIngestResponse(
            success=False,
            source_id=source.id,
            source_name=source.name,
            items_saved=0,
            message=f"Source ingestion failed: {str(e)}"
        )


@router.get("/data-sources/{source_id}", response_model=DataSourceSchema)
def get_data_source(source_id: int, db: Session = Depends(get_db)):
    """Get a specific data source."""
    source = db.query(DataSource).filter(DataSource.id == source_id).first()
    if not source:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Data source not found")
    return source


@router.patch("/data-sources/{source_id}", response_model=DataSourceSchema)
def update_data_source(source_id: int, update: DataSourceUpdateSchema, db: Session = Depends(get_db)):
    """Update a data source."""
    source = db.query(DataSource).filter(DataSource.id == source_id).first()
    if not source:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Data source not found")

    update_data = update.model_dump(exclude_unset=True)

    if "name" in update_data and update_data["name"] is not None:
        name = update_data["name"].strip()
        if not name:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Source name cannot be empty.")
        update_data["name"] = name

    if "category" in update_data and update_data["category"] is not None:
        cat = update_data["category"].strip().lower()
        if cat not in VALID_CATEGORIES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid category '{update_data['category']}'. Allowed categories: {', '.join(sorted(VALID_CATEGORIES))}"
            )
        update_data["category"] = cat

    if "country_code" in update_data and update_data["country_code"] is not None:
        update_data["country_code"] = update_data["country_code"].strip().upper()[:10]

    if "source_type" in update_data and update_data["source_type"] is not None:
        st = update_data["source_type"].strip().lower()
        if st not in VALID_SOURCE_TYPES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid source type '{update_data['source_type']}'. Allowed types: {', '.join(sorted(VALID_SOURCE_TYPES))}"
            )
        update_data["source_type"] = st

    if "url" in update_data and update_data["url"] is not None:
        clean_url = normalize_url(update_data["url"])
        existing = db.query(DataSource).filter(
            DataSource.id != source_id,
            (DataSource.url == clean_url) | (DataSource.url == clean_url + "/")
        ).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Another data source with URL '{clean_url}' already exists ('{existing.name}')."
            )
        update_data["url"] = clean_url

    for field, value in update_data.items():
        setattr(source, field, value)

    try:
        db.commit()
        db.refresh(source)
        return source
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Conflict updating data source. URL must be unique."
        )


@router.delete("/data-sources/{source_id}")
def delete_data_source(source_id: int, db: Session = Depends(get_db)):
    """Delete a data source."""
    source = db.query(DataSource).filter(DataSource.id == source_id).first()
    if not source:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Data source not found")
    db.delete(source)
    db.commit()
    return {"message": "Data source deleted successfully"}

