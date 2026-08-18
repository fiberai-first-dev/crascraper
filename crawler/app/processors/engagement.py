from __future__ import annotations

from app.collectors.base import CreatorSnapshot
from app.processors.stats import median_or_none


def engagement_rate_primary(*, median_likes: float | None, followers: int | None) -> float | None:
    """Instagram MVP ER = median_likes / followers, stored as a percent."""
    if not followers or median_likes is None:
        return None
    return round((median_likes / followers) * 100, 2)


def engagement_rate_alt(*, median_likes: float | None, median_comments: float | None, followers: int | None) -> float | None:
    if not followers or median_likes is None:
        return None
    comments = median_comments or 0
    return round(((median_likes + comments) / followers) * 100, 2)


def from_snapshot(snapshot: CreatorSnapshot, existing: dict | None = None) -> dict:
    existing = existing or {}
    likes = [p.likes for p in snapshot.posts]
    comments = [p.comments for p in snapshot.posts]
    median_likes = median_or_none(likes)
    median_comments = median_or_none(comments)
    followers = snapshot.followers if snapshot.followers is not None else existing.get("followers")
    primary = engagement_rate_primary(median_likes=median_likes, followers=followers)
    alt = engagement_rate_alt(median_likes=median_likes, median_comments=median_comments, followers=followers)
    return {
        "median_likes": int(round(median_likes)) if median_likes is not None else None,
        "median_comments": int(round(median_comments)) if median_comments is not None else None,
        "engagement_rate": primary,
        "engagement_rate_alt": alt,
    }
