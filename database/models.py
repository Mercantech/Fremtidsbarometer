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
    status     = Column(String(20), default="published", index=True)
    metadata_  = Column("metadata", JSONB)  # Additional data
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

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
        Index("idx_job_salary", "salary_min", "salary_max"),
    )

    id              = Column(Integer, primary_key=True, autoincrement=True)
    title           = Column(String(500), nullable=False)
    company         = Column(String(200))
    url             = Column(String(1000))
    source          = Column(String(50))   # "jobindex", "itjobbank", "jobnet", "djinni", "dou"
    country         = Column(String(10))
    city            = Column(String(100))
    technology      = Column(String(100))  # Main technology
    tags            = Column(JSONB)        # ["Python", "Django", "PostgreSQL"]
    date            = Column(DateTime(timezone=True))
    salary_min      = Column(Float, nullable=True)
    salary_max      = Column(Float, nullable=True)
    salary_currency = Column(String(10), nullable=True)
    match_score     = Column(Float)        # AI scoring (0–100)
    match_reason    = Column(Text)        # Why it fits
    status          = Column(String(20), default="published", index=True)
    created_at      = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

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
    status     = Column(String(20), default="published", index=True)
    metadata_  = Column("metadata", JSONB)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

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
    status     = Column(String(20), default="published", index=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    def __repr__(self):
        return f"<HypeAnalysis {self.topic}: {self.score}>"



# ── 6. Eras (Historical IT Periods) ──────────────────────────
class Era(Base):
    __tablename__ = "eras"
    __table_args__ = (
        UniqueConstraint("year", name="uq_era_year"),
    )

    id       = Column(Integer, primary_key=True, autoincrement=True)
    year     = Column(Integer, nullable=False)
    title    = Column(String(200), nullable=False)
    subtitle = Column(String(500))
    stats    = Column(JSONB)  # Flexible: roles, stack, hypeTopic, hypeDesc, etc.
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    def __repr__(self):
        return f"<Era {self.year}: {self.title}>"


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


# ── 9. Dynamic Data Sources ────────────────────────────────
class DataSource(Base):
    __tablename__ = "data_sources"
    __table_args__ = (
        UniqueConstraint("url", name="uq_datasource_url"),
    )

    id          = Column(Integer, primary_key=True, autoincrement=True)
    name        = Column(String(200), nullable=False)
    url         = Column(String(1000), nullable=False)
    source_type = Column(String(50))   # "rss", "api", "html_scrape"
    category    = Column(String(50))   # "jobs", "hype", "salary", "news", "tech", "social"
    country_code = Column(String(10), default="GLOBAL")  # e.g. "PL", "DE", "DK", "UA", "GLOBAL"
    is_active   = Column(Integer, default=1) # 1=active, 0=inactive (disabled due to errors)
    created_at  = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    def __repr__(self):
        return f"<DataSource {self.name} active={self.is_active}>"


# ── 10. Source Logs (Scraping Errors) ──────────────────────
class SourceLog(Base):
    __tablename__ = "source_logs"

    id              = Column(Integer, primary_key=True, autoincrement=True)
    data_source_id  = Column(Integer, nullable=False)
    error_message   = Column(Text, nullable=False)
    http_status     = Column(Integer, nullable=True)
    created_at      = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))



# ── 12. Raw Scrape Data (Pass 1 Dump) ──────────────────────
class RawScrapeData(Base):
    __tablename__ = "raw_scrape_data"

    id              = Column(Integer, primary_key=True, autoincrement=True)
    source_id       = Column(Integer, nullable=True)
    country_code    = Column(String(10), nullable=True)
    raw_text        = Column(Text, nullable=False)
    extracted_urls  = Column(JSONB, nullable=True)
    processed       = Column(Integer, default=0) # 0=Raw, 1=Processed by AI
    created_at      = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


# ── 13. AI Model Configurations (Admin Panel) ──────────────────
class AIModelConfig(Base):
    """
    Configuration table for AI models used in the multi-pass pipeline.
    Allows the Admin Panel to switch models on the fly.
    """
    __tablename__ = "ai_model_configs"

    id          = Column(Integer, primary_key=True, autoincrement=True)
    task_type   = Column(String(50), nullable=False)   # "spam_filter", "synthesis", "translation"
    model_name  = Column(String(100), nullable=False)  # "gpt-4o-mini", "claude-3-haiku-20240307"
    provider    = Column(String(50), nullable=False)   # "openai", "anthropic", "google"
    api_key     = Column(String(500), nullable=True)   # Custom token (optional, falls back to .env if empty)
    is_active   = Column(Integer, default=1)           # 1=Primary, 0=Disabled
    is_fallback = Column(Integer, default=0)           # 1=Fallback if primary fails
    created_at  = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    def __repr__(self):
        return f"<AIModelConfig {self.task_type}: {self.model_name}>"


# ── 14. Pipeline Executions (Process Tracking & History) ──────
class PipelineExecution(Base):
    """
    Tracks real-time and historical executions of data harvesting and AI synthesis tasks.
    Persists across browser reloads so admins always see current processes and history.
    """
    __tablename__ = "pipeline_executions"
    __table_args__ = (
        Index("idx_pipe_exec_created", "created_at"),
        Index("idx_pipe_exec_status", "status"),
    )

    id            = Column(String(64), primary_key=True)
    sweep         = Column(String(50), nullable=False)   # "all", "social", "tech", "jobs", "salary", "synthesis", "news"
    trigger_type  = Column(String(20), default="manual") # "manual", "scheduled"
    status        = Column(String(20), default="running")# "running", "completed", "failed", "aborted"
    current_step  = Column(String(200), default="Initialized")
    force         = Column(Integer, default=0)
    started_at    = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    finished_at   = Column(DateTime(timezone=True), nullable=True)
    duration_sec  = Column(Float, nullable=True)
    error_message = Column(Text, nullable=True)
    summary       = Column(JSONB, nullable=True)
    created_at    = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    def __repr__(self):
        return f"<PipelineExecution {self.id} [{self.sweep}] {self.status}>"


# ── 15. System Settings (Persistent Key-Value Store) ───────────
class SystemSetting(Base):
    """
    Stores system-wide configuration objects (e.g. globe radar display settings,
    feature parameters) in JSONB format.
    """
    __tablename__ = "system_settings"

    key        = Column(String(100), primary_key=True)
    value      = Column(JSONB, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    def __repr__(self):
        return f"<SystemSetting {self.key}>"


# ── 16. Broadcast Pins (Manual Announcements & Events) ───────
class BroadcastPin(Base):
    """
    Manual high-priority pins published by administrators (e.g. Mercantec education courses,
    tech hackathons, partner hiring initiatives). Visible on the 3D globe radar until expiration.
    """
    __tablename__ = "broadcast_pins"

    id                    = Column(Integer, primary_key=True, autoincrement=True)
    title                 = Column(String(300), nullable=False)
    description           = Column(Text, nullable=False)
    category              = Column(String(50), default="education")  # "education", "hackathon", "partner_job", "announcement"
    institution           = Column(String(200), default="Mercantec")
    location_name         = Column(String(100), default="Viborg, Denmark")
    latitude              = Column(Float, nullable=False)
    longitude             = Column(Float, nullable=False)
    url                   = Column(String(500), nullable=True)
    justification         = Column(Text, nullable=False)
    expires_at            = Column(DateTime(timezone=True), nullable=False)
    is_active             = Column(Boolean, default=True, index=True)
    created_at            = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    def __repr__(self):
        return f"<BroadcastPin {self.id}: {self.title[:30]}>"


# ── 17. Admin Audit Log ──────────────────────────────────────
class AdminAuditLog(Base):
    """
    Audit trail recording administrative actions (pin moderation, broadcast creation,
    job deletions, backup imports, config changes) for accountability and security.
    """
    __tablename__ = "admin_audit_logs"

    id          = Column(Integer, primary_key=True, autoincrement=True)
    action      = Column(String(50), nullable=False, index=True)   # "PIN_HIDE", "PIN_SHOW", "PIN_BULK_TOGGLE", "JOB_DELETE", "JOB_BULK_DELETE", "JOB_CLEANUP_EXPIRED", "BROADCAST_CREATE", "BROADCAST_DELETE", "BROADCAST_TOGGLE", "BACKUP_IMPORT", "ERA_CREATE", "ERA_UPDATE", "ERA_DELETE", "CONFIG_UPDATE"
    entity_type = Column(String(50), nullable=True)                # "pin", "job", "broadcast_pin", "era", "backup", "system_settings"
    entity_id   = Column(String(100), nullable=True)               # ID or comma-separated list of IDs
    details     = Column(JSONB, nullable=True)                     # Arbitrary payload/context (e.g. affected_count, title, reason)
    ip_address  = Column(String(50), nullable=True)
    created_at  = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True)

    def __repr__(self):
        return f"<AdminAuditLog {self.id}: {self.action}>"


# ── Engine & Session Factory ─────────────────────────────────
from database.session import engine, get_session

def get_engine():
    """Returns global engine singleton"""
    return engine


