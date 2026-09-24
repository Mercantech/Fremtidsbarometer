import pytest
from agents.scrapers.jobs_scraper import (
    infer_technology,
    infer_seniority,
    infer_location,
    calculate_match_score,
    extract_salary,
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

def test_infer_seniority():
    assert infer_seniority("Lead Cloud Infrastructure Architect") == "lead"
    assert infer_seniority("Principal Software Engineer") == "lead"
    assert infer_seniority("Senior Fullstack Developer") == "senior"
    assert infer_seniority("Sr. Backend Engineer") == "senior"
    assert infer_seniority("Junior Software Developer") == "junior"
    assert infer_seniority("Student Worker / Intern in Data") == "junior"
    assert infer_seniority("Software Engineer") == "mid"

def test_infer_location():
    # Explicit city in title/description
    assert infer_location("Python Dev", "Office in Aarhus, Denmark", "dfds") == ("DK", "Aarhus")
    assert infer_location("Python Dev", "Office in Copenhagen headquarters", "dfds") == ("DK", "Copenhagen")
    assert infer_location("Cloud Architect", "Location: Stockholm, Sweden", "polestar") == ("SE", "Stockholm")
    assert infer_location("DevOps Engineer", "Based in Oslo headquarters", "netnordic") == ("NO", "Oslo")
    assert infer_location("Frontend Lead", "Berlin tech center", "vitecsoftware") == ("DE", "Berlin")
    assert infer_location("Backend Engineer", "100% Remote position", "dfds") == ("GLOBAL", "Remote")
    
    # Fallback to company headquarters
    assert infer_location("Software Engineer", "", "bankdata") == ("DK", "Silkeborg")
    assert infer_location("Platform Engineer", "", "polestar") == ("SE", "Gothenburg")
    assert infer_location("Systems Engineer", "", "puzzel") == ("NO", "Oslo")

def test_extract_salary():
    assert extract_salary("Competitive salary: 55,000 - 75,000 DKK per month") is not None
    assert extract_salary("Base compensation: $120k - $160k depending on level") is not None
    assert extract_salary("Salary range: €60,000 - €85,000 yearly") is not None
    assert extract_salary("Standard company pension and healthcare plan.") is None

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

