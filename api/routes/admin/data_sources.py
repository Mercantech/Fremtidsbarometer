from typing import Optional, List
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from database.session import get_db
from database.models import DataSource
from api.schemas import (
    DataSourceSchema,
    DataSourceCreateSchema,
    DataSourceUpdateSchema,
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

    new_source = DataSource(
        name=name,
        url=clean_url,
        category=category,
        source_type=source_type,
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
