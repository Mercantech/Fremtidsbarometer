import re
from typing import List, Tuple, Optional, Dict, Any

from agents.scrapers.geo_data import COMPANY_DEFAULT_LOCATIONS, LOCATION_PATTERNS
from api.services.job_scoring import calculate_job_hype_score
from utils.logger import get_centralized_logger

logger = get_centralized_logger("JobsHeuristics")

TECH_KEYWORDS = (
    # Core engineering & software development
    "developer", "software", "engineer", "engineering", "programmer", "coder",
    "architect", "fullstack", "full stack", "full-stack", "frontend", "front-end",
    "backend", "back-end", "web dev", "webdev", "mobile dev", "ios", "android",
    
    # Systems, Cloud, DevOps, Infrastructure, SRE
    "cloud", "devops", "platform", "infrastructure", "infra", "sre", "site reliability",
    "sysadmin", "system administrator", "systems", "system", "system architect",
    "kubernetes", "docker", "terraform", "ansible", "aws", "azure", "gcp",
    
    # Data, AI, Machine Learning, Analytics
    "data", "data scientist", "data engineer", "data analyst", "bi analyst",
    "machine learning", "ml engineer", "deep learning", "ai engineer", "ai ", "llm",
    "nlp", "computer vision", "big data", "analytics", "database", "dba",
    
    # QA, Testing, Security, SecOps
    "qa", "quality assurance", "test engineer", "tester", "testing", "automation",
    "sdet", "security", "cybersecurity", "infosec", "soc", "penetration", "pentest",
    "network engineer", "secops", "devsecops",
    
    # Tech leadership & Management
    "cto", "tech lead", "lead developer", "lead engineer", "engineering manager",
    "head of engineering", "vp of engineering", "scrum master", "product owner",
    "product manager", "technical project manager",
    
    # Programming Languages & Stacks (globally recognized)
    "python", "javascript", "typescript", "golang", "rust", "c#", ".net", "c++",
    "java", "scala", "kotlin", "swift", "php", "ruby", "elixir",
    "react", "vue", "angular", "node", "next.js", "django", "fastapi", "spring",
    
    # General IT / Technology indicators
    "it ", "it-", "it specialist", "information technology", "tech ",
    
    # German IT terms (Bund.de, DACH region)
    "entwickler", "softwareentwickler", "webentwickler", "anwendungsentwickler",
    "informatiker", "fachinformatiker", "wirtschaftsinformatiker",
    "systemadministrator", "it-spezialist", "it-administrator", "programmierer",
    
    # Swedish & Nordic IT terms (JobTech SE, Denmark, Norway)
    "utvecklare", "mjukvaruutvecklare", "systemutvecklare", "applikationsutvecklare",
    "systemadministratör", "programmerare", "it-tekniker", "it-konsult",
    "udvikler", "softwareudvikler", "systemkonsulent",
    
    # Ukrainian & Slavic IT terms (Djinni, DOU, Eastern Europe)
    "розробник", "програміст", "інженер", "тестувальник", "аналітик", "архітектор",
    "разработчик", "программист", "тестировщик", "веб-розробник", "девопс", "адміністратор",
    
    # French & Romance terms
    "développeur", "developpeur", "ingénieur logiciel", "architecte logiciel",
    "desarrollador", "ingeniero de software", "programador"
)

EXCLUDE_KEYWORDS = (
    "driver", "warehouse", "officier", "steward", "stewardess", "chef", "cook",
    "cleaning", "skib", "fragt", "matros", "sailor", "marine engineer",
    "maskinmester", "nurse", "læge", "electrician", "mekaniker", "mechanic",
    "welder", "painter", "chauffør", "logistiek", "lager", "speditør", "shunter", "catering",
    # German and European non-IT roles
    "steuerberater", "buchhalter", "vertrieb", "verkäufer", "receptionist",
    "recruiter", "hr manager", "accountant", "sales manager", "sales rep", "praktikant"
)

REMOTE_KEYWORD_PATTERN = re.compile(
    r"\b(remote|віддалено|дистанційно|удаленка|удаленно|hejmearbejde|distans|teletrabajo|télétravail|home\s*office)\b",
    re.IGNORECASE
)

SALARY_PATTERNS = [
    r'[$€£]\s*\d{2,4}k\s*(?:-|to|–)\s*[$€£]?\s*\d{2,4}k',
    r'(?:[$€£]|DKK|SEK|NOK|USD|EUR)\s*\d{1,3}(?:[.,]\d{3})*(?:k)?\s*(?:-|to|–)\s*(?:[$€£]|DKK|SEK|NOK|USD|EUR)?\s*\d{1,3}(?:[.,]\d{3})*(?:k)?(?:\s*(?:DKK|SEK|NOK|USD|EUR|GBP|kr|per month|/mo|/year|yearly))?',
    r'\d{1,3}(?:[.,]\d{3})*(?:k)?\s*(?:-|to|–)\s*\d{1,3}(?:[.,]\d{3})*(?:k)?\s*(?:[$€£]|DKK|SEK|NOK|USD|EUR|GBP|kr)(?:\s*(?:per month|/mo|/year|yearly))?',
]

CURRENCY_USD_RATES = {
    "$": 1.0, "usd": 1.0,
    "€": 1.08, "eur": 1.08,
    "£": 1.28, "gbp": 1.28,
    "dkk": 0.145,
    "sek": 0.096,
    "nok": 0.094,
    "pln": 0.25,
    "kr": 0.145,
    "chf": 1.12,
    "uah": 0.024,
    "грн": 0.024,
}

SALARY_PREFIXES = r"(?:salary|compensation|remuneration|pay|зарплат\w*|ставка|вилка|compensation\s*range|salary\s*range)"

SALARY_RANGE_PATTERN = re.compile(
    r"(?:(?P<prefix>" + SALARY_PREFIXES + r")[\s:]*)?"
    r"(?P<curr1>[$€£]|USD|EUR|GBP|DKK|SEK|NOK|PLN|CHF|UAH|грн)?\s*"
    r"(?P<min>\d+(?:[.,]\d+)?)\s*(?P<k1>[kK]|тыс)?\s*"
    r"(?:-|to|–|—|до)\s*"
    r"(?P<curr2>[$€£]|USD|EUR|GBP|DKK|SEK|NOK|PLN|CHF|UAH|грн)?\s*"
    r"(?P<max>\d+(?:[.,]\d+)?)\s*(?P<k2>[kK]|тыс)?\s*"
    r"(?P<curr3>[$€£]|USD|EUR|GBP|DKK|SEK|NOK|PLN|CHF|UAH|грн|kr)?(?:\s*"
    r"(?P<period>per\s+month|/mo|monthly|місяць|на\s+місяць|/year|yearly|per\s+year|на\s+рік|/yr|annually))?"
    r"(?!\s*(?:years|år|роки|років|року|personer|people|members|employees|days|godt))",
    re.IGNORECASE
)

SALARY_SINGLE_PATTERN = re.compile(
    r"(?:(?P<prefix>" + SALARY_PREFIXES + r"|up to|до|від|from)[\s:]*)"
    r"(?P<curr1>[$€£]|USD|EUR|GBP|DKK|SEK|NOK|PLN|CHF|UAH|грн)?\s*"
    r"(?P<val>\d+(?:[.,]\d+)?)\s*(?P<k>[kK]|тыс)?\s*"
    r"(?P<curr2>[$€£]|USD|EUR|GBP|DKK|SEK|NOK|PLN|CHF|UAH|грн|kr)?(?:\s*"
    r"(?P<period>per\s+month|/mo|monthly|місяць|на\s+місяць|/year|yearly|per\s+year|на\s+рік|/yr|annually))?"
    r"(?!\s*(?:years|år|роки|років|року|personer|people|members|employees|days|godt))",
    re.IGNORECASE
)


def infer_technology(title: str) -> str:
    t = title.lower()
    if any(k in t for k in ["python", "django", "fastapi", "пайтон"]):
        return "Python"
    if any(k in t for k in ["react", "vue", "angular", "frontend", "web dev", "фронтенд", "front-end", "webentwickler"]):
        return "Frontend"
    if any(k in t for k in ["backend", "node", "golang", "rust", "java", "c#", ".net", "бэкенд", "бекенд", "back-end", "systemutvecklare"]):
        return "Backend"
    if any(k in t for k in ["cloud", "devops", "kubernetes", "docker", "aws", "azure", "sre", "platform", "девопс", "systemadministrator", "systemadministratör", "it-administrator"]):
        return "Cloud & DevOps"
    if any(k in t for k in ["data", "machine learning", "ai ", "bi ", "scientist", "штучний інтелект", "дата"]):
        return "Data & AI"
    if any(k in t for k in ["security", "cyber", "infosec", "soc", "кібербезпека", "безопасность"]):
        return "Cybersecurity"
    if any(k in t for k in ["qa", "test", "quality", "тестувальник", "тестировщик", "manual qa", "automation"]):
        return "QA & Testing"
    return "Software Engineering"


def infer_seniority(title: str, description: str = "") -> str:
    combined = (title + " " + description[:400]).lower()
    if any(w in combined for w in ["lead", "principal", "staff", "head of", "director", "architect", "manager", "tech lead", "тімлід", "тім лід", "тім-лід"]):
        return "lead"
    if any(w in combined for w in ["senior", "sr.", "sr ", "experienced", "specialist", "сеньйор", "синьор", "сеньор"]):
        return "senior"
    if any(w in combined for w in ["junior", "jr.", "jr ", "intern", "trainee", "entry level", "student", "graduate", "associate", "джуніор", "джун", "інтерн", "стажер"]):
        return "junior"
    return "mid"


def infer_location(
    title: str,
    description: str = "",
    company_domain: str = "",
    extra_hint: str = "",
    source_hint: str = ""
) -> Tuple[str, str]:
    """
    Infers (country, city) from job title, description, feed metadata and company identity.
    Priority:
    1. Physical city / country match in text or extra feed tags.
    2. Company headquarters default location.
    3. Source-level geographical indicator (e.g., Ukrainian aggregator Djinni -> UA/Kyiv).
    4. Fallback to GLOBAL/Remote.
    """
    search_text = f"{title} {extra_hint} {description[:1200]}".lower()

    # 1. Look for explicit physical city / country match in title, tags, or description
    for pattern, loc in LOCATION_PATTERNS:
        if re.search(pattern, search_text):
            return loc

    # 2. Company headquarters mapping
    if company_domain:
        clean_domain = company_domain.lower().strip()
        if clean_domain in COMPANY_DEFAULT_LOCATIONS:
            return COMPANY_DEFAULT_LOCATIONS[clean_domain]

    # 3. Source hint mapping (e.g., Ukrainian job boards like Djinni, DOU, Jobicy geo hints)
    if source_hint:
        s_lower = source_hint.lower()
        if any(w in s_lower for w in ["djinni", "dou", "ukraine", "україна", "украина", ".ua"]):
            return ("UA", "Kyiv")
        if any(w in s_lower for w in ["denmark", "danmark", "danish", ".dk"]):
            return ("DK", "Copenhagen")
        if any(w in s_lower for w in ["norway", "norge", ".no"]):
            return ("NO", "Oslo")
        if any(w in s_lower for w in ["sweden", "swedish", "sverige", ".se", "jobtech"]):
            return ("SE", "Stockholm")
        if any(w in s_lower for w in ["germany", "german", "deutschland", ".de", "bund.de"]):
            return ("DE", "Berlin")
        if any(w in s_lower for w in ["poland", "polska", ".pl"]):
            return ("PL", "Warsaw")
        if any(w in s_lower for w in ["finland", ".fi"]):
            return ("FI", "Helsinki")
        if any(w in s_lower for w in ["france", "french", ".fr"]):
            return ("FR", "Paris")
        if any(w in s_lower for w in ["netherlands", "dutch", "holland", ".nl"]):
            return ("NL", "Amsterdam")
        if any(w in s_lower for w in ["czech", "czechia", ".cz"]):
            return ("CZ", "Prague")
        if any(w in s_lower for w in ["austria", "österreich", ".at"]):
            return ("AT", "Vienna")
        if any(w in s_lower for w in ["switzerland", "schweiz", "suisse", ".ch"]):
            return ("CH", "Zurich")
        if any(w in s_lower for w in ["united kingdom", "britain", "uk", ".uk"]):
            return ("UK", "London")
        if any(w in s_lower for w in ["united states", "usa", "us"]):
            return ("US", "San Francisco")

    # 4. Default fallback
    return ("GLOBAL", "Remote")


def extract_salary(text: str) -> Optional[str]:
    for pattern in SALARY_PATTERNS:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            return match.group(0).strip()
    return None


def _parse_salary_number(raw_val: str, has_k: bool, peer_val: float = 0.0) -> float:
    cleaned = raw_val.replace(" ", "").replace(",", "")
    val = float(cleaned)
    if has_k:
        val *= 1000.0
    elif val < 1000.0 and peer_val >= 10000.0:
        val *= 1000.0
    return val


def parse_numeric_salary(text: str) -> Tuple[Optional[float], Optional[float], Optional[str]]:
    """
    Extracts numeric min, max and currency from text, normalizing to annualized USD for cross-border analytics.
    Strictly verifies presence of currency symbol/code, 'k' suffix, or salary keyword to reject
    false positives such as years of experience, team sizes, or dates.
    Returns (salary_min, salary_max, 'USD') or (None, None, None).
    """
    if not text:
        return None, None, None
    text_clean = text.replace("\xa0", " ")

    # 1. Range matching
    for m in SALARY_RANGE_PATTERN.finditer(text_clean):
        c1, c2, c3 = m.group("curr1"), m.group("curr2"), m.group("curr3")
        k1, k2 = bool(m.group("k1")), bool(m.group("k2"))
        pref = m.group("prefix")
        curr_str = c1 or c2 or c3

        # Must have either explicit currency, 'k' suffix, or explicit salary prefix
        if not (curr_str or k1 or k2 or pref):
            continue

        curr_key = (curr_str or "$").lower().strip()
        rate = CURRENCY_USD_RATES.get(curr_key, 1.0)

        try:
            raw_min = m.group("min")
            raw_max = m.group("max")
            val_max = _parse_salary_number(raw_max, k2)
            val_min = _parse_salary_number(raw_min, k1, peer_val=val_max)
            if k2 and not k1 and val_min < 1000:
                val_min *= 1000
        except ValueError:
            continue

        period = (m.group("period") or "").lower()
        is_monthly = (
            any(x in period for x in ["month", "mo", "місяць"]) or
            (val_max <= 15000 and "year" not in period and "рік" not in period and rate >= 0.9)
        )
        if is_monthly:
            val_min *= 12
            val_max *= 12

        usd_min = round(val_min * rate, -2)
        usd_max = round(val_max * rate, -2)
        if usd_min > usd_max:
            usd_min, usd_max = usd_max, usd_min

        # Realistic annualized bounds check: $15k to $600k USD with reasonable spread
        if 15000 <= usd_min <= 600000 and 15000 <= usd_max <= 600000 and usd_min >= usd_max * 0.25:
            return float(usd_min), float(usd_max), "USD"

    # 2. Single value matching (e.g. "Up to $120,000" or "від $3500 на місяць")
    for m in SALARY_SINGLE_PATTERN.finditer(text_clean):
        c1, c2 = m.group("curr1"), m.group("curr2")
        k = bool(m.group("k"))
        curr_str = c1 or c2
        if not (curr_str or k):
            continue

        curr_key = (curr_str or "$").lower().strip()
        rate = CURRENCY_USD_RATES.get(curr_key, 1.0)
        try:
            val = _parse_salary_number(m.group("val"), k)
        except ValueError:
            continue

        period = (m.group("period") or "").lower()
        is_monthly = (
            any(x in period for x in ["month", "mo", "місяць"]) or
            (val <= 15000 and "year" not in period and "рік" not in period and rate >= 0.9)
        )
        if is_monthly:
            val *= 12

        usd_val = round(val * rate, -2)
        if 15000 <= usd_val <= 600000:
            return float(round(usd_val * 0.9, -2)), float(usd_val), "USD"

    return None, None, None


def calculate_match_score(title: str, description: str, tech_category: str) -> Tuple[float, str]:
    """
    Evaluates role match score using the centralized job scoring engine.
    """
    hype_score, is_hot = calculate_job_hype_score(
        title=title,
        technology=tech_category,
        tags=[tech_category.lower()]
    )
    score = round(72.0 + (hype_score * 24.0), 1)
    reason = f"Identified {tech_category} role (match index: {score}%, hot={is_hot})"
    return score, reason
