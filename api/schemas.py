from pydantic import BaseModel, ConfigDict, Field
from typing import List, Optional, Any, Dict
from datetime import datetime

# --- News ---
class NewsItemSchema(BaseModel):
    id: str
    title: str
    url: Optional[str]
    source: Optional[str]
    country: Optional[str]
    score: float
    tags: Optional[List[str]]
    ai_summary: Optional[str]
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

# --- Tech Trends ---
class TechTrendSchema(BaseModel):
    technology: str
    popularity: float
    mentions: int
    date: datetime
    
    model_config = ConfigDict(from_attributes=True)

class TrendHistoryItemSchema(BaseModel):
    technology: str
    popularity: float
    mentions: int

class TrendHistoryYearSchema(BaseModel):
    year: int
    data: List[TrendHistoryItemSchema]

# --- Job Postings ---
class JobPostingSchema(BaseModel):
    id: int
    title: str
    company: Optional[str] = None
    url: Optional[str] = None
    source: Optional[str] = None
    country: Optional[str] = None
    city: Optional[str] = None
    technology: Optional[str] = None
    tags: Optional[List[str]] = None
    salary_min: Optional[float] = None
    salary_max: Optional[float] = None
    salary_currency: Optional[str] = None
    match_score: Optional[float] = None
    match_reason: Optional[str] = None
    date: Optional[datetime] = None
    hype_score: Optional[float] = 0.0
    is_hot: bool = False
    
    model_config = ConfigDict(from_attributes=True)

# --- Salary Data ---
class SalaryDataSchema(BaseModel):
    technology: str
    median: Optional[float]
    p25: Optional[float]
    p75: Optional[float]
    currency: Optional[str]
    role: Optional[str]
    source: str
    date: datetime
    
    model_config = ConfigDict(from_attributes=True)
    
# --- Hype Analysis ---
class HypeAnalysisSchema(BaseModel):
    topic: str
    score: Optional[float]
    direction: Optional[str]
    summary: Optional[str]
    sources: Optional[List[str]]
    date: datetime
    
    model_config = ConfigDict(from_attributes=True)

# --- Eras ---
class EraSchema(BaseModel):
    id: int
    year: int
    title: str
    subtitle: Optional[str] = None
    stats: Optional[Dict[str, Any]] = None
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class EraCreateSchema(BaseModel):
    year: int = Field(..., ge=1950, le=2100, description="Era anchor year e.g. 1970, 2026")
    title: str = Field(..., min_length=2, max_length=200, description="Era headline title")
    subtitle: Optional[str] = Field(default=None, max_length=500, description="Era secondary summary")
    stats: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Flexible era payload: roles, stack, hypeTopic, etc.")


class EraUpdateSchema(BaseModel):
    year: Optional[int] = Field(default=None, ge=1950, le=2100)
    title: Optional[str] = Field(default=None, min_length=2, max_length=200)
    subtitle: Optional[str] = Field(default=None, max_length=500)
    stats: Optional[Dict[str, Any]] = None

# --- System Logs ---
class SystemLogSchema(BaseModel):
    id: int
    created_at: datetime
    level: str
    component: str
    message: str
    traceback: Optional[str]
    metadata: Optional[Dict[str, Any]] = Field(default=None, validation_alias="metadata_")
    
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


# --- AI Model Configs ---
class AIModelConfigSchema(BaseModel):
    id: int
    task_type: str
    model_name: str
    provider: str
    is_active: int
    is_fallback: int
    env_key_present: bool = True
    env_var: Optional[str] = None
    created_at: Optional[datetime] = None
    
    model_config = ConfigDict(from_attributes=True)


class AIModelConfigCreateSchema(BaseModel):
    task_type: str
    model_name: str
    provider: str
    is_active: int = 0
    is_fallback: int = 0


class AIModelConfigUpdateSchema(BaseModel):
    is_active: Optional[int] = None
    is_fallback: Optional[int] = None


class ProviderStatusSchema(BaseModel):
    provider: str
    env_var: str
    is_configured: bool
    active_count: int = 0
    fallback_count: int = 0


class AIModelTestConnectionRequest(BaseModel):
    provider: str
    model_name: str


class AIModelTestConnectionResponse(BaseModel):
    success: bool
    status: str
    latency_ms: int
    message: str


# --- Data Sources ---
class DataSourceSchema(BaseModel):
    id: int
    name: str
    url: str
    category: str
    source_type: str
    country_code: Optional[str] = "GLOBAL"
    is_active: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    model_config = ConfigDict(from_attributes=True)


class DataSourceCreateSchema(BaseModel):
    name: str
    url: str
    category: str
    source_type: str
    country_code: Optional[str] = "GLOBAL"
    is_active: int = 1


class DataSourceUpdateSchema(BaseModel):
    name: Optional[str] = None
    url: Optional[str] = None
    category: Optional[str] = None
    source_type: Optional[str] = None
    country_code: Optional[str] = None
    is_active: Optional[int] = None


class DataSourceTestRequest(BaseModel):
    url: str
    source_type: Optional[str] = "rss"


class DataSourceTestResponse(BaseModel):
    status_code: int
    is_valid: bool
    detected_type: str
    item_count: int
    sample_titles: List[str] = []
    error: Optional[str] = None


class DataSourceIngestResponse(BaseModel):
    success: bool
    source_id: int
    source_name: str
    items_saved: int
    message: str


# --- Source Logs ---
class SourceLogSchema(BaseModel):
    id: int
    data_source_id: int
    source_name: Optional[str] = None
    source_url: Optional[str] = None
    source_category: Optional[str] = None
    error_message: str
    http_status: Optional[int] = None
    created_at: Optional[datetime] = None
    
    model_config = ConfigDict(from_attributes=True)


# --- Multi-Stage AI Extraction Schemas with Grounded Citations ---
class GroundedFact(BaseModel):
    """
    Base contract for all AI-extracted facts.
    Requires a valid source URL and a verbatim quotation proof from the raw text.
    """
    source_url: str = Field(..., description="Direct URL of the source article/post/job")
    quote: str = Field(..., min_length=10, max_length=500, description="Exact quotation proof from raw text")

    model_config = ConfigDict(from_attributes=True)


class ExtractedJob(GroundedFact):
    """
    Job vacancy extracted by AI from raw feed/HTML/JSON.
    """
    title: str = Field(..., min_length=2, description="Job title")
    company: str = Field(..., min_length=1, description="Company name")
    country: str = Field(default="GLOBAL", min_length=2, max_length=10, description="ISO-2 country code or GLOBAL/REMOTE")
    city: Optional[str] = Field(default=None, description="City if mentioned in text")
    technologies: List[str] = Field(default_factory=list, description="Extracted tech stack")
    seniority: Optional[str] = Field(default=None, description="Junior, Middle, Senior, Lead, Staff, Principal")
    salary_min: Optional[float] = Field(default=None, description="Minimum salary if explicitly disclosed")
    salary_max: Optional[float] = Field(default=None, description="Maximum salary if explicitly disclosed")
    salary_currency: Optional[str] = Field(default=None, description="Salary currency e.g. USD, EUR, DKK")


class JobExtractionPayload(BaseModel):
    """
    Strict payload returned by the jobs_extraction stage.
    """
    jobs: List[ExtractedJob] = Field(default_factory=list)


class ExtractedTechSignal(GroundedFact):
    """
    Technical signal extracted by AI from HackerNews, GitHub, or tech blogs.
    """
    technology: str = Field(..., min_length=1, description="Name of technology, tool, library, or framework")
    signal_type: str = Field(default="rising_popularity", description="new_release, rising_popularity, migration, outage, deprecation")
    context_summary: str = Field(..., min_length=10, max_length=400, description="Summary of the technical signal")
    sentiment: str = Field(default="neutral", description="positive, neutral, negative")


class TechExtractionPayload(BaseModel):
    """
    Strict payload returned by the tech_extraction stage.
    """
    signals: List[ExtractedTechSignal] = Field(default_factory=list)


class ExtractedDiscussion(GroundedFact):
    """
    Developer discussion / sentiment extracted by AI from Reddit, Dev.to, Lobste.rs.
    """
    topic: str = Field(..., min_length=2, description="Topic of developer discussion")
    community: str = Field(..., description="Community source e.g. Reddit r/LocalLLaMA, Dev.to")
    key_argument: str = Field(..., min_length=10, max_length=400, description="Core thesis or takeaway from discussion")
    sentiment_score: float = Field(default=0.0, ge=-1.0, le=1.0, description="Sentiment score from -1.0 to +1.0")
    tags: List[str] = Field(default_factory=list, description="Categorization tags")


class SocialExtractionPayload(BaseModel):
    """
    Strict payload returned by the social_extraction stage.
    """
    discussions: List[ExtractedDiscussion] = Field(default_factory=list)


class GlobeConfigSchema(BaseModel):
    """
    Settings controlling 3D Globe Radar density, batch rotation and content prioritization.
    """
    batch_rotation_seconds: int = Field(default=15, ge=5, le=60, description="Rotation period in seconds per batch")
    max_visible_pins: int = Field(default=14, ge=6, le=30, description="Maximum simultaneous pins on globe")
    hype_ratio: int = Field(default=50, ge=10, le=90, description="Percentage of hype topics vs jobs in batch")
    prioritize_salary: bool = Field(default=True, description="Prioritize vacancies with confirmed salary ranges")
    prioritize_trending_tech: bool = Field(default=True, description="Prioritize vacancies matching rising tech trends")
    pause_on_hover: bool = Field(default=True, description="Pause rotation while hovering on pins")
    hidden_pins: List[str] = Field(default_factory=list, description="List of pin IDs hidden by moderator")


# --- Bulk Moderation & Cleanup ---
class JobBulkDeleteRequest(BaseModel):
    job_ids: List[int] = Field(..., min_length=1, description="List of job IDs to delete")


class JobCleanupExpiredRequest(BaseModel):
    days: int = Field(default=30, ge=1, le=365, description="Threshold age in days for expired postings")


class PinBulkToggleRequest(BaseModel):
    pin_ids: List[str] = Field(..., min_length=1, description="List of pin IDs to toggle")
    action: str = Field(default="hide", pattern="^(hide|unhide)$", description="Action: 'hide' or 'unhide'")


# --- Broadcast Pins (Manual Announcements) ---
class BroadcastPinCreateSchema(BaseModel):
    title: str = Field(..., min_length=3, max_length=300, description="Broadcast title")
    description: str = Field(..., min_length=10, description="Detailed text or announcement body")
    category: str = Field(default="education", pattern="^(education|hackathon|partner_job|announcement)$", description="Broadcast category")
    institution: str = Field(default="Mercantec", max_length=200, description="Issuing entity or department")
    location_name: str = Field(default="Viborg, Denmark", max_length=100, description="City or campus name")
    latitude: float = Field(..., ge=-90.0, le=90.0, description="Latitude coordinate")
    longitude: float = Field(..., ge=-180.0, le=180.0, description="Longitude coordinate")
    url: Optional[str] = Field(default=None, max_length=500, description="Direct URL to registration or details")
    justification: str = Field(..., min_length=10, max_length=1000, description="Moderator reason/purpose for broadcasting")
    expires_at: datetime = Field(..., description="Timestamp when the pin automatically expires and hides")


class BroadcastPinUpdateSchema(BaseModel):
    title: Optional[str] = Field(default=None, min_length=3, max_length=300)
    description: Optional[str] = Field(default=None, min_length=10)
    category: Optional[str] = Field(default=None, pattern="^(education|hackathon|partner_job|announcement)$")
    institution: Optional[str] = Field(default=None, max_length=200)
    location_name: Optional[str] = Field(default=None, max_length=100)
    latitude: Optional[float] = Field(default=None, ge=-90.0, le=90.0)
    longitude: Optional[float] = Field(default=None, ge=-180.0, le=180.0)
    url: Optional[str] = Field(default=None, max_length=500)
    justification: Optional[str] = Field(default=None, min_length=10, max_length=1000)
    expires_at: Optional[datetime] = None
    is_active: Optional[bool] = None


class BroadcastPinSchema(BaseModel):
    id: int
    title: str
    description: str
    category: str
    institution: str
    location_name: str
    latitude: float
    longitude: float
    url: Optional[str] = None
    justification: str
    expires_at: datetime
    is_active: bool
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class AdminAuditLogSchema(BaseModel):
    id: int
    action: str
    entity_type: Optional[str] = None
    entity_id: Optional[str] = None
    details: Optional[Dict[str, Any]] = None
    ip_address: Optional[str] = None
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class AdminAuditLogListResponse(BaseModel):
    items: List[AdminAuditLogSchema]
    total: int
    page: int
    limit: int
    pages: int




