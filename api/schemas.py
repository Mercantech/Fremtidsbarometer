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
    company: Optional[str]
    url: Optional[str]
    source: Optional[str]
    city: Optional[str]
    technology: Optional[str]
    tags: Optional[List[str]]
    match_score: Optional[float]
    match_reason: Optional[str]
    date: Optional[datetime]
    
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

# --- System Logs ---
class SystemLogSchema(BaseModel):
    id: int
    created_at: datetime
    level: str
    component: str
    message: str
    traceback: Optional[str]
    metadata: Optional[Dict[str, Any]] = Field(
        default=None,
        validation_alias="metadata_"
    )

    model_config = ConfigDict(
        from_attributes=True,
        populate_by_name=True
    )


# --- AI Model Configs ---
class AIModelConfigSchema(BaseModel):
    id: int
    task_type: str
    model_name: str
    provider: str
    is_active: int
    is_fallback: int
    created_at: datetime
    updated_at: datetime
    
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


# --- Data Sources ---
class DataSourceSchema(BaseModel):
    id: int
    name: str
    url: str
    category: str
    source_type: str
    is_active: int
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


class DataSourceCreateSchema(BaseModel):
    name: str
    url: str
    category: str
    source_type: str
    is_active: int = 1


class DataSourceUpdateSchema(BaseModel):
    name: Optional[str] = None
    url: Optional[str] = None
    category: Optional[str] = None
    source_type: Optional[str] = None
    is_active: Optional[int] = None


# --- Source Logs ---
class SourceLogSchema(BaseModel):
    id: int
    data_source_id: int
    error_message: str
    http_status: Optional[int]
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)
