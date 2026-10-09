import asyncio
import logging
import httpx
import feedparser
import re
from datetime import datetime, timezone
from typing import List, Tuple, Optional, Dict, Any

from database.models import RawScrapeData, SourceLog, JobPosting, ATSCompany, DataSource, AIModelConfig, SystemLog
from api.schemas import JobExtractionPayload, ExtractedJob
from agents.ai_provider import analyze_with_fallback, AIProviderError
from utils.logger import get_centralized_logger
from sqlalchemy.dialects.postgresql import insert as pg_insert

logger = get_centralized_logger("JobsScraper")

def seed_ats_companies(db):
    """Seed the DB with initial ATS companies if empty."""
    if db.query(ATSCompany).count() == 0:
        seeds = ["netnordic", "dfds", "securitas", "gire", "polestar", "bankdata", "puzzel", "vitecsoftware", "envidan"]
        for domain in seeds:
            db.add(ATSCompany(domain=domain, ats_type="teamtailor"))
        db.commit()
        logger.info("Seeded initial ATS companies.")

TECH_KEYWORDS = (
    "developer", "software", "engineer", "data", "cloud", "devops", "architect",
    "security", "fullstack", "frontend", "backend", "system", "it ", "tech",
    "qa", "tester", "programmer", "analyst", "product", "scrum", "ai ", "machine learning",
    "python", "java", "react", "c#", ".net", "c++", "rust", "golang", "kubernetes", "aws", "azure",
    # Ukrainian, Russian & Eastern European tech terms
    "розробник", "програміст", "інженер", "тестувальник", "аналітик", "архітектор",
    "разработчик", "программист", "инженер", "тестировщик", "аналитик", "веб-розробник"
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

COMPANY_DEFAULT_LOCATIONS = {
    # Nordic Tech & ATS
    "netnordic": ("NO", "Oslo"),
    "dfds": ("DK", "Copenhagen"),
    "securitas": ("SE", "Stockholm"),
    "gire": ("NO", "Oslo"),
    "polestar": ("SE", "Gothenburg"),
    "bankdata": ("DK", "Silkeborg"),
    "puzzel": ("NO", "Oslo"),
    "vitecsoftware": ("SE", "Umeå"),
    "envidan": ("DK", "Silkeborg"),
    "labster": ("DK", "Copenhagen"),
    "podimo": ("DK", "Copenhagen"),
    "lunar": ("DK", "Aarhus"),
    "vivino": ("DK", "Copenhagen"),
    "tibber": ("SE", "Stockholm"),
    # Ukrainian Tech Ecosystem
    "grammarly": ("UA", "Kyiv"),
    "macpaw": ("UA", "Kyiv"),
    "ajax": ("UA", "Kyiv"),
    "genesis": ("UA", "Kyiv"),
    "softserve": ("UA", "Lviv"),
    "epam": ("UA", "Kyiv"),
    "luxoft": ("UA", "Kyiv"),
    "globallogic": ("UA", "Kyiv"),
    "intellias": ("UA", "Lviv"),
    "eleks": ("UA", "Lviv"),
    "ciklum": ("UA", "Kyiv"),
    "sigma": ("UA", "Kharkiv"),
    "n-ix": ("UA", "Lviv"),
    # European Tech Hubs
    "spotify": ("SE", "Stockholm"),
    "klarna": ("SE", "Stockholm"),
    "asml": ("NL", "Amsterdam"),
    "booking": ("NL", "Amsterdam"),
    "adyen": ("NL", "Amsterdam"),
    "deliveryhero": ("DE", "Berlin"),
    "zalando": ("DE", "Berlin"),
    "sap": ("DE", "Munich"),
    "revolut": ("UK", "London"),
    "monzo": ("UK", "London"),
    "deepmind": ("UK", "London"),
    "allegro": ("PL", "Warsaw"),
    "cdprojekt": ("PL", "Warsaw"),
}

# Mapping: Regex pattern -> (CountryCode, CanonicalEnglishCity)
# Comprehensive coverage of Ukraine, Western, Northern, Central and Eastern Europe
LOCATION_PATTERNS = [
    # ── Ukraine (Cities & Country) with grammatical inflections ──
    (r"\b(kyiv|kiev|ки[їєе]в\w*)\b", ("UA", "Kyiv")),
    (r"\b(lviv|lvov|льв[ііоо]в\w*)\b", ("UA", "Lviv")),
    (r"\b(kharkiv|kharkov|харк[ііоо]в\w*)\b", ("UA", "Kharkiv")),
    (r"\b(odesa|odessa|одес\w*)\b", ("UA", "Odesa")),
    (r"\b(dnipro|dnepr|dnepropetrovsk|дн[іе]пр\w*)\b", ("UA", "Dnipro")),
    (r"\b(zaporizhzhia|zaporozhye|запор[ііoо]ж\w*)\b", ("UA", "Zaporizhzhia")),
    (r"\b(vinnytsia|vinnitsa|в[іи]нниц\w*)\b", ("UA", "Vinnytsia")),
    (r"\b(poltava|полтав\w*)\b", ("UA", "Poltava")),
    (r"\b(chernihiv|chernigov|черн[ііoо]г\w*)\b", ("UA", "Chernihiv")),
    (r"\b(cherkasy|cherkassy|черкас\w*)\b", ("UA", "Cherkasy")),
    (r"\b(ivano-frankivsk|івано-франк\w*|ивано-франк\w*)\b", ("UA", "Ivano-Frankivsk")),
    (r"\b(uzhhorod|uzhgorod|ужгород\w*)\b", ("UA", "Uzhhorod")),
    (r"\b(ternopil|ternopol|терноп[ііоо]л\w*)\b", ("UA", "Ternopil")),
    (r"\b(lutsk|луцьк\w*|луцк\w*)\b", ("UA", "Lutsk")),
    (r"\b(rivne|rovno|р[ііoо]вн\w*)\b", ("UA", "Rivne")),
    (r"\b(mykolaiv|nikolaev|микола[їєе]в\w*|николаев\w*)\b", ("UA", "Mykolaiv")),
    (r"\b(zhytomyr|zhitomir|житомир\w*)\b", ("UA", "Zhytomyr")),
    (r"\b(chernivtsi|chernovtsy|черн[ііoо]вц\w*)\b", ("UA", "Chernivtsi")),
    (r"\b(khmelnytskyi|khmelnitsky|хмельниц\w*)\b", ("UA", "Khmelnytskyi")),
    (r"\b(sumy|сум[иа]\w*)\b", ("UA", "Sumy")),
    (r"\b(kryvyi\s*rih|krivoy\s*rog|крив\w*\s*р[ііoо]г\w*)\b", ("UA", "Kryvyi Rih")),
    (r"\b(ukraine|укра[їи]н\w*)\b", ("UA", "Kyiv")),

    # ── Poland ──
    (r"\b(warsaw|warszawa|варшав\w*)\b", ("PL", "Warsaw")),
    (r"\b(krak[óo]w|крак[ііоо]в\w*)\b", ("PL", "Krakow")),
    (r"\b(wroc[łl]aw|вроцлав\w*)\b", ("PL", "Wroclaw")),
    (r"\b(gda[ńn]sk|гданськ\w*|гданьск\w*)\b", ("PL", "Gdansk")),
    (r"\b(pozna[ńn]|познан\w*)\b", ("PL", "Poznan")),
    (r"\b([łl][óo]d[źz]|лодз\w*)\b", ("PL", "Lodz")),
    (r"\b(katowice|катов[іі]ц\w*)\b", ("PL", "Katowice")),
    (r"\b(poland|polska|польщ\w*|польш\w*)\b", ("PL", "Warsaw")),

    # ── Germany ──
    (r"\b(berlin|берл[іі]н\w*)\b", ("DE", "Berlin")),
    (r"\b(munich|münchen|мюнхен\w*)\b", ("DE", "Munich")),
    (r"\b(hamburg|гамбург\w*)\b", ("DE", "Hamburg")),
    (r"\b(frankfurt|франкфурт\w*)\b", ("DE", "Frankfurt")),
    (r"\b(cologne|k[öo]ln|кельн\w*)\b", ("DE", "Cologne")),
    (r"\b(stuttgart|штутгарт\w*)\b", ("DE", "Stuttgart")),
    (r"\b(d[üu]sseldorf|дюссельдорф\w*)\b", ("DE", "Dusseldorf")),
    (r"\b(germany|deutschland|н[іе]меччин\w*|германи\w*)\b", ("DE", "Berlin")),

    # ── Denmark ──
    (r"\b(copenhagen|københavn|копенгаген\w*)\b", ("DK", "Copenhagen")),
    (r"\b(aarhus|århus|орхус\w*)\b", ("DK", "Aarhus")),
    (r"\b(odense|оденсе)\b", ("DK", "Odense")),
    (r"\b(aalborg|ålborg|ольборг)\b", ("DK", "Aalborg")),
    (r"\b(silkeborg|сількеборг\w*)\b", ("DK", "Silkeborg")),
    (r"\b(denmark|danmark|дан[іі]я\w*)\b", ("DK", "Copenhagen")),

    # ── Sweden ──
    (r"\b(stockholm|стокгольм\w*)\b", ("SE", "Stockholm")),
    (r"\b(gothenburg|göteborg|гетеборг\w*|гётеборг\w*)\b", ("SE", "Gothenburg")),
    (r"\b(malm[öo]|мальм[её]\w*)\b", ("SE", "Malmö")),
    (r"\b(uppsala|уппсал\w*)\b", ("SE", "Uppsala")),
    (r"\b(ume[åa]|умео)\b", ("SE", "Umeå")),
    (r"\b(sweden|sverige|швец[іі]я\w*)\b", ("SE", "Stockholm")),

    # ── Norway ──
    (r"\b(oslo|осло)\b", ("NO", "Oslo")),
    (r"\b(bergen|берген\w*)\b", ("NO", "Bergen")),
    (r"\b(trondheim|тронхейм\w*)\b", ("NO", "Trondheim")),
    (r"\b(stavanger|ставангер\w*)\b", ("NO", "Stavanger")),
    (r"\b(norway|norge|норвег[іі]я\w*)\b", ("NO", "Oslo")),

    # ── Finland ──
    (r"\b(helsinki|[гх]ельс[іи]нк\w*)\b", ("FI", "Helsinki")),
    (r"\b(tampere|тампере)\b", ("FI", "Tampere")),
    (r"\b(espoo|еспоо)\b", ("FI", "Espoo")),
    (r"\b(finland|suomi|ф[іи]нлянд[іі]я\w*)\b", ("FI", "Helsinki")),

    # ── United Kingdom ──
    (r"\b(london|лондон\w*)\b", ("UK", "London")),
    (r"\b(manchester|манчестер\w*)\b", ("UK", "Manchester")),
    (r"\b(edinburgh|единбург\w*|эдинбург\w*)\b", ("UK", "Edinburgh")),
    (r"\b(birmingham|б[іи]рм[іи]нгем\w*)\b", ("UK", "Birmingham")),
    (r"\b(glasgow|глазго)\b", ("UK", "Glasgow")),
    (r"\b(united\s*kingdom|uk|britain|великобритан[іі]я\w*)\b", ("UK", "London")),

    # ── France ──
    (r"\b(paris|париж\w*)\b", ("FR", "Paris")),
    (r"\b(lyon|л[іи]он\w*)\b", ("FR", "Lyon")),
    (r"\b(marseille|марсел\w*)\b", ("FR", "Marseille")),
    (r"\b(toulouse|тулуз\w*)\b", ("FR", "Toulouse")),
    (r"\b(nice|н[іи]цц\w*)\b", ("FR", "Nice")),
    (r"\b(france|франц[іі]я\w*)\b", ("FR", "Paris")),

    # ── Netherlands ──
    (r"\b(amsterdam|амстердам\w*)\b", ("NL", "Amsterdam")),
    (r"\b(rotterdam|роттердам\w*)\b", ("NL", "Rotterdam")),
    (r"\b(utrecht|утрехт\w*)\b", ("NL", "Utrecht")),
    (r"\b(eindhoven|ейнд[гх]овен\w*|эйнд[гх]овен\w*)\b", ("NL", "Eindhoven")),
    (r"\b(the\s*hague|den\s*haag|гааг\w*)\b", ("NL", "The Hague")),
    (r"\b(netherlands|holland|н[іи]дерланд\w*)\b", ("NL", "Amsterdam")),

    # ── Switzerland ──
    (r"\b(zurich|zürich|цюрих\w*)\b", ("CH", "Zurich")),
    (r"\b(geneva|genève|женев\w*)\b", ("CH", "Geneva")),
    (r"\b(basel|базел\w*)\b", ("CH", "Basel")),
    (r"\b(bern|берн\w*)\b", ("CH", "Bern")),
    (r"\b(switzerland|schweiz|suisse|швейцар[іі]я\w*)\b", ("CH", "Zurich")),

    # ── Austria ──
    (r"\b(vienna|wien|в[іе]д[еі]н\w*|вен[ае]\w*)\b", ("AT", "Vienna")),
    (r"\b(graz|грац\w*)\b", ("AT", "Graz")),
    (r"\b(austria|österreich|австр[іі]я\w*)\b", ("AT", "Vienna")),

    # ── Ireland ──
    (r"\b(dublin|дубл[іі]н\w*)\b", ("IE", "Dublin")),
    (r"\b(cork|корк\w*)\b", ("IE", "Cork")),
    (r"\b(ireland|[іи]рланд[іі]я\w*)\b", ("IE", "Dublin")),

    # ── Spain ──
    (r"\b(madrid|мадрид\w*)\b", ("ES", "Madrid")),
    (r"\b(barcelona|барселон\w*)\b", ("ES", "Barcelona")),
    (r"\b(valencia|валенс[іі]я\w*)\b", ("ES", "Valencia")),
    (r"\b(malaga|málaga|малаг\w*)\b", ("ES", "Malaga")),
    (r"\b(spain|españa|[іи]спан[іі]я\w*)\b", ("ES", "Madrid")),

    # ── Portugal ──
    (r"\b(lisbon|lisboa|л[іі]сабон\w*|лиссабон\w*)\b", ("PT", "Lisbon")),
    (r"\b(porto|порту)\b", ("PT", "Porto")),
    (r"\b(portugal|португал[іі]я\w*)\b", ("PT", "Lisbon")),

    # ── Italy ──
    (r"\b(rome|roma|рим\w*)\b", ("IT", "Rome")),
    (r"\b(milan|milano|м[іі]лан\w*)\b", ("IT", "Milan")),
    (r"\b(italy|italia|[іи]тал[іі]я\w*)\b", ("IT", "Rome")),

    # ── Czechia & Slovakia ──
    (r"\b(prague|praha|праг\w*)\b", ("CZ", "Prague")),
    (r"\b(brno|брно)\b", ("CZ", "Brno")),
    (r"\b(czech\s*republic|czechia|cesko|чех[іі]я\w*)\b", ("CZ", "Prague")),
    (r"\b(bratislava|братислав\w*)\b", ("SK", "Bratislava")),
    (r"\b(slovakia|slovensko|словаччин\w*|словаки\w*)\b", ("SK", "Bratislava")),

    # ── Hungary, Romania, Bulgaria ──
    (r"\b(budapest|будапешт\w*)\b", ("HU", "Budapest")),
    (r"\b(hungary|magyarország|угорщин\w*|венгри\w*)\b", ("HU", "Budapest")),
    (r"\b(bucharest|bucurești|бухарест\w*)\b", ("RO", "Bucharest")),
    (r"\b(cluj|клуж\w*)\b", ("RO", "Cluj-Napoca")),
    (r"\b(romania|românia|румун[іі]я\w*)\b", ("RO", "Bucharest")),
    (r"\b(sofia|соф[іі]я\w*|соф[іі][їе]й?\w*)\b", ("BG", "Sofia")),
    (r"\b(bulgaria|болгар[іі]я\w*)\b", ("BG", "Sofia")),

    # ── Baltics ──
    (r"\b(tallinn|талл[іі]н\w*)\b", ("EE", "Tallinn")),
    (r"\b(estonia|eesti|естон[іі]я\w*)\b", ("EE", "Tallinn")),
    (r"\b(riga|риг\w*)\b", ("LV", "Riga")),
    (r"\b(latvia|latvija|латв[іі]я\w*)\b", ("LV", "Riga")),
    (r"\b(vilnius|в[іі]льнюс\w*)\b", ("LT", "Vilnius")),
    (r"\b(lithuania|lietuva|литв\w*)\b", ("LT", "Vilnius")),

    # ── Belgium, Greece, Cyprus ──
    (r"\b(brussels|bruxelles|брюссел\w*)\b", ("BE", "Brussels")),
    (r"\b(belgium|belgique|belgië|бельг[іі]я\w*)\b", ("BE", "Brussels")),
    (r"\b(athens|аф[іі]н\w*)\b", ("GR", "Athens")),
    (r"\b(greece|грец[іі]я\w*)\b", ("GR", "Athens")),
    (r"\b(limassol|л[іи]масол\w*)\b", ("CY", "Limassol")),
    (r"\b(cyprus|к[іи]пр\w*)\b", ("CY", "Limassol")),

    # ── North America ──
    (r"\b(san\s*francisco|bay\s*area|silicon\s*valley)\b", ("US", "San Francisco")),
    (r"\b(new\s*york|nyc)\b", ("US", "New York")),
    (r"\b(seattle)\b", ("US", "Seattle")),
    (r"\b(austin)\b", ("US", "Austin")),
    (r"\b(boston)\b", ("US", "Boston")),
    (r"\b(chicago)\b", ("US", "Chicago")),
    (r"\b(los\s*angeles)\b", ("US", "Los Angeles")),
    (r"\b(toronto)\b", ("CA", "Toronto")),
    (r"\b(vancouver)\b", ("CA", "Vancouver")),
    (r"\b(usa|united\s*states|сша)\b", ("US", "New York")),
]

REMOTE_KEYWORD_PATTERN = re.compile(
    r"\b(remote|віддалено|дистанційно|удаленка|удаленно|hejmearbejde|distans|teletrabajo|télétravail|home\s*office)\b",
    re.IGNORECASE
)

SALARY_PATTERNS = [
    r'[$€£]\s*\d{2,4}k\s*(?:-|to|–)\s*[$€£]?\s*\d{2,4}k',
    r'(?:[$€£]|DKK|SEK|NOK|USD|EUR)\s*\d{1,3}(?:[.,]\d{3})*(?:k)?\s*(?:-|to|–)\s*(?:[$€£]|DKK|SEK|NOK|USD|EUR)?\s*\d{1,3}(?:[.,]\d{3})*(?:k)?(?:\s*(?:DKK|SEK|NOK|USD|EUR|GBP|kr|per month|/mo|/year|yearly))?',
    r'\d{1,3}(?:[.,]\d{3})*(?:k)?\s*(?:-|to|–)\s*\d{1,3}(?:[.,]\d{3})*(?:k)?\s*(?:[$€£]|DKK|SEK|NOK|USD|EUR|GBP|kr)(?:\s*(?:per month|/mo|/year|yearly))?',
]

def infer_technology(title: str) -> str:
    t = title.lower()
    if any(k in t for k in ["python", "django", "fastapi", "пайтон"]):
        return "Python"
    if any(k in t for k in ["react", "vue", "angular", "frontend", "web dev", "фронтенд", "front-end"]):
        return "Frontend"
    if any(k in t for k in ["backend", "node", "golang", "rust", "java", "c#", ".net", "бэкенд", "бекенд", "back-end"]):
        return "Backend"
    if any(k in t for k in ["cloud", "devops", "kubernetes", "docker", "aws", "azure", "sre", "platform", "девопс"]):
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

    # 3. Source hint mapping (e.g., Ukrainian job boards like Djinni, DOU)
    if source_hint:
        s_lower = source_hint.lower()
        if any(w in s_lower for w in ["djinni", "dou", "ukraine", "україна", "украина", ".ua"]):
            return ("UA", "Kyiv")
        if any(w in s_lower for w in ["denmark", "danmark", "danish", ".dk"]):
            return ("DK", "Copenhagen")
        if any(w in s_lower for w in ["norway", "norge", ".no"]):
            return ("NO", "Oslo")
        if any(w in s_lower for w in ["sweden", "sverige", ".se"]):
            return ("SE", "Stockholm")
        if any(w in s_lower for w in ["germany", "deutschland", ".de"]):
            return ("DE", "Berlin")
        if any(w in s_lower for w in ["poland", "polska", ".pl"]):
            return ("PL", "Warsaw")
        if any(w in s_lower for w in ["finland", ".fi"]):
            return ("FI", "Helsinki")

    # 4. Default fallback
    return ("GLOBAL", "Remote")

def extract_salary(text: str) -> Optional[str]:
    for pattern in SALARY_PATTERNS:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            return match.group(0).strip()
    return None

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
    t_lower = (title + " " + description[:600]).lower()
    matched = [k for k in TECH_KEYWORDS if k in t_lower]
    base_score = 72.0 + min(len(matched) * 3.5, 20.0)
    score = round(min(base_score, 98.0), 1)
    reason = f"Identified {tech_category} role (signals: {', '.join(matched[:3])})"
    return score, reason


async def extract_jobs_with_ai(
    raw_job_items: List[Dict[str, Any]],
    db=None
) -> Optional[List[Dict[str, Any]]]:
    """
    Stage 1: jobs_extraction.
    Sends candidate vacancies to the configured LLM (resolved from DB via AIModelConfig)
    for structured fact extraction with mandatory grounded quotations and source URLs.

    Returns list of validated job dictionaries if successful.
    Returns None if AI fails or returns invalid schema, triggering seamless fallback to regex/heuristic parsing.
    """
    if not raw_job_items:
        return []

    # 1. Resolve active AI model and fallbacks from DB
    try:
        from agents.orchestrator import get_active_model
        active_config = get_active_model(db, "jobs_extraction") if db else {"provider": "google", "model_name": "gemini-3.8-flash"}
    except Exception as e:
        logger.warning(f"Failed to query active model for jobs_extraction: {e}")
        active_config = {"provider": "google", "model_name": "gemini-3.8-flash"}

    candidates = [active_config]
    if db:
        try:
            fallback_recs = db.query(AIModelConfig).filter(
                AIModelConfig.task_type == "jobs_extraction",
                AIModelConfig.is_fallback == 1,
                AIModelConfig.is_active == 0
            ).all()
            for fb in fallback_recs:
                if not any(c.get("model_name") == fb.model_name and c.get("provider") == fb.provider for c in candidates):
                    candidates.append({
                        "provider": fb.provider,
                        "model_name": fb.model_name,
                    })
        except Exception as e:
            logger.warning(f"Could not load fallback models from DB: {e}")

    if not any(c.get("model_name") == "gemini-3.8-flash" for c in candidates):
        candidates.append({"provider": "google", "model_name": "gemini-3.8-flash"})

    # Process items in batches of up to 15
    batch_size = 15
    all_grounded_jobs = []

    for b_idx in range(0, len(raw_job_items), batch_size):
        batch = raw_job_items[b_idx:b_idx + batch_size]

        # 2. Build structured input text for the prompt
        text_blocks = []
        url_to_raw = {}
        for idx, item in enumerate(batch):
            url = item.get("url") or item.get("link") or ""
            title = item.get("title") or ""
            comp = item.get("company") or ""
            loc_hint = item.get("location_hint") or ""
            desc = item.get("description") or ""
            snippet = desc[:1500]
            url_to_raw[url] = f"{title} {comp} {loc_hint} {desc}"

            text_blocks.append(
                f"--- VACANCY #{idx+1} ---\n"
                f"URL: {url}\n"
                f"TITLE: {title}\n"
                f"COMPANY: {comp}\n"
                f"LOCATION_HINT: {loc_hint}\n"
                f"RAW_TEXT:\n{snippet}\n"
            )

        prompt = (
            "You are an expert IT Talent & Compensation Analyst.\n"
            "Your task is to extract structured tech job postings strictly from the provided raw vacancies.\n\n"
            "STRICT EXTRACTION RULES:\n"
            "1. Every extracted job MUST contain `source_url` (must exactly match one of the input URLs) and a verbatim `quote` (10-500 characters) from the raw text proving the vacancy, role, or salary.\n"
            "2. Do NOT hallucinate salaries or tech. If salary is not disclosed in the text, leave salary_min, salary_max, salary_currency as null.\n"
            "3. Normalize country to ISO-2 code (e.g. DK, UA, DE, SE, NO, US, UK, PL) or 'GLOBAL'/'REMOTE'. Normalize city if mentioned.\n"
            "4. Extract key technologies as an array of strings in `technologies`.\n"
            "5. Return ONLY valid JSON matching this schema:\n"
            "{\n"
            '  "jobs": [\n'
            '    {\n'
            '      "source_url": "https://...",\n'
            '      "quote": "verbatim text excerpt from vacancy",\n'
            '      "title": "Clean Job Title",\n'
            '      "company": "Company Name",\n'
            '      "country": "DK",\n'
            '      "city": "Copenhagen",\n'
            '      "technologies": ["Python", "Docker"],\n'
            '      "seniority": "Senior",\n'
            '      "salary_min": null,\n'
            '      "salary_max": null,\n'
            '      "salary_currency": null\n'
            '    }\n'
            '  ]\n'
            "}\n\n"
            "RAW INPUT VACANCIES:\n" + "\n".join(text_blocks)
        )

        schema_instruction = 'Root JSON object with "jobs" key containing array of ExtractedJob objects.'

        try:
            result, meta = await analyze_with_fallback(candidates, prompt, schema_instruction, return_meta=True)
            if not isinstance(result, dict):
                logger.warning(f"AI jobs_extraction: Expected dict from AI model, got {type(result)}")
                return []
            payload = JobExtractionPayload(**result)

            # Grounding & citation verification: verify that quote and source_url exist in raw text
            grounded_jobs = []
            for job in payload.jobs:
                if not job.source_url or job.source_url not in url_to_raw:
                    logger.warning(f"AI jobs_extraction: Dropping job with ungrounded URL {job.source_url}")
                    continue
                if len(job.quote.strip()) < 10:
                    logger.warning(f"AI jobs_extraction: Dropping job with short quote: '{job.quote}'")
                    continue

                # Verify quote is actually present in raw input text (anti-hallucination check)
                clean_quote = re.sub(r"\s+", " ", job.quote.strip().lower())
                clean_raw = re.sub(r"\s+", " ", url_to_raw[job.source_url].lower())
                quote_sample = clean_quote[:min(25, len(clean_quote))]
                if quote_sample not in clean_raw and clean_quote not in clean_raw:
                    logger.warning(f"AI jobs_extraction: Dropping job because quote '{job.quote[:40]}' not grounded in source text.")
                    continue

                grounded_jobs.append(job.model_dump())

            all_grounded_jobs.extend(grounded_jobs)

            # Log AI token usage and cost to SystemLog
            if db:
                try:
                    sys_log = SystemLog(
                        level="INFO",
                        component="AIExtractor-jobs_extraction",
                        message=(
                            f"AI jobs_extraction succeeded with {meta.get('provider')}/{meta.get('model_name')}. "
                            f"Extracted {len(grounded_jobs)} grounded vacancies. "
                            f"Tokens: {meta.get('prompt_tokens', 0)}+{meta.get('completion_tokens', 0)} "
                            f"(${meta.get('cost_usd', 0.0):.6f})"
                        ),
                        metadata_={
                            "task_type": "jobs_extraction",
                            "model": meta.get("model_name"),
                            "provider": meta.get("provider"),
                            "prompt_tokens": meta.get("prompt_tokens", 0),
                            "completion_tokens": meta.get("completion_tokens", 0),
                            "cost_usd": meta.get("cost_usd", 0.0),
                            "fallback_used": meta.get("fallback_used", False),
                            "items_extracted": len(grounded_jobs),
                            "status": "success"
                        }
                    )
                    db.add(sys_log)
                    db.commit()
                except Exception as log_err:
                    db.rollback()
                    logger.warning(f"Failed to save AI usage log: {log_err}")

        except Exception as e:
            logger.warning(
                f"AI jobs_extraction failed: {e}. Gracefully falling back to heuristic/regex parser."
            )
            if db:
                try:
                    sys_log = SystemLog(
                        level="WARNING",
                        component="AIExtractor-jobs_extraction",
                        message=f"AI jobs_extraction failed ({e}). Falling back to heuristic/regex parser.",
                        metadata_={"task_type": "jobs_extraction", "status": "fallback", "error": str(e)}
                    )
                    db.add(sys_log)
                    db.commit()
                except Exception:
                    db.rollback()
            return None

    return all_grounded_jobs


async def _scrape_job_api_source(src: DataSource, db) -> int:
    """
    Parses modern JSON API job endpoints (e.g. Arbeitnow European tech board, RemoteOK).
    Extracts tech roles, normalizes location across European tech hubs,
    discovers salary disclosures, and saves structured JobPostings and RawScrapeData.
    """
    url = src.url
    logger.info(f"Fetching job API [{src.name}]: {url}")
    headers = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36 Fremtidsbarometer/1.0"
    }
    async with httpx.AsyncClient(headers=headers, timeout=15.0) as client:
        try:
            resp = await client.get(url)
            if resp.status_code != 200:
                logger.warning(f"Failed to fetch job API [{src.name}]: HTTP {resp.status_code}")
                return 0

            c_type = resp.headers.get("content-type", "").lower()
            if "application/json" not in c_type and not url.endswith(".json"):
                logger.warning(f"Job API endpoint [{src.name}] returned non-JSON ({c_type}), skipping API parser.")
                return 0

            data = resp.json()
        except Exception as e:
            logger.warning(f"Error requesting job API [{src.name}]: {e}")
            return 0

    raw_items = []
    source_slug = "arbeitnow" if "arbeitnow" in url else "job_api"
    if isinstance(data, dict) and "data" in data and isinstance(data["data"], list):
        raw_items = data["data"]
        source_slug = "arbeitnow"
    elif isinstance(data, list):
        raw_items = [i for i in data if isinstance(i, dict)]
        source_slug = "remoteok" if "remoteok" in url else "job_api"

    if not raw_items:
        return 0

    candidates = []
    candidate_links = []
    for item in raw_items:
        title = (item.get("title") or item.get("position") or "").strip()
        link = (item.get("url") or item.get("link") or "").strip()
        if not title or not link:
            continue

        t_lower = title.lower()
        if any(ex in t_lower for ex in EXCLUDE_KEYWORDS):
            continue
        if not any(k in t_lower for k in TECH_KEYWORDS):
            continue

        company = (item.get("company_name") or item.get("company") or "").strip() or "Tech Enterprise"
        raw_desc = (item.get("description") or "").strip()
        clean_desc = re.sub(r"<[^>]+>", " ", raw_desc)
        clean_desc = re.sub(r"\s+", " ", clean_desc).strip()

        loc_hint = (item.get("location") or "").strip()
        is_remote = bool(item.get("remote"))

        sal_min_direct = item.get("salary_min")
        sal_max_direct = item.get("salary_max")

        candidates.append({
            "title": title,
            "company": company,
            "link": link,
            "description": clean_desc,
            "loc_hint": loc_hint,
            "is_remote": is_remote,
            "tags": item.get("tags") or [],
            "sal_min_direct": float(sal_min_direct) if isinstance(sal_min_direct, (int, float)) and sal_min_direct > 0 else None,
            "sal_max_direct": float(sal_max_direct) if isinstance(sal_max_direct, (int, float)) and sal_max_direct > 0 else None,
        })
        candidate_links.append(link)

    if not candidate_links:
        return 0

    existing_job_map = {
        r[0]: r[1] for r in db.query(JobPosting.url, JobPosting.salary_min).filter(JobPosting.url.in_(candidate_links)).all()
    }

    # Stage 1: AI-powered extraction with strict grounding
    items_for_ai = [
        {
            "url": c["link"],
            "title": c["title"],
            "company": c["company"],
            "location_hint": c["loc_hint"],
            "description": c["description"]
        }
        for c in candidates
        if c["link"] not in existing_job_map or existing_job_map[c["link"]] is None
    ]
    ai_results = await extract_jobs_with_ai(items_for_ai, db)
    ai_map = {j["source_url"]: j for j in ai_results} if ai_results is not None else {}

    new_jobs = []
    new_raw_entries = []
    for c in candidates:
        link = c["link"]
        is_existing = link in existing_job_map
        if is_existing and existing_job_map[link] is not None:
            continue

        ai_job = ai_map.get(link)

        title = c["title"]
        desc = c["description"]
        company = c["company"]
        loc_hint = c["loc_hint"]

        tech_category = infer_technology(title)
        seniority = infer_seniority(title, desc)
        country, city = infer_location(
            title=title,
            description=desc,
            company_domain=company.lower().replace(" ", "")[:50],
            extra_hint=loc_hint,
            source_hint=f"{src.name} {url}"
        )
        score, reason = calculate_match_score(title, desc, tech_category)

        full_job_text = f"{title} {loc_hint} {desc}"
        salary_text = extract_salary(full_job_text)
        salary_min, salary_max, salary_curr = parse_numeric_salary(full_job_text)

        if salary_min is None and c["sal_min_direct"] and c["sal_max_direct"]:
            salary_min = float(c["sal_min_direct"])
            salary_max = float(c["sal_max_direct"])
            salary_curr = "USD"
            salary_text = f"${salary_min:,.0f} - ${salary_max:,.0f} USD"

        is_remote = c["is_remote"] or bool(REMOTE_KEYWORD_PATTERN.search(full_job_text))

        tags = [seniority, tech_category.lower(), source_slug]
        if is_remote:
            tags.append("remote")
        if salary_text or salary_min is not None:
            tags.append("salary_disclosed")

        grounded_quote = None
        if ai_job:
            if ai_job.get("title"):
                title = ai_job["title"]
            if ai_job.get("company"):
                company = ai_job["company"]
            if ai_job.get("country"):
                country = ai_job["country"]
            if ai_job.get("city"):
                city = ai_job["city"]
            if ai_job.get("seniority"):
                seniority = ai_job["seniority"]
            if ai_job.get("technologies"):
                tech_category = ai_job["technologies"][0] if ai_job["technologies"] else tech_category
                for t in ai_job["technologies"]:
                    t_str = str(t).lower()
                    if t_str not in tags:
                        tags.append(t_str)
            if ai_job.get("salary_min") is not None and salary_min is None:
                salary_min = float(ai_job["salary_min"])
                salary_max = float(ai_job["salary_max"]) if ai_job.get("salary_max") is not None else salary_min
                salary_curr = ai_job.get("salary_currency") or "EUR"
                salary_text = f"{salary_curr} {salary_min:,.0f} - {salary_max:,.0f}"
                if "salary_disclosed" not in tags:
                    tags.append("salary_disclosed")
            tags.append("ai_extracted")
            grounded_quote = ai_job.get("quote")

        if is_existing:
            if salary_min is not None:
                db.query(JobPosting).filter(JobPosting.url == link).update({
                    "salary_min": salary_min,
                    "salary_max": salary_max,
                    "salary_currency": salary_curr,
                    "tags": tags,
                }, synchronize_session=False)
            continue

        formatted_job = (
            f"COMPANY: {company}\n"
            f"JOB_TITLE: {title}\n"
            f"CATEGORY: {tech_category}\n"
            f"SENIORITY: {seniority}\n"
            f"LOCATION: {city}, {country}\n"
            f"URL: {link}\n"
        )
        if grounded_quote:
            formatted_job += f"GROUNDED_QUOTE: {grounded_quote}\n"
        if salary_text:
            formatted_job += f"SALARY: {salary_text}\n"
        formatted_job += f"DESCRIPTION:\n{desc[:2500]}"

        new_raw_entries.append(RawScrapeData(
            source_id=src.id,
            country_code=country,
            raw_text=formatted_job,
            extracted_urls=[link],
            processed=0,
            created_at=datetime.now(timezone.utc)
        ))

        new_jobs.append({
            "title": title[:500],
            "company": company[:200],
            "url": link[:1000],
            "source": source_slug,
            "country": country,
            "city": city,
            "technology": tech_category,
            "tags": tags,
            "salary_min": salary_min,
            "salary_max": salary_max,
            "salary_currency": salary_curr,
            "date": datetime.now(timezone.utc),
            "match_score": score,
            "match_reason": reason,
            "status": "published"
        })

    saved = 0
    if new_raw_entries:
        db.add_all(new_raw_entries)
    if new_jobs:
        deduped = []
        seen = set()
        for j in new_jobs:
            k = (j["title"], j["company"], j["source"])
            if k not in seen:
                seen.add(k)
                deduped.append(j)

        stmt = pg_insert(JobPosting).values(deduped)
        stmt = stmt.on_conflict_do_update(
            index_elements=["title", "company", "source"],
            set_={
                "salary_min": stmt.excluded.salary_min,
                "salary_max": stmt.excluded.salary_max,
                "salary_currency": stmt.excluded.salary_currency,
                "tags": stmt.excluded.tags,
            }
        )
        db.execute(stmt)
        saved = len(deduped)
    db.commit()
    logger.info(f"Saved {saved} jobs from API source [{src.name}].")
    return saved


async def scrape_teamtailor_jobs(db, source_id: int = None) -> int:
    """
    Parses active job sources registered in data_sources (both RSS feeds and JSON APIs).
    Filters for genuine tech/IT positions, extracts location & seniority across Europe,
    discovers salary disclosures, and saves structured JobPostings and RawScrapeData.
    """
    query = db.query(DataSource)
    if source_id:
        query = query.filter(DataSource.id == source_id)
    else:
        query = query.filter(
            DataSource.category == "jobs",
            DataSource.is_active == 1
        )
    active_sources = query.all()

    if not active_sources:
        logger.info("No active job data sources found in database. Skipping jobs sweep.")
        return 0

    saved_count = 0
    
    for src in active_sources:
        rss_url = src.url or ""

        # Skip misclassified social or discussion feeds
        if "watercooler" in rss_url.lower():
            logger.info(f"Skipping non-job discussion feed [{src.name}].")
            continue

        # ── JSON API Dispatch (e.g. Arbeitnow, RemoteOK) ──
        is_api = (
            getattr(src, "source_type", "rss") == "api"
            and not rss_url.endswith(".rss")
            and "/rss" not in rss_url
            and "feed" not in rss_url
        )
        if is_api:
            try:
                api_saved = await _scrape_job_api_source(src, db)
                saved_count += api_saved
            except Exception as e:
                logger.warning(f"Error scraping job API [{src.name}]: {e}")
            continue

        logger.info(f"Fetching job RSS [{src.name}]: {rss_url}")
        
        try:
            feed = await asyncio.to_thread(feedparser.parse, rss_url)
            entries = getattr(feed, "entries", [])
            if not entries:
                continue

            src_lower = (src.name + " " + rss_url).lower()
            if "djinni" in src_lower:
                source_slug = "djinni"
            elif "dou" in src_lower:
                source_slug = "dou"
            elif "teamtailor" in src_lower:
                source_slug = "teamtailor"
            else:
                source_slug = src.name.split(":")[0].strip().lower().replace(" ", "_")[:30]

            domain_match = re.search(r"https?://([^.]+)\.teamtailor\.com", rss_url)
            company_domain = domain_match.group(1) if domain_match else src.name.lower().replace(" ", "")[:50]
            clean_company = src.name.replace("TeamTailor: ", "").replace("Djinni: ", "").replace("DOU: ", "").split("(")[0].strip()[:200]
            
            # 1. Filter for tech jobs and exclude irrelevant non-tech roles
            candidate_entries = []
            candidate_links = []
            for entry in entries:
                title = entry.get("title", "").strip()
                link = entry.get("link", "").strip()
                if not title or not link:
                    continue
                title_lower = title.lower()
                
                # Exclude obvious non-tech trades
                if any(ex in title_lower for ex in EXCLUDE_KEYWORDS):
                    continue
                    
                # Ensure it contains technical keywords
                if not any(k in title_lower for k in TECH_KEYWORDS):
                    continue
                    
                candidate_entries.append(entry)
                candidate_links.append(link)

            if not candidate_links:
                continue

            # 2. Batch check existing URLs (1 query instead of N queries)
            existing_job_map = {
                r[0]: r[1] for r in db.query(JobPosting.url, JobPosting.salary_min).filter(JobPosting.url.in_(candidate_links)).all()
            }

            # 3. Stage 1: AI jobs_extraction with strict grounding
            items_for_ai = []
            for entry in candidate_entries:
                el_link = entry.get("link", "").strip()
                if el_link in existing_job_map and existing_job_map[el_link] is not None:
                    continue
                el_desc = (entry.get("description") or entry.get("summary") or "").strip()
                clean_d = re.sub(r"<[^>]+>", " ", el_desc)
                clean_d = re.sub(r"\s+", " ", clean_d).strip()
                items_for_ai.append({
                    "url": el_link,
                    "title": entry.get("title", "").strip(),
                    "company": clean_company,
                    "location_hint": " ".join([str(entry.get(f, "")) for f in ["location", "geo_location"] if entry.get(f)]),
                    "description": clean_d
                })

            ai_results = await extract_jobs_with_ai(items_for_ai, db)
            ai_map = {j["source_url"]: j for j in ai_results} if ai_results is not None else {}

            # 4. Insert new records or enrich existing postings lacking salary
            new_jobs = []
            new_raw_entries = []
            for entry in candidate_entries:
                link = entry.get("link", "").strip()
                is_existing = link in existing_job_map
                if is_existing and existing_job_map[link] is not None:
                    continue

                ai_job = ai_map.get(link)

                title = entry.get("title", "").strip()
                description = entry.get("description", "").strip()
                if not description:
                    description = entry.get("summary", "").strip()

                # Extract extra location hints from feed entry tags and metadata
                hint_parts = []
                for tag_field in ["location", "geo_location", "author", "category"]:
                    val = entry.get(tag_field)
                    if val:
                        hint_parts.append(str(val))
                for t_item in entry.get("tags", []):
                    if isinstance(t_item, dict) and t_item.get("term"):
                        hint_parts.append(str(t_item["term"]))
                    elif isinstance(t_item, str):
                        hint_parts.append(t_item)
                extra_hint = " ".join(hint_parts)

                # Try to extract company name from entry author or feed if not Teamtailor
                candidate_company = clean_company
                if entry.get("author") and len(entry.get("author", "")) > 1:
                    candidate_company = entry.get("author").strip()[:200]

                # Specialized parsing for Ukrainian job boards (DOU & Djinni)
                if source_slug == "dou":
                    if " в " in title:
                        parts = title.split(" в ", 1)
                        if len(parts) == 2:
                            parsed_title = parts[0].strip()
                            comp_and_loc = parts[1].strip()
                            loc_tokens = [tok.strip() for tok in comp_and_loc.split(",") if tok.strip()]
                            if loc_tokens:
                                extracted_comp = loc_tokens[0]
                                if len(loc_tokens) > 1 and loc_tokens[1].lower() in ["inc.", "inc", "llc", "ltd"]:
                                    extracted_comp = f"{loc_tokens[0]}, {loc_tokens[1]}"
                                    extra_hint += " " + " ".join(loc_tokens[2:])
                                else:
                                    extra_hint += " " + " ".join(loc_tokens[1:])
                                candidate_company = extracted_comp
                                title = parsed_title
                    if not candidate_company or any(v in candidate_company.lower() for v in ["vacancies", "вакансії"]):
                        candidate_company = "Tech Company (via DOU)"

                elif source_slug == "djinni":
                    m_comp = re.search(r"<strong>\s*([^<]+?)\s*</strong>\s*(?:—|–|-|is\b|шукає|запрошує)", description, re.IGNORECASE)
                    if m_comp:
                        c_candidate = m_comp.group(1).replace("&nbsp;", " ").strip()
                        if 1 < len(c_candidate) < 40 and c_candidate.lower() not in ["looking", "hiring", "searching", "proud", "вакансія", "опис"]:
                            candidate_company = c_candidate
                    if not candidate_company or any(v in candidate_company.lower() for v in ["vacancies", "all tech jobs", "вакансії"]):
                        candidate_company = "Tech Company (via Djinni)"

                tech_category = infer_technology(title)
                seniority = infer_seniority(title, description)
                country, city = infer_location(
                    title=title,
                    description=description,
                    company_domain=company_domain,
                    extra_hint=extra_hint,
                    source_hint=f"{src.name} {rss_url}"
                )
                if country == "GLOBAL" and getattr(src, "country_code", None) and src.country_code != "GLOBAL":
                    country = src.country_code

                score, reason = calculate_match_score(title, description, tech_category)
                full_job_text = f"{title} {extra_hint} {description}"
                salary_text = extract_salary(full_job_text)
                salary_min, salary_max, salary_curr = parse_numeric_salary(full_job_text)
                
                is_remote = bool(REMOTE_KEYWORD_PATTERN.search(full_job_text))

                tags = [seniority, tech_category.lower(), source_slug]
                if is_remote:
                    tags.append("remote")
                if salary_text or salary_min is not None:
                    tags.append("salary_disclosed")

                grounded_quote = None
                if ai_job:
                    if ai_job.get("title"):
                        title = ai_job["title"]
                    if ai_job.get("company"):
                        candidate_company = ai_job["company"]
                    if ai_job.get("country"):
                        country = ai_job["country"]
                    if ai_job.get("city"):
                        city = ai_job["city"]
                    if ai_job.get("seniority"):
                        seniority = ai_job["seniority"]
                    if ai_job.get("technologies"):
                        tech_category = ai_job["technologies"][0] if ai_job["technologies"] else tech_category
                        for t in ai_job["technologies"]:
                            t_str = str(t).lower()
                            if t_str not in tags:
                                tags.append(t_str)
                    if ai_job.get("salary_min") is not None and salary_min is None:
                        salary_min = float(ai_job["salary_min"])
                        salary_max = float(ai_job["salary_max"]) if ai_job.get("salary_max") is not None else salary_min
                        salary_curr = ai_job.get("salary_currency") or "EUR"
                        salary_text = f"{salary_curr} {salary_min:,.0f} - {salary_max:,.0f}"
                        if "salary_disclosed" not in tags:
                            tags.append("salary_disclosed")
                    tags.append("ai_extracted")
                    grounded_quote = ai_job.get("quote")

                if is_existing:
                    if salary_min is not None:
                        db.query(JobPosting).filter(JobPosting.url == link).update({
                            "salary_min": salary_min,
                            "salary_max": salary_max,
                            "salary_currency": salary_curr,
                            "tags": tags,
                        }, synchronize_session=False)
                    continue
                
                formatted_job = (
                    f"COMPANY: {candidate_company}\n"
                    f"JOB_TITLE: {title}\n"
                    f"CATEGORY: {tech_category}\n"
                    f"SENIORITY: {seniority}\n"
                    f"LOCATION: {city}, {country}\n"
                    f"URL: {link}\n"
                )
                if grounded_quote:
                    formatted_job += f"GROUNDED_QUOTE: {grounded_quote}\n"
                if salary_text:
                    formatted_job += f"SALARY: {salary_text}\n"
                formatted_job += f"DESCRIPTION:\n{description[:2500]}"
                
                new_raw_entries.append(RawScrapeData(
                    source_id=src.id,
                    country_code=country,
                    raw_text=formatted_job,
                    extracted_urls=[link],
                    processed=0,
                    created_at=datetime.now(timezone.utc)
                ))

                new_jobs.append({
                    "title": title[:500],
                    "company": candidate_company,
                    "url": link[:1000],
                    "source": source_slug,
                    "country": country,
                    "city": city,
                    "technology": tech_category,
                    "tags": tags,
                    "salary_min": salary_min,
                    "salary_max": salary_max,
                    "salary_currency": salary_curr,
                    "date": datetime.now(timezone.utc),
                    "match_score": score,
                    "match_reason": reason,
                    "status": "published"
                })

            if new_raw_entries:
                db.add_all(new_raw_entries)
            if new_jobs:
                # Deduplicate within batch by (title, company, source)
                deduped_jobs = []
                seen_keys = set()
                for j in new_jobs:
                    key = (j["title"], j["company"], j["source"])
                    if key not in seen_keys:
                        seen_keys.add(key)
                        deduped_jobs.append(j)

                stmt = pg_insert(JobPosting).values(deduped_jobs)
                stmt = stmt.on_conflict_do_update(
                    index_elements=["title", "company", "source"],
                    set_={
                        "salary_min": stmt.excluded.salary_min,
                        "salary_max": stmt.excluded.salary_max,
                        "salary_currency": stmt.excluded.salary_currency,
                        "tags": stmt.excluded.tags,
                    }
                )
                db.execute(stmt)
                saved_count += len(deduped_jobs)
                
            db.commit()

            # Auto-heal: on successful scrape, clear previous failure logs for this source
            try:
                db.query(SourceLog).filter(SourceLog.data_source_id == src.id).delete(synchronize_session=False)
                db.commit()
            except Exception:
                pass
        except Exception as e:
            logger.error(f"Error scraping ATS [{src.name}]: {e}")
            db.rollback()
            try:
                db.add(SourceLog(data_source_id=src.id, error_message=str(e)[:500]))
                db.commit()
            except Exception:
                db.rollback()

    logger.info(f"Jobs sweep finished. Saved {saved_count} tech jobs across {len(active_sources)} sources.")
    return saved_count

# Universal alias for job ingestion
scrape_jobs = scrape_teamtailor_jobs


async def scrape_single_job_source(src: DataSource, db) -> int:
    """Convenience helper to scrape a single registered job DataSource."""
    return await scrape_teamtailor_jobs(db, source_id=src.id)

