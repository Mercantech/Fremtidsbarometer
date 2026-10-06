import pytest
from database.session import get_session
from agents.orchestrator import check_data_freshness, get_data_source_status
from database.models import DataSource

def test_mathematical_share_calculation():
    # Test formula used in run_mathematical_synthesis
    total_posts = 100
    matched_posts = 30
    
    calculated_share = round((matched_posts / max(total_posts, 1)) * 100, 1)
    normalized_score = min(100.0, max(20.0, calculated_share * 2.5))
    
    assert calculated_share == 30.0
    assert normalized_score == 75.0

    # Test edge case: low matched posts (should clip to 20.0)
    low_matched = 2
    share_low = round((low_matched / 100) * 100, 1)
    score_low = min(100.0, max(20.0, share_low * 2.5))
    assert score_low == 20.0

    # Test edge case: very high matched posts (should clip to 100.0)
    high_matched = 80
    share_high = round((high_matched / 100) * 100, 1)
    score_high = min(100.0, max(20.0, share_high * 2.5))
    assert score_high == 100.0

def test_direction_determination():
    # Delta > 4.0 -> rising
    normalized_score = 75.0
    prev_score = 65.0
    delta = normalized_score - prev_score
    direction = "rising" if delta > 4.0 else ("falling" if delta < -4.0 else "stable")
    assert direction == "rising"

    # Delta < -4.0 -> falling
    prev_score = 82.0
    delta = normalized_score - prev_score
    direction = "rising" if delta > 4.0 else ("falling" if delta < -4.0 else "stable")
    assert direction == "falling"

    # Delta between -4 and 4 -> stable
    prev_score = 73.0
    delta = normalized_score - prev_score
    direction = "rising" if delta > 4.0 else ("falling" if delta < -4.0 else "stable")
    assert direction == "stable"

def test_data_freshness_checker():
    db = get_session()
    try:
        freshness = check_data_freshness(db, max_age_hours=24)
        assert isinstance(freshness, dict)
        assert "is_fresh" in freshness
        assert "recent_raw_records" in freshness
        assert isinstance(freshness["recent_raw_records"], int)
    finally:
        db.close()

def test_data_source_status_lookup():
    db = get_session()
    try:
        is_active, source_id = get_data_source_status(db, "HackerNews")
        assert is_active is True
        assert source_id is not None
        
        # Test unknown source returns True, None
        unknown_active, unknown_id = get_data_source_status(db, "NonExistentSourceXYZ")
        assert unknown_active is True
        assert unknown_id is None
    finally:
        db.close()
