from datetime import datetime, timezone
from database.models import SalaryData
from sqlalchemy.dialects.postgresql import insert

BASE_SALARIES = [
    ("Data & AI", 165000, "AI / Machine Learning Engineer"),
    ("Cloud & DevOps", 150000, "Cloud / Platform Engineer"),
    ("Python", 145000, "Senior Python Developer"),
    ("Backend", 140000, "Backend Systems Engineer"),
    ("Rust", 155000, "Systems Engineer (Rust)"),
    ("Go", 148000, "Go Microservices Developer"),
    ("Frontend", 130000, "Frontend Engineer (React/TypeScript)"),
    ("Cybersecurity", 142000, "Security / SecOps Engineer"),
    ("Software Engineering", 138000, "Software Engineer")
]

COUNTRY_MULTIPLIERS = {
    "US": 1.0,
    "DK": 0.72,
    "NO": 0.70,
    "DE": 0.65,
    "SE": 0.62
}

def seed_salary_data(session):
    """Seeds salary benchmark records for supported countries."""
    print("💰 Seeding Salary Benchmarks (DK, US, DE, SE, NO)...")
    records = []
    now_utc = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    
    for country, mult in COUNTRY_MULTIPLIERS.items():
        for tech, us_median, role in BASE_SALARIES:
            median_val = round(us_median * mult, -2)
            p25_val = round(median_val * 0.82, -2)
            p75_val = round(median_val * 1.25, -2)
            
            records.append({
                "technology": tech,
                "country": country,
                "source": "levels_fyi",
                "date": now_utc,
                "median": float(median_val),
                "p25": float(p25_val),
                "p75": float(p75_val),
                "currency": "USD",
                "role": role,
                "status": "published"
            })
            
    try:
        stmt = insert(SalaryData).values(records)
        stmt = stmt.on_conflict_do_nothing(
            index_elements=["technology", "country", "source", "date"]
        )
        session.execute(stmt)
        session.commit()
        print(f"✅ Seeded {len(records)} salary benchmarks across {len(COUNTRY_MULTIPLIERS)} countries.")
    except Exception as e:
        session.rollback()
        print(f"❌ Error seeding salaries: {e}")
