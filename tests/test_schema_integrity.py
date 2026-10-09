import pytest
from sqlalchemy import inspect
from database.models import Base, JobPosting
from database.session import engine, SessionLocal
from database.init_db import ensure_database_schema


def test_schema_drift_detection():
    """
    Validates that the physical database schema contains all columns
    defined in SQLAlchemy models (Base.metadata.tables).
    Fails immediately if any model has columns that are missing from the live DB.
    """
    # Run schema verification to guarantee baseline sync
    ensure_database_schema(engine)

    inspector = inspect(engine)
    existing_tables = set(inspector.get_table_names())

    missing_fields = {}

    for table_name, table in Base.metadata.tables.items():
        if table_name not in existing_tables:
            missing_fields[table_name] = f"Table '{table_name}' does not exist in DB!"
            continue

        db_columns = {col["name"] for col in inspector.get_columns(table_name)}
        model_columns = {col.name for col in table.columns}

        diff = model_columns - db_columns
        if diff:
            missing_fields[table_name] = diff

    assert not missing_fields, (
        f"🚨 Schema drift detected! The following columns defined in models.py "
        f"do not exist in the live database: {missing_fields}"
    )


def test_job_posting_salary_columns_exist_in_db():
    """
    Explicitly tests that job_postings contains salary_min, salary_max, salary_currency.
    """
    inspector = inspect(engine)
    db_columns = {col["name"] for col in inspector.get_columns("job_postings")}

    for expected_col in ["salary_min", "salary_max", "salary_currency"]:
        assert expected_col in db_columns, (
            f"Expected column '{expected_col}' not found in 'job_postings' table. "
            f"Available columns: {sorted(list(db_columns))}"
        )


def test_job_posting_orm_crud_with_salary():
    """
    Executes a transactional INSERT, SELECT, and ROLLBACK on JobPosting
    with salary fields to ensure psycopg2 doesn't raise UndefinedColumn.
    """
    db = SessionLocal()
    try:
        test_job = JobPosting(
            title="Test Schema Drift Engineer",
            company="SchemaTest Corp",
            source="test_schema",
            country="DK",
            city="Copenhagen",
            technology="Python",
            salary_min=75000.0,
            salary_max=95000.0,
            salary_currency="EUR",
            match_score=95.0
        )
        db.add(test_job)
        db.flush()

        fetched = db.query(JobPosting).filter(
            JobPosting.title == "Test Schema Drift Engineer",
            JobPosting.company == "SchemaTest Corp"
        ).first()

        assert fetched is not None
        assert fetched.salary_min == 75000.0
        assert fetched.salary_max == 95000.0
        assert fetched.salary_currency == "EUR"
    finally:
        db.rollback()
        db.close()


def test_ensure_database_schema_idempotent():
    """
    Verifies that calling ensure_database_schema repeatedly does not crash
    and handles multiple invocations safely.
    """
    ensure_database_schema(engine)
    ensure_database_schema(engine)
