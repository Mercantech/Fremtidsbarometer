import re
from datetime import datetime, timezone
from typing import Optional, List, Tuple, Any, Set

# Tier 1 AI & Cutting-edge Tech keywords (+40%)
TIER1_AI_KEYWORDS = {
    "ai", "artificial intelligence", "llm", "large language model",
    "agent", "agents", "langchain", "llamaindex", "rag", "pytorch",
    "tensorflow", "cuda", "openai", "anthropic", "gpu", "genai",
    "generative ai", "deep learning", "machine learning", "ml", "nlp",
    "computer vision", "prompt engineer", "prompt engineering",
    "diffusion", "transformers", "fine-tuning", "vllm", "ollama",
    "mistral", "claude", "gemini"
}

# Tier 2 High-Demand Modern Tech keywords (+25%)
TIER2_TECH_KEYWORDS = {
    "rust", "kubernetes", "k8s", "golang", "go", "solana", "web3",
    "blockchain", "crypto", "distributed systems", "devops", "cloud architect",
    "microservices", "kafka", "high load"
}

# Pre-compiled word-boundary patterns for short keywords to prevent false positives (e.g. 'ai' in 'chair' or 'gain')
SHORT_KEYWORDS = {"ai", "ml", "go", "rag", "gpu", "k8s", "llm"}
WORD_PATTERNS = {
    kw: re.compile(rf"\b{re.escape(kw)}\b", re.IGNORECASE)
    for kw in SHORT_KEYWORDS
}

def _contains_keyword(text: str, keyword: str) -> bool:
    if not text:
        return False
    if keyword in WORD_PATTERNS:
        return bool(WORD_PATTERNS[keyword].search(text))
    return keyword in text.lower()


def calculate_job_hype_score(
    title: Optional[str] = None,
    technology: Optional[str] = None,
    tags: Optional[List[str]] = None,
    salary_min: Optional[float] = None,
    salary_max: Optional[float] = None,
    salary_currency: Optional[str] = None,
    date: Optional[datetime] = None,
    created_at: Optional[datetime] = None,
    now: Optional[datetime] = None,
    custom_trending_keywords: Optional[Set[str]] = None,
) -> Tuple[float, bool]:
    """
    Computes hype_score (0.0 to 1.0) and is_hot flag for a job posting.
    - Tech Match (up to +0.40): Presence of AI/Agent/Tier1 (0.40) or Modern Tier2 (0.25).
    - Salary Premium (up to +0.35): Verified salary presence (0.15) + above-median/high salary (up to +0.20).
    - Freshness (up to +0.25): < 24h (+0.25), < 72h (+0.15), < 7d (+0.08).
    
    A job is classified as hot (is_hot = True) if hype_score >= 0.50.
    """
    if now is None:
        now = datetime.now(timezone.utc)
    elif now.tzinfo is None:
        now = now.replace(tzinfo=timezone.utc)

    # 1. Tech Match Scoring (0.0 to 0.40)
    tech_score = 0.0
    corpus = " ".join(filter(None, [title, technology] + (tags or []))).lower()

    # Check custom trending keywords first if provided
    matched_tier1 = False
    if custom_trending_keywords:
        for kw in custom_trending_keywords:
            if _contains_keyword(corpus, kw.lower()):
                matched_tier1 = True
                break

    if not matched_tier1:
        for kw in TIER1_AI_KEYWORDS:
            if _contains_keyword(corpus, kw):
                matched_tier1 = True
                break

    if matched_tier1:
        tech_score = 0.40
    else:
        for kw in TIER2_TECH_KEYWORDS:
            if _contains_keyword(corpus, kw):
                tech_score = 0.25
                break

    # 2. Salary Premium Scoring (0.0 to 0.35)
    salary_score = 0.0
    val = None
    if salary_min is not None and salary_max is not None:
        val = (salary_min + salary_max) / 2.0
    elif salary_max is not None:
        val = salary_max
    elif salary_min is not None:
        val = salary_min

    if val is not None and val > 0:
        # Base credit for having transparent verified salary
        salary_score = 0.15

        curr = (salary_currency or "USD").upper().strip()
        # High salary threshold check
        if curr == "USD":
            # Annual: >= 90k is strong, >= 130k is top
            # Monthly: >= 6k is strong, >= 9k is top
            if val >= 120_000 or (val < 20_000 and val >= 9_000):
                salary_score += 0.20
            elif val >= 80_000 or (val < 20_000 and val >= 6_000):
                salary_score += 0.12
            elif val >= 50_000 or (val < 20_000 and val >= 4_000):
                salary_score += 0.06
        elif curr == "EUR":
            if val >= 95_000 or (val < 20_000 and val >= 8_000):
                salary_score += 0.20
            elif val >= 70_000 or (val < 20_000 and val >= 5_500):
                salary_score += 0.12
            elif val >= 45_000 or (val < 20_000 and val >= 3_500):
                salary_score += 0.06
        elif curr == "DKK":
            # DKK annual: 650k+ is senior, 800k+ is lead/executive
            # DKK monthly: 55k+ is senior
            if val >= 750_000 or (val < 100_000 and val >= 60_000):
                salary_score += 0.20
            elif val >= 550_000 or (val < 100_000 and val >= 45_000):
                salary_score += 0.12
            elif val >= 400_000 or (val < 100_000 and val >= 32_000):
                salary_score += 0.06
        elif curr == "UAH":
            # Ukrainian monthly salary in UAH (e.g., 150k+ UAH/mo ~ $3.7k+)
            if val >= 180_000:
                salary_score += 0.20
            elif val >= 120_000:
                salary_score += 0.12
        else:
            # Generic currency fallback
            if val >= 70_000:
                salary_score += 0.15
            elif val >= 40_000:
                salary_score += 0.08

    # 3. Freshness Scoring (0.0 to 0.25)
    freshness_score = 0.0
    job_dt = date or created_at
    if job_dt is not None:
        if job_dt.tzinfo is None:
            job_dt = job_dt.replace(tzinfo=timezone.utc)
        age_seconds = (now - job_dt).total_seconds()
        if age_seconds < 0:
            age_seconds = 0

        hours_old = age_seconds / 3600.0
        if hours_old <= 24:
            freshness_score = 0.25
        elif hours_old <= 72:
            freshness_score = 0.15
        elif hours_old <= 168:  # 7 days
            freshness_score = 0.08
        else:
            freshness_score = 0.0

    raw_score = tech_score + salary_score + freshness_score
    hype_score = round(min(1.0, max(0.0, raw_score)), 2)
    is_hot = hype_score >= 0.50

    return hype_score, is_hot


def enrich_job_posting(job: Any, now: Optional[datetime] = None) -> Any:
    """
    Enriches a JobPosting SQLAlchemy model or dictionary with hype_score and is_hot attributes.
    """
    if isinstance(job, dict):
        score, is_hot = calculate_job_hype_score(
            title=job.get("title"),
            technology=job.get("technology"),
            tags=job.get("tags"),
            salary_min=job.get("salary_min"),
            salary_max=job.get("salary_max"),
            salary_currency=job.get("salary_currency"),
            date=job.get("date"),
            created_at=job.get("created_at"),
            now=now,
        )
        job["hype_score"] = score
        job["is_hot"] = is_hot
        return job

    # SQLAlchemy model instance or Pydantic object
    score, is_hot = calculate_job_hype_score(
        title=getattr(job, "title", None),
        technology=getattr(job, "technology", None),
        tags=getattr(job, "tags", None),
        salary_min=getattr(job, "salary_min", None),
        salary_max=getattr(job, "salary_max", None),
        salary_currency=getattr(job, "salary_currency", None),
        date=getattr(job, "date", None),
        created_at=getattr(job, "created_at", None),
        now=now,
    )
    setattr(job, "hype_score", score)
    setattr(job, "is_hot", is_hot)
    return job
