import pytest
from agents.scrapers.jobs_scraper import (
    infer_technology,
    infer_seniority,
    infer_location,
    calculate_match_score,
    extract_salary,
    parse_numeric_salary,
    TECH_KEYWORDS,
    EXCLUDE_KEYWORDS
)

def test_infer_technology():
    assert infer_technology("Senior Python / Django Backend Developer") == "Python"
    assert infer_technology("React & TypeScript Frontend Engineer") == "Frontend"
    assert infer_technology("Golang Distributed Systems Engineer") == "Backend"
    assert infer_technology("Kubernetes Platform / DevOps Specialist") == "Cloud & DevOps"
    assert infer_technology("Machine Learning & AI Research Scientist") == "Data & AI"
    assert infer_technology("Information Security & SOC Analyst") == "Cybersecurity"
    assert infer_technology("QA Automation Test Engineer") == "QA & Testing"
    assert infer_technology("General Software Engineer") == "Software Engineering"
    # Cyrillic / Ukrainian tech titles
    assert infer_technology("Розробник Python / Django") == "Python"
    assert infer_technology("Тестувальник QA Automation") == "QA & Testing"

def test_infer_seniority():
    assert infer_seniority("Lead Cloud Infrastructure Architect") == "lead"
    assert infer_seniority("Principal Software Engineer") == "lead"
    assert infer_seniority("Senior Fullstack Developer") == "senior"
    assert infer_seniority("Sr. Backend Engineer") == "senior"
    assert infer_seniority("Junior Software Developer") == "junior"
    assert infer_seniority("Student Worker / Intern in Data") == "junior"
    assert infer_seniority("Software Engineer") == "mid"
    # Cyrillic seniority titles
    assert infer_seniority("Сеньйор розробник") == "senior"
    assert infer_seniority("Тімлід бекенд команди") == "lead"
    assert infer_seniority("Джуніор інженер") == "junior"

def test_infer_location():
    # Explicit city in title/description (English)
    assert infer_location("Python Dev", "Office in Aarhus, Denmark", "dfds") == ("DK", "Aarhus")
    assert infer_location("Python Dev", "Office in Copenhagen headquarters", "dfds") == ("DK", "Copenhagen")
    assert infer_location("Cloud Architect", "Location: Stockholm, Sweden", "polestar") == ("SE", "Stockholm")
    assert infer_location("DevOps Engineer", "Based in Oslo headquarters", "netnordic") == ("NO", "Oslo")
    assert infer_location("Frontend Lead", "Berlin tech center", "vitecsoftware") == ("DE", "Berlin")

    # Ukrainian cities in English and Cyrillic (bidirectional: city implies UA without mentioning country)
    assert infer_location("Python Dev", "Офіс у Києві, можливий гібрид", "") == ("UA", "Kyiv")
    assert infer_location("Data Engineer", "Локація: Львів", "") == ("UA", "Lviv")
    assert infer_location("React Dev", "Kharkiv office", "") == ("UA", "Kharkiv")
    assert infer_location("Go Engineer", "Одеса, центр", "") == ("UA", "Odesa")
    assert infer_location("DevOps", "Дніпро або віддалено", "") == ("UA", "Dnipro")
    assert infer_location("Backend", "Вінниця, офіс", "") == ("UA", "Vinnytsia")
    assert infer_location("Frontend", "Тернопіль, центр", "") == ("UA", "Ternopil")
    assert infer_location("QA Engineer", "Івано-Франківськ", "") == ("UA", "Ivano-Frankivsk")
    assert infer_location("Mobile Dev", "Ужгород офіс", "") == ("UA", "Uzhhorod")
    assert infer_location("Security Dev", "Рівне або гібрид", "") == ("UA", "Rivne")
    assert infer_location("Systems Dev", "Чернігів центр", "") == ("UA", "Chernihiv")

    # European cities in Cyrillic (city implies European country without mentioning country)
    assert infer_location("Rust Dev", "Варшава", "") == ("PL", "Warsaw")
    assert infer_location("Java Dev", "Краків центр", "") == ("PL", "Krakow")
    assert infer_location("C# Engineer", "Мюнхен tech hub", "") == ("DE", "Munich")
    assert infer_location("Frontend Lead", "Берлін офіс", "") == ("DE", "Berlin")
    assert infer_location("AI Engineer", "Копенгаген центр", "") == ("DK", "Copenhagen")

    # Smart Remote handling: binds to headquarters if company known, else source hint, else GLOBAL
    assert infer_location("Backend Engineer", "100% Remote position", "dfds") == ("DK", "Copenhagen")
    assert infer_location("Frontend Engineer", "Повністю віддалено", "grammarly") == ("UA", "Kyiv")
    assert infer_location("DevOps Specialist", "Віддалена робота", "", "", "Djinni: Python Jobs") == ("UA", "Kyiv")
    assert infer_location("Cloud Engineer", "Remote work", "", "", "DOU: DevOps Vacancies (Ukraine)") == ("UA", "Kyiv")
    assert infer_location("Fullstack Dev", "100% Remote, no office", "unknown_corp") == ("GLOBAL", "Remote")
    
    # Fallback to company headquarters
    assert infer_location("Software Engineer", "", "bankdata") == ("DK", "Silkeborg")
    assert infer_location("Platform Engineer", "", "polestar") == ("SE", "Gothenburg")
    assert infer_location("Systems Engineer", "", "puzzel") == ("NO", "Oslo")

def test_extract_salary():
    assert extract_salary("Competitive salary: 55,000 - 75,000 DKK per month") is not None
    assert extract_salary("Base compensation: $120k - $160k depending on level") is not None
    assert extract_salary("Salary range: €60,000 - €85,000 yearly") is not None
    assert extract_salary("Standard company pension and healthcare plan.") is None

def test_parse_numeric_salary():
    # Danish DKK monthly range -> annualized USD
    dkk_min, dkk_max, curr = parse_numeric_salary("Competitive salary: 55,000 - 75,000 DKK per month")
    assert curr == "USD"
    assert dkk_min is not None and dkk_max is not None
    assert 90000 <= dkk_min <= 100000
    assert 125000 <= dkk_max <= 135000

    # US Annual $120k - $160k
    us_min, us_max, curr = parse_numeric_salary("Base compensation: $120k - $160k depending on level")
    assert curr == "USD"
    assert us_min == 120000.0
    assert us_max == 160000.0

    # Ukrainian / Remote $3000 - $5000 monthly
    ua_min, ua_max, curr = parse_numeric_salary("Salary: $3000 - $5000 / month")
    assert curr == "USD"
    assert ua_min == 36000.0
    assert ua_max == 60000.0

    # Ukrainian / Cyrillic range "Зарплатна вилка: 2500 - 4000 USD"
    ua_range_min, ua_range_max, curr = parse_numeric_salary("Зарплатна вилка: 2500 - 4000 USD")
    assert curr == "USD"
    assert ua_range_min == 30000.0
    assert ua_range_max == 48000.0

    # EUR yearly
    eu_min, eu_max, curr = parse_numeric_salary("€60,000 - €85,000 yearly")
    assert curr == "USD"
    assert 60000 <= eu_min <= 70000
    assert 85000 <= eu_max <= 95000

    # Single value matching
    single_min, single_max, curr = parse_numeric_salary("Salary up to €80,000")
    assert curr == "USD"
    assert 75000 <= single_min <= 80000
    assert 85000 <= single_max <= 90000

    # False positive rejections: Must NOT parse team sizes, experience, or dates as salary
    assert parse_numeric_salary("Team of 6-12 personer in our department") == (None, None, None)
    assert parse_numeric_salary("Requires 3-5 years of experience with Python") == (None, None, None)
    assert parse_numeric_salary("Senior Developer (5-7 years experience, 1-2 junior mentees)") == (None, None, None)
    assert parse_numeric_salary("Academic year 2024-2025") == (None, None, None)
    assert parse_numeric_salary("Standard company pension.") == (None, None, None)

def test_calculate_match_score():
    score, reason = calculate_match_score("Senior Python Software Engineer", "Experienced in cloud and backend", "Python")
    assert 70.0 <= score <= 98.0
    assert "Python" in reason

def test_non_tech_exclusion():
    titles = [
        "Class 1 HGV Driver - Nights",
        "Leidinggevende Warehouse",
        "Elève Officier Polyvalent/Pont/Machine",
        "Stewardesse/steward til DFDS fragtskib",
        "Køkkenchef / Chef kok",
    ]
    for title in titles:
        t_lower = title.lower()
        has_exclude = any(ex in t_lower for ex in EXCLUDE_KEYWORDS)
        assert has_exclude is True

def test_salary_job_classification():
    from agents.scrapers.salary_scraper import _classify_job
    assert _classify_job("Senior Machine Learning Engineer", ["ai", "python"]) == "Data & AI"
    assert _classify_job("Lead DevOps Specialist", ["kubernetes", "aws"]) == "Cloud & DevOps"
    assert _classify_job("Python Backend Developer", ["fastapi"]) == "Python"
    assert _classify_job("React Native Frontend Engineer", ["typescript"]) == "Frontend"
    assert _classify_job("Low-level Systems Programmer", ["rust"]) == "Rust"
    assert _classify_job("Golang Microservices Developer", ["go"]) == "Go"
    assert _classify_job("Security Operations Analyst", ["cyber"]) == "Cybersecurity"

def test_german_and_european_non_tech_exclusion():
    titles = [
        "Steuerberater (m/w/d) in Vollzeit",
        "Buchhalter / Accountant",
        "Vertriebsmitarbeiter im Außendienst",
        "Verkäufer / Retail Sales Assistant",
        "Recruiter / Talent Acquisition Specialist",
        "Praktikant im Bereich Empfang / Receptionist",
    ]
    for title in titles:
        t_lower = title.lower()
        has_exclude = any(ex in t_lower for ex in EXCLUDE_KEYWORDS)
        assert has_exclude is True, f"Failed to exclude: {title}"

def test_scrape_jobs_export():
    from agents.scrapers import scrape_jobs, scrape_teamtailor_jobs
    assert callable(scrape_jobs)
    assert scrape_jobs == scrape_teamtailor_jobs

def test_news_agent_isolation():
    from agents.news_agent import NewsAgent
    agent = NewsAgent()
    assert agent.primary_rss.startswith("https://news.google.com")
    assert any("TechCrunch" in name for name, _ in agent.fallback_rss)

