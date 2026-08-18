from __future__ import annotations

from app.collectors.base import CreatorSnapshot
from app.processors.stats import as_int, mean_or_none, median_or_none


def _reel_views(snapshot: CreatorSnapshot) -> list[int | None]:
    views: list[int | None] = []
    for post in snapshot.posts:
        if post.views is None:
            continue
        if post.post_type and post.post_type.lower() not in {"reel", "reels", "video", "clip"}:
            continue
        views.append(post.views)
    if views:
        return views
    return [p.views for p in snapshot.posts if p.views is not None]


def view_stats(snapshot: CreatorSnapshot, existing: dict | None = None) -> dict:
    existing = existing or {}
    views = _reel_views(snapshot)
    avg = as_int(mean_or_none(views))
    med = as_int(median_or_none(views))
    likes_avg = as_int(mean_or_none([p.likes for p in snapshot.posts]))
    comments_avg = as_int(mean_or_none([p.comments for p in snapshot.posts]))
    return {
        "average_views": avg,
        "median_views": med,
        "average_likes": likes_avg,
        "average_comments": comments_avg,
    }
