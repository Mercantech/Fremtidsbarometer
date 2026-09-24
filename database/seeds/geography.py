from database.models import GeographyGrid
from sqlalchemy.dialects.postgresql import insert

GEO_SEED = [
    # Tier 1 (Deep Analysis)
    {"country_code": "US", "region_name": "Silicon Valley", "tier": 1, "lat": 37.38, "lng": -122.08},
    {"country_code": "DK", "region_name": "Denmark", "tier": 1, "lat": 55.67, "lng": 12.56},
    {"country_code": "NO", "region_name": "Norway", "tier": 1, "lat": 59.91, "lng": 10.75},
    {"country_code": "SE", "region_name": "Sweden", "tier": 1, "lat": 59.32, "lng": 18.06},
    {"country_code": "DE", "region_name": "Germany", "tier": 1, "lat": 52.52, "lng": 13.40},

    # Tier 2 (Batched/Aggregated)
    {"country_code": "UK", "region_name": "United Kingdom", "tier": 2, "lat": 51.50, "lng": -0.12},
    {"country_code": "FR", "region_name": "France", "tier": 2, "lat": 48.85, "lng": 2.35},
    {"country_code": "NL", "region_name": "Netherlands", "tier": 2, "lat": 52.36, "lng": 4.90},
    {"country_code": "CH", "region_name": "Switzerland", "tier": 2, "lat": 47.37, "lng": 8.54},
    {"country_code": "GLOBAL", "region_name": "Global Aggregate", "tier": 2, "lat": 0.0, "lng": 0.0},
]

def seed_geography(session):
    """Seeds the geography grid table."""
    print("🌍 Seeding Geography Grid (Tier-1 and Tier-2)...")
    try:
        for geo_data in GEO_SEED:
            stmt = insert(GeographyGrid).values(**geo_data)
            stmt = stmt.on_conflict_do_nothing(index_elements=["country_code", "region_name"])
            session.execute(stmt)
        session.commit()
        print(f"✅ Seeded Geography Grid.")
    except Exception as e:
        session.rollback()
        print(f"❌ Error seeding geography: {e}")
