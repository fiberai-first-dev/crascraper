from __future__ import annotations

from app.collectors.base import CreatorSnapshot, PostSnapshot
from app.processors.engagement import from_snapshot as engagement_from_snapshot
from app.processors.niche import NicheClassifier, NicheHit
from app.processors.views import view_stats

_classifier = NicheClassifier()

# Tags that appear on almost every Instagram post and must not drive niche.
_GENERIC_TAGS = {
    "reels",
    "reel",
    "instagram",
    "instagood",
    "viral",
    "fyp",
    "explore",
    "explorepage",
    "photo",
    "video",
    "love",
    "follow",
    "followme",
    "like",
    "comment",
    "share",
    "instadaily",
    "photooftheday",
}


def _hits_to_niches(hits: list[NicheHit]) -> list[dict]:
    return [{"niche": hit.niche, "sub_niche": hit.sub_niche} for hit in hits]


def _seed_niches(existing: dict | None) -> list[str]:
    seed = (existing or {}).get("seed_niches") or (existing or {}).get("niches") or []
    if isinstance(seed, str):
        return [seed] if seed else []
    names: list[str] = []
    for item in seed:
        if isinstance(item, dict):
            name = item.get("niche")
        else:
            name = item
        if name and name not in names:
            names.append(str(name))
    return names


def _post_texts(posts: list[PostSnapshot] | None, captions: list[str | None] | None = None, hashtags: list[str] | None = None) -> list[str]:
    texts: list[str] = []
    for post in posts or []:
        if post.caption:
            texts.append(post.caption)
        for tag in post.hashtags or []:
            clean = (tag or "").strip().lstrip("#").lower()
            if clean and clean not in _GENERIC_TAGS:
                texts.append(clean.replace("_", " "))
    for caption in captions or []:
        if caption:
            texts.append(caption)
    for tag in hashtags or []:
        clean = (tag or "").strip().lstrip("#").lower()
        if clean and clean not in _GENERIC_TAGS:
            texts.append(clean.replace("_", " "))
    return texts


def niches_from_posts(
    *,
    posts: list[PostSnapshot] | None = None,
    captions: list[str | None] | None = None,
    hashtags: list[str] | None = None,
    seed_niches: list[str] | None = None,
) -> list[dict]:
    """Rule-based niches from post captions and hashtags. Seed labels only if posts yield nothing."""
    hits = _classifier.classify_many(_post_texts(posts, captions, hashtags))
    if hits:
        return _hits_to_niches(hits)
    return [{"niche": name, "sub_niche": None} for name in (seed_niches or []) if name]


def process_snapshot(snapshot: CreatorSnapshot, existing: dict | None = None) -> dict:
    existing = existing or {}
    niches = niches_from_posts(
        posts=snapshot.posts,
        captions=[
            row.get("caption")
            for row in (existing.get("recent_posts") or [])
            if isinstance(row, dict)
        ],
        hashtags=[
            tag
            for row in (existing.get("recent_posts") or [])
            if isinstance(row, dict)
            for tag in (row.get("hashtags") or [])
        ],
        seed_niches=_seed_niches(existing),
    )
    engagement = engagement_from_snapshot(snapshot, existing)
    views = view_stats(snapshot, existing)
    primary_niche = niches[0]["niche"] if niches else existing.get("niche")
    primary_sub = niches[0]["sub_niche"] if niches else existing.get("sub_niche")
    extra = dict(snapshot.raw or {})
    extra.setdefault("source", "instagram_public_html")

    return {
        "platform": snapshot.platform,
        "username": snapshot.username,
        "display_name": snapshot.display_name or existing.get("display_name"),
        "profile_url": snapshot.profile_url or existing.get("profile_url"),
        "profile_image_url": snapshot.profile_image_url or existing.get("profile_image_url"),
        "bio": snapshot.bio if snapshot.bio is not None else existing.get("bio"),
        "followers": snapshot.followers if snapshot.followers is not None else existing.get("followers"),
        "following": snapshot.following if snapshot.following is not None else existing.get("following"),
        "post_count": snapshot.post_count if snapshot.post_count is not None else existing.get("post_count"),
        "engagement_rate": engagement.get("engagement_rate"),
        "engagement_rate_alt": engagement.get("engagement_rate_alt"),
        "median_likes": engagement.get("median_likes"),
        "median_comments": engagement.get("median_comments"),
        "average_views": views.get("average_views"),
        "median_views": views.get("median_views"),
        "average_likes": views.get("average_likes"),
        "average_comments": views.get("average_comments"),
        "niche": primary_niche,
        "sub_niche": primary_sub,
        "niches": niches,
        "is_verified": snapshot.is_verified if snapshot.is_verified is not None else existing.get("is_verified"),
        "category": snapshot.category if snapshot.category is not None else existing.get("category"),
        "website_url": snapshot.website_url if snapshot.website_url is not None else existing.get("website_url"),
        "is_private": snapshot.is_private if snapshot.is_private is not None else existing.get("is_private"),
        "account_type": snapshot.account_type if snapshot.account_type is not None else existing.get("account_type"),
        "pronouns": snapshot.pronouns if snapshot.pronouns is not None else existing.get("pronouns"),
        "location": snapshot.location if snapshot.location is not None else existing.get("location"),
        "language": extra.get("language") or existing.get("language"),
        "extra": extra,
        "posts": snapshot.posts,
    }
