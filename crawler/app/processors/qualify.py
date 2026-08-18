from __future__ import annotations

from datetime import datetime, timedelta, timezone

from app.collectors.base import CreatorSnapshot
from app.config.settings import MIN_FOLLOWERS, RECENT_CONTENT_DAYS


def _parse_dt(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        if value.endswith("Z"):
            value = value[:-1] + "+00:00"
        dt = datetime.fromisoformat(value)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt
    except ValueError:
        return None


def qualify(snapshot: CreatorSnapshot, *, source: str | None = None) -> tuple[bool, str | None]:
    del source  # same rule for seed, following, and follower candidates
    if snapshot.followers is None:
        return False, "followers not available from public profile"
    if snapshot.followers < MIN_FOLLOWERS:
        return False, f"followers {snapshot.followers} below {MIN_FOLLOWERS}"

    has_posts = bool(snapshot.posts) or (snapshot.post_count or 0) > 0
    if not has_posts and not (snapshot.bio or "").strip():
        return False, "no public content"

    cutoff = datetime.now(timezone.utc) - timedelta(days=RECENT_CONTENT_DAYS)
    dated = [_parse_dt(p.published_at) for p in snapshot.posts]
    dated = [d for d in dated if d]
    if dated and not any(d >= cutoff for d in dated):
        return False, "no recent public content"

    return True, None
