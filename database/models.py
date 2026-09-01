"""
Fremtidsbarometer — SQLAlchemy ORM Models
6 tables with UniqueConstraint to prevent duplicates.
Compatible with Neon (serverless PostgreSQL) and local Docker PostgreSQL.
"""

from datetime import datetime, timezone
from sqlalchemy import (
    Column, String, Float, Integer, DateTime, Text, Boolean,
    UniqueConstraint, Index, create_engine
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import declarative_base, sessionmaker
import os

Base = declarative_base()


# ── 1. News ──────────────────────────────────────────────
class NewsItem(Base):
    __tablename__ = "news_items"
    __table_args__ = (
        UniqueConstraint("url", name="uq_news_url"),
        UniqueConstraint("title", "source", name="uq_news_title_source"),
        Index("idx_news_created", "created_at"),
    )

    id         = Column(String(64), primary_key=True)  # sha256(url)[:16]
    title      = Column(String(500), nullable=False)
    url        = Column(String(1000))
    source     = Column(String(50))   # "hackernews", "reddit", "techcrunch"
    country    = Column(String(10))   # "DK", "US", "EU", "GLOBAL"
    score      = Column(Float, default=0)
    tags       = Column(JSONB)        # ["Python", "AI", "DevOps"]
    ai_summary = Column(Text)         # Short AI summary
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    def __repr__(self):
        return f"<NewsItem {self.source}: {self.title[:40]}>"


# ── 2. Technology Trends ────────────────────────────────
class TechTrend(Base):
    __tablename__ = "tech_trends"
    __table_args__ = (
        UniqueConstraint("technology", "country", "source", "date", name="uq_trend"),
        Index("idx_trend_tech", "technology"),
        Index("idx_trend_date", "date"),
    )

    id         = Column(Integer, primary_key=True, autoincrement=True)
    technology = Column(String(100), nullable=False)  # "Python", "Go", "Rust"
    country    = Column(String(10), nullable=False)    # "DK", "US", "GLOBAL"
    source     = Column(String(50), nullable=False)    # "github", "stackoverflow", "tiobe"
    date       = Column(DateTime(timezone=True), nullable=False)
    popularity = Column(Float)        # 0–100 popularity index
    mentions   = Column(Integer)      # Mention count
    metadata_  = Column("metadata", JSONB)  # Additional data
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    status     = Column(String(20))   # Additional status field

    def __repr__(self):
        return f"<TechTrend {self.technology} ({self.country}) {self.date}>"


# ── 3. Job Postings ──────────────────────────────────────────────
class JobPosting(Base):
    __tablename__ = "job_postings"
    __table_args__ = (
        UniqueConstraint("url", name="uq_job_url"),
        UniqueConstraint("title", "company", "source", name="uq_job_title_company"),
        Index("idx_job_country", "country"),
        Index("idx_job_date", "date"),
    )

    id          = Column(Integer, primary_key=True, autoincrement=True)
    title       = Column(String(500), nullable=False)
    company     = Column(String(200))
    url         = Column(String(1000))
    source      = Column(String(50))   # "jobindex", "itjobbank", "jobnet"
    country     = Column(String(10))
    city        = Column(String(100))
    technology  = Column(String(100))  # Main technology
    tags        = Column(JSONB)        # ["Python", "Django", "PostgreSQL"]
    date        = Column(DateTime(timezone=True))
    match_score = Column(Float)        # AI scoring (0–100)
    match_reason = Column(Text)        # Why it fits
    created_at  = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    status      = Column(String(20))   # Additional status field

    def __repr__(self):
        return f"<JobPosting {self.company}: {self.title[:40]}>"


# ── 4. Salary Data ─────────────────────────────────────
class SalaryData(Base):
    __tablename__ = "salary_data"
    __table_args__ = (
        UniqueConstraint("technology", "country", "source", "date", name="uq_salary"),
        Index("idx_salary_tech", "technology"),
    )

    id         = Column(Integer, primary_key=True, autoincrement=True)
    technology = Column(String(100), nullable=False)
    country    = Column(String(10), nullable=False)
    source     = Column(String(50), nullable=False)  # "levels_fyi", "stackoverflow", "eurostat"
    date       = Column(DateTime(timezone=True), nullable=False)
    median     = Column(Float)         # Median salary (USD)
    p25        = Column(Float)         # 25th percentile
    p75        = Column(Float)         # 75th percentile
    currency   = Column(String(10), default="USD")
    role       = Column(String(100))   # "Software Engineer", "DevOps"
    metadata_  = Column("metadata", JSONB)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    status     = Column(String(20))    # Additional status field

    def __repr__(self):
        return f"<SalaryData {self.technology} ({self.country}) {self.median}>"


# ── 5. Hype Analysis (AI-generated) ────────────────────────
class HypeAnalysis(Base):
    __tablename__ = "hype_analysis"
    __table_args__ = (
        UniqueConstraint("date", "topic", name="uq_hype_date_topic"),
    )

    id         = Column(Integer, primary_key=True, autoincrement=True)
    date       = Column(DateTime(timezone=True), nullable=False)
    topic      = Column(String(200), nullable=False)  # "AI Agents", "Rust in Production"
    score      = Column(Float)         # Hype-score (0–100)
    direction  = Column(String(10))    # "rising", "falling", "stable"
    summary    = Column(Text)          # AI-generated summary
    sources    = Column(JSONB)         # ["hackernews", "reddit", "techcrunch"]
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    status     = Column(String(20))    # Additional status field

    def __repr__(self):
        return f"<HypeAnalysis {self.topic}: {self.score}>"


# ── 6. Scrape Error Log ──────────────────────────────────
class ScrapeError(Base):
    __tablename__ = "scrape_errors"

    id         = Column(Integer, primary_key=True, autoincrement=True)
    source     = Column(String(50), nullable=False)
    error_type = Column(String(100))   # "timeout", "blocked", "parse_error"
    message    = Column(Text)
    url        = Column(String(1000))
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    def __repr__(self):
        return f"<ScrapeError {self.source}: {self.error_type}>"


# ── 7. ATS Companies (Auto-Discovery) ────────────────────────
class ATSCompany(Base):
    __tablename__ = "ats_companies"
    __table_args__ = (
        UniqueConstraint("domain", "ats_type", name="uq_ats_domain"),
    )

    id         = Column(Integer, primary_key=True, autoincrement=True)
    domain     = Column(String(200), nullable=False) # e.g. "polestar" (subdomain) or "polestar.teamtailor.com"
    ats_type   = Column(String(50), nullable=False)  # "teamtailor", "emply"
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    def __repr__(self):
        return f"<ATSCompany {self.domain} ({self.ats_type})>"


# ── 7b. Eras ────────────────────────────────────────────────
class Era(Base):
    __tablename__ = "eras"
    __table_args__ = (
        UniqueConstraint("year", name="uq_era_year"),
    )

    id         = Column(Integer, primary_key=True, autoincrement=True)
    year       = Column(Integer, nullable=False)
    title      = Column(String(200), nullable=False)
    subtitle   = Column(String(500))
    stats      = Column(JSONB)
    created_at = Column(DateTime(timezone=True))

    def __repr__(self):
        return f"<Era {self.year}: {self.title}>"


# ── 7c. Geography Grid ────────────────────────────────────────────────
class GeographyGrid(Base):
    __tablename__ = "geography_grid"
    __table_args__ = (
        UniqueConstraint("country_code", "region_name", name="uq_geo_region"),
    )

    id           = Column(Integer, primary_key=True, autoincrement=True)
    country_code = Column(String(10), nullable=False)
    region_name  = Column(String(100), nullable=False)
    tier         = Column(Integer, nullable=False)
    lat          = Column(Float)
    lng          = Column(Float)
    last_scraped = Column(DateTime(timezone=True))

    def __repr__(self):
        return f"<GeographyGrid {self.country_code}: {self.region_name}>"


# ── 7d. Raw Scrape Data ────────────────────────────────────────────────
class RawScrapeData(Base):
    __tablename__ = "raw_scrape_data"

    id             = Column(Integer, primary_key=True, autoincrement=True)
    source_id      = Column(Integer)
    country_code   = Column(String(10))
    raw_text       = Column(Text, nullable=False)
    extracted_urls = Column(JSONB)
    processed      = Column(Integer)
    created_at     = Column(DateTime(timezone=True))

    def __repr__(self):
        return f"<RawScrapeData source_id={self.source_id} processed={self.processed}>"

# ── 8. System Logs (Admin Panel) ─────────────────────────────
class SystemLog(Base):
    __tablename__ = "system_logs"
    __table_args__ = (
        Index("idx_syslog_created", "created_at"),
        Index("idx_syslog_level", "level"),
        Index("idx_syslog_component", "component"),
    )

    id         = Column(Integer, primary_key=True, autoincrement=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    level      = Column(String(20), nullable=False)   # "INFO", "WARNING", "ERROR", "CRITICAL"
    component  = Column(String(100), nullable=False)  # "NewsAgent", "FastAPI", "Scheduler"
    message    = Column(Text, nullable=False)
    traceback  = Column(Text, nullable=True)          # Full error stack (if any)
    metadata_  = Column("metadata", JSONB, nullable=True) # JSON for additional data (request_path, latency, etc)

    def __repr__(self):
        return f"<SystemLog {self.level} [{self.component}] {self.message[:40]}>"


# ── 9. AI Model Configurations (Admin Panel) ─────────────────────────────
class AIModelConfig(Base):
    __tablename__ = "ai_model_configs"

    __table_args__ = (
        UniqueConstraint(
            "task_type",
            "model_name",
            "provider",
            name="uq_ai_model_config"
        ),
        Index("idx_aimodel_task", "task_type"),
        Index("idx_aimodel_active", "is_active"),
    )

    id = Column(Integer, primary_key=True, autoincrement=True)
    task_type = Column(String(50), nullable=False)
    model_name = Column(String(100), nullable=False)
    provider = Column(String(50), nullable=False)
    is_active = Column(Integer, default=0)
    is_fallback = Column(Integer, default=0)

    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc)
    )

    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

# ── 10. Data Sources (Admin Panel) ─────────────────────────────
class DataSource(Base):
    __tablename__ = "data_sources"
    __table_args__ = (
        UniqueConstraint("url", name="uq_datasource_url"),
        Index("idx_datasource_category", "category"),
        Index("idx_datasource_active", "is_active"),
    )

    id         = Column(Integer, primary_key=True, autoincrement=True)
    name       = Column(String(200), nullable=False)  # "TeamTailor API", "HackerNews", "Reddit Dev"
    url        = Column(String(1000), nullable=False) # URL or endpoint
    category   = Column(String(50))
    source_type = Column(String(50))
    is_active  = Column(Integer)
    created_at = Column(DateTime(timezone=True))
    updated_at = Column(
    DateTime(timezone=True),
    default=lambda: datetime.now(timezone.utc),
    onupdate=lambda: datetime.now(timezone.utc),
    )

    def __repr__(self):
        return f"<DataSource {self.name} ({self.category})>"


# ── 11. Source Logs (Admin Panel) ─────────────────────────────
class SourceLog(Base):
    __tablename__ = "source_logs"
    __table_args__ = (
        Index("idx_sourcelog_created", "created_at"),
        Index("idx_sourcelog_source", "data_source_id"),
    )

    id         = Column(Integer, primary_key=True, autoincrement=True)
    data_source_id = Column(Integer, nullable=False)  # Reference to data_sources.id
    error_message = Column(Text, nullable=False)      # Description of the error
    http_status = Column(Integer, nullable=True)      # HTTP status code (429, 404, 500, etc.)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    def __repr__(self):
        return f"<SourceLog source_id={self.data_source_id}: {self.error_message[:50]}>"


# ── Engine & Session Factory ─────────────────────────────────
from database.session import engine, get_session

def get_engine():
    """Returns global engine singleton"""
    return engine
