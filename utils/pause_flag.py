"""
Utility helpers for a global "pipeline paused" flag.

The flag lives in the ``system_settings`` table as a JSONB value under the key
``pipeline_paused``.  It is interpreted as ``{"paused": <bool>}``.  If the
setting does not exist yet, it is created with ``paused=False`` on first read.

These helpers are deliberately lightweight and have no side‑effects on the
scheduler or background jobs – they simply expose a convenient API that can be
used by new admin endpoints or UI actions later on.
"""

from typing import Any

from database.models import SystemSetting
from database.session import get_session


def _ensure_setting(session: Any) -> SystemSetting:
    """Fetch the setting record, creating it if necessary.

    Parameters
    ----------
    session: SQLAlchemy session
        Active DB session.
    """
    setting = (
        session.query(SystemSetting)
        .filter(SystemSetting.key == "pipeline_paused")
        .first()
    )
    if setting is None:
        # Insert default value: not paused
        setting = SystemSetting(
            key="pipeline_paused",
            value={"paused": False},
        )
        session.add(setting)
        session.commit()
        session.refresh(setting)
    return setting


def is_pipeline_paused() -> bool:
    """Return ``True`` if the global pause flag is set, otherwise ``False``.
    """
    db = get_session()
    try:
        setting = _ensure_setting(db)
        return bool(setting.value.get("paused", False))
    finally:
        db.close()


def set_pipeline_paused(pause: bool) -> None:
    """Set the global pause flag.

    Parameters
    ----------
    pause: bool
        ``True`` to pause the pipeline, ``False`` to resume it.
    """
    db = get_session()
    try:
        setting = _ensure_setting(db)
        setting.value = {"paused": pause}
        db.commit()
    finally:
        db.close()
