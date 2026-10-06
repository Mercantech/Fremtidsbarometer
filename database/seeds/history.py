from datetime import datetime, timezone
import random
from database.models import TechTrend
from sqlalchemy.dialects.postgresql import insert

LANGUAGES_HISTORY = {
    "COBOL": {"start": 1960, "peak": 1975, "current": 2},
    "Fortran": {"start": 1960, "peak": 1980, "current": 3},
    "C": {"start": 1972, "peak": 1995, "current": 40},
    "C++": {"start": 1985, "peak": 2005, "current": 60},
    "Python": {"start": 1991, "peak": 2025, "current": 100},
    "Java": {"start": 1995, "peak": 2012, "current": 80},
    "JavaScript": {"start": 1995, "peak": 2022, "current": 95},
    "C#": {"start": 2000, "peak": 2018, "current": 70},
    "Go": {"start": 2009, "peak": 2025, "current": 65},
    "Rust": {"start": 2010, "peak": 2026, "current": 75},
    "TypeScript": {"start": 2012, "peak": 2025, "current": 85},
}

def calculate_popularity(lang, year):
    """Simple heuristic for generating historical popularity curves."""
    data = LANGUAGES_HISTORY[lang]
    if year < data["start"]:
        return 0.0
    
    # Growth until peak
    if year <= data["peak"]:
        progress = (year - data["start"]) / max(1, (data["peak"] - data["start"]))
        return min(100.0, progress * 100)
    
    # Decline or stabilization after peak
    years_past_peak = year - data["peak"]
    decay_factor = max(0.2, 1.0 - (years_past_peak * 0.02))
    target = data["current"]
    
    return min(100.0, max(1.0, 100.0 * decay_factor * (target / 100.0)))

def seed_historical_data(session):
    """Seeds historical data (1960 - 2034) into tech_trends table."""
    print("🌱 Starting generation of historical data (1960 - 2034)...")
    
    records_to_insert = []
    target_countries = ["GLOBAL", "DK", "US", "DE", "SE", "NO"]
    
    for year in range(1960, 2035):
        date_obj = datetime(year, 1, 1, tzinfo=timezone.utc)
        
        for country in target_countries:
            for lang in LANGUAGES_HISTORY.keys():
                popularity = calculate_popularity(lang, year)
                if popularity > 0:
                    country_mod = 0.0
                    if country == "DK" and lang in ("C#", "TypeScript", "Python"): country_mod = 5.0
                    elif country == "US" and lang in ("Python", "Rust", "Go"): country_mod = 8.0
                    elif country == "DE" and lang in ("Java", "C++", "Python"): country_mod = 6.0
                    elif country == "SE" and lang in ("Java", "TypeScript", "Go"): country_mod = 4.0
                    elif country == "NO" and lang in ("C#", "Python"): country_mod = 4.0

                    noise = random.uniform(-2.0, 2.0)
                    final_popularity = max(0.5, min(100.0, popularity + country_mod + noise))
                    
                    records_to_insert.append({
                        "technology": lang,
                        "country": country,
                        "source": "historical_seed",
                        "date": date_obj,
                        "popularity": round(final_popularity, 1),
                        "mentions": int(final_popularity * 100)
                    })

    print(f"📊 Generated {len(records_to_insert)} records across {len(target_countries)} countries. Loading into DB...")
    
    try:
        stmt = insert(TechTrend).values(records_to_insert)
        stmt = stmt.on_conflict_do_nothing(
            index_elements=["technology", "country", "source", "date"]
        )
        result = session.execute(stmt)
        session.commit()
        
        inserted = result.rowcount if hasattr(result, 'rowcount') else "unknown"
        print(f"✅ Success! Added new records: {inserted} (duplicates ignored).")
    except Exception as e:
        session.rollback()
        print(f"❌ Error loading historical data: {e}")
