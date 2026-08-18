from __future__ import annotations

from app.collectors.base import CollectionBlockedError, CreatorSnapshot, RateLimitedError
from app.collectors.factory import get_collector
from app.config.logging import logger
from app.config.settings import (
    MAX_CANDIDATES,
    MAX_FOLLOWER_CANDIDATES,
    MAX_FOLLOWING_CANDIDATES,
    MAX_POST_ENRICH_BATCH,
    MIN_FOLLOWERS,
    TARGET_QUALIFIED,
)
from app.collectors.instagram.parser import is_valid_username
from app.processors.pipeline import process_snapshot
from app.processors.qualify import qualify
from app.publishers import database as db


def handle_job(message: dict) -> list[dict]:
    job_type = message.get("type") or "refresh_influencer"
    if job_type == "discover_seeds":
        job_id = message.get("jobId")
        if job_id:
            db.mark_job(job_id, "processing")
        from app.discovery.bootstrap import bootstrap_candidates

        bootstrap_candidates(reset_inflight=False)
        if job_id:
            db.mark_job(job_id, "completed")
        logger.info("discover_seeds loaded official CSV into the candidate queue")
        return []
    if job_type == "discover_profile":
        return handle_discover(message)
    if job_type == "enrich_post":
        return handle_enrich_post(message)
    if job_type == "discover_graph":
        handle_discover_graph(message)
        return []
    return handle_refresh(message)


def handle_discover(message: dict) -> list[dict]:
    job_id = message.get("jobId")
    username = (message.get("username") or "").lstrip("@").lower()
    platform = message.get("platform") or "instagram"
    if not job_id or not username:
        raise ValueError("jobId and username are required")

    if not is_valid_username(username):
        db.mark_candidate(username, "rejected", "instagram reserved path, not a profile")
        db.mark_job(job_id, "completed", "instagram reserved path, not a profile")
        logger.info("Rejected @%s: reserved Instagram path, not a creator profile", username)
        return []

    db.mark_job(job_id, "processing")
    candidate = db.load_candidate(username) or {}
    existing = {
        "seed_niches": list(candidate.get("seed_niches") or []),
        "profile_url": candidate.get("profile_url"),
    }
    collector = get_collector()
    source = candidate.get("source") or "seed"
    terminal = {"qualified", "rejected"}
    if candidate.get("status") in terminal:
        db.mark_job(job_id, "completed", f"already {candidate.get('status')}")
        logger.info("Skipping @%s; already %s", username, candidate.get("status"))
        return []
    try:
        snapshot = collector.collect(username=username, platform=platform, existing=existing)
        ok, reason = qualify(snapshot)
        if not ok:
            db.mark_candidate(username, "rejected", reason, snapshot.followers)
            db.mark_job(job_id, "completed", reason)
            logger.info("Skipped catalog insert for @%s: %s", username, reason)
            if source == "seed" and db.below_target():
                return _graph_followups(username, None, list(candidate.get("seed_niches") or []), source)
            return []

        processed = process_snapshot(snapshot, existing)
        followers = processed.get("followers")
        if followers is None or followers < MIN_FOLLOWERS:
            reason = "followers not available from public profile" if followers is None else f"followers {followers} below {MIN_FOLLOWERS}"
            db.mark_candidate(username, "rejected", reason, snapshot.followers)
            db.mark_job(job_id, "completed", reason)
            logger.info("Skipped catalog insert for @%s: %s", username, reason)
            if source == "seed" and db.below_target():
                return _graph_followups(username, None, list(candidate.get("seed_niches") or []), source)
            return []
        influencer_id, post_jobs = db.upsert_qualified(processed)
        db.mark_candidate(username, "qualified", None, snapshot.followers)
        db.mark_job(job_id, "completed")
        logger.info("Cataloged @%s -> %s (%s/%s)", username, influencer_id, db.qualified_count(), TARGET_QUALIFIED)
        followups = _post_followups(influencer_id, username, post_jobs)
        if not followups:
            followups = _graph_followups(username, influencer_id, list(candidate.get("seed_niches") or []), source)
        return followups
    except RateLimitedError as exc:
        db.mark_candidate(username, "blocked", str(exc))
        db.mark_job(job_id, "failed", str(exc))
        logger.warning("Rate limited for @%s: crawlers will stop. %s", username, exc)
        raise
    except CollectionBlockedError as exc:
        db.mark_candidate(username, "blocked", str(exc))
        db.mark_job(job_id, "failed", str(exc))
        logger.warning("Collection blocked for @%s: %s", username, exc)
        if source == "seed" and db.below_target():
            return _graph_followups(username, None, list(candidate.get("seed_niches") or []), source)
        return []
    except Exception as exc:  # noqa: BLE001
        db.mark_candidate(username, "failed", str(exc))
        db.mark_job(job_id, "failed", str(exc))
        logger.exception("Discover failed for @%s", username)
        raise


def handle_refresh(message: dict) -> list[dict]:
    job_id = message.get("jobId")
    influencer_id = message.get("influencerId")
    platform = message.get("platform") or "instagram"
    username = message.get("username")

    if not job_id or not influencer_id:
        raise ValueError("jobId and influencerId are required")

    db.mark_job(job_id, "processing")
    existing = db.load_influencer(influencer_id)
    if not existing:
        db.mark_job(job_id, "failed", "Influencer not found")
        raise RuntimeError("Influencer not found")

    username = username or existing["username"]
    collector = get_collector()
    try:
        snapshot = collector.collect(username=username, platform=platform, existing=existing)
        processed = process_snapshot(snapshot, existing)
        followers = processed.get("followers")
        if followers is None or followers < MIN_FOLLOWERS:
            reason = "followers not available from public profile" if followers is None else f"followers {followers} below {MIN_FOLLOWERS}"
            db.mark_job(job_id, "completed", reason)
            logger.info("Refresh skipped catalog write for @%s: %s", username, reason)
            return []
        _influencer_id, post_jobs = db.upsert_qualified(processed)
        db.mark_job(job_id, "completed")
        logger.info("Refreshed @%s (%s)", username, influencer_id)
        return _post_followups(influencer_id, username, post_jobs)
    except RateLimitedError as exc:
        db.mark_job(job_id, "failed", str(exc))
        logger.warning("Rate limited refreshing @%s: crawlers will stop. %s", username, exc)
        raise
    except CollectionBlockedError as exc:
        db.mark_job(job_id, "failed", str(exc))
        logger.warning("Collection blocked for @%s: %s", username, exc)
        raise
    except Exception as exc:  # noqa: BLE001
        db.mark_job(job_id, "failed", str(exc))
        logger.exception("Refresh failed for @%s", username)
        raise


def handle_enrich_post(message: dict) -> list[dict]:
    job_id = message.get("jobId")
    post_id = message.get("postId")
    post_url = message.get("postUrl")
    username = (message.get("username") or "").lstrip("@").lower()
    if job_id:
        db.mark_job(job_id, "processing")
    if not post_id or not post_url:
        if job_id:
            db.mark_job(job_id, "failed", "postId and postUrl are required")
        raise ValueError("postId and postUrl are required")
    collector = get_collector()
    collect_post = getattr(collector, "collect_post", None)
    if not callable(collect_post):
        if job_id:
            db.mark_job(job_id, "failed", "collector cannot enrich posts")
        return []
    try:
        details = collect_post(post_url)
        influencer_id = db.update_post_details(post_id, details)
        if influencer_id:
            db.refresh_latest_metrics_from_posts(influencer_id)
            db.refresh_niches_from_posts(influencer_id)
        if job_id:
            db.mark_job(job_id, "completed")
        logger.info("Enriched post %s likes=%s views=%s", post_id, details.likes, details.views)
        if influencer_id and db.posts_awaiting_details(influencer_id) == 0:
            candidate = db.load_candidate(username) or {}
            return _graph_followups(
                username,
                influencer_id,
                list(candidate.get("seed_niches") or []),
                candidate.get("source") or "seed",
            )
        return []
    except RateLimitedError as exc:
        db.mark_post_details_status(post_id, "blocked")
        if job_id:
            db.mark_job(job_id, "failed", str(exc))
        logger.warning("Rate limited enriching %s: crawlers will stop. %s", post_url, exc)
        raise
    except CollectionBlockedError as exc:
        db.mark_post_details_status(post_id, "blocked")
        if job_id:
            db.mark_job(job_id, "failed", str(exc))
        logger.warning("Post enrichment blocked for %s: %s", post_url, exc)
        influencer_id = message.get("influencerId")
        if influencer_id and username and db.posts_awaiting_details(str(influencer_id)) == 0:
            candidate = db.load_candidate(username) or {}
            return _graph_followups(
                username,
                str(influencer_id),
                list(candidate.get("seed_niches") or []),
                candidate.get("source") or "seed",
            )
        return []
    except Exception as exc:  # noqa: BLE001
        if job_id:
            db.mark_job(job_id, "failed", str(exc))
        logger.exception("Post enrichment failed for %s", post_url)
        raise


def handle_discover_graph(message: dict) -> None:
    job_id = message.get("jobId")
    username = (message.get("username") or "").lstrip("@").lower()
    if job_id:
        db.mark_job(job_id, "processing")
    if not username:
        if job_id:
            db.mark_job(job_id, "failed", "username is required")
        return
    candidate = db.load_candidate(username) or {}
    source = candidate.get("source") or message.get("source") or "seed"
    seed_niches = list(candidate.get("seed_niches") or message.get("seedNiches") or [])
    collector = get_collector()
    try:
        _discover_more(collector, username, CreatorSnapshot(platform="instagram", username=username), seed_niches, source=source)
        if job_id:
            db.mark_job(job_id, "completed")
    except RateLimitedError as exc:
        if job_id:
            db.mark_job(job_id, "failed", str(exc))
        logger.warning("Rate limited on graph hop for @%s: crawlers will stop. %s", username, exc)
        raise
    except Exception as exc:  # noqa: BLE001
        if job_id:
            db.mark_job(job_id, "failed", str(exc))
        logger.exception("Graph hop failed for @%s", username)
        raise


def _post_followups(influencer_id: str, username: str, posts: list[dict]) -> list[dict]:
    followups: list[dict] = []
    for post in posts[:MAX_POST_ENRICH_BATCH]:
        job = db.create_job(
            job_type="enrich_post",
            influencer_id=influencer_id,
            payload={"postId": post["id"], "postUrl": post["post_url"], "username": username},
        )
        followups.append(
            {
                "type": "enrich_post",
                "jobId": str(job["id"]),
                "influencerId": influencer_id,
                "postId": post["id"],
                "postUrl": post["post_url"],
                "username": username,
            }
        )
    if followups:
        db.mark_posts_queued([post["id"] for post in posts[:MAX_POST_ENRICH_BATCH]])
        logger.info("Queued %s post enrichment jobs for @%s", len(followups), username)
    return followups


def _graph_followups(username: str, influencer_id: str | None, seed_niches: list[str], source: str) -> list[dict]:
    if not username or not db.below_target():
        return []
    if (source or "seed") == "follower":
        logger.info("Skip graph hop from follower-origin @%s", username)
        return []
    if db.has_graph_job(username):
        return []
    job = db.create_job(
        job_type="discover_graph",
        influencer_id=influencer_id,
        payload={"username": username, "source": source, "seedNiches": seed_niches},
    )
    logger.info("Queued graph hop for @%s after profile/posts", username)
    return [
        {
            "type": "discover_graph",
            "jobId": str(job["id"]),
            "influencerId": influencer_id,
            "username": username,
            "source": source,
            "seedNiches": seed_niches,
        }
    ]


def _unique(names: list[str], cap: int) -> list[str]:
    seen: set[str] = set()
    out: list[str] = []
    for name in names:
        handle = (name or "").strip(".").lower()
        if not handle or handle in seen:
            continue
        seen.add(handle)
        out.append(handle)
        if len(out) >= cap:
            break
    return out


def _discover_more(collector, from_username: str, snapshot, seed_niches: list[str], source: str = "seed") -> None:
    if not db.below_target():
        logger.info("Skip graph hop for @%s; catalog already at target %s", from_username, TARGET_QUALIFIED)
        return
    if (source or "seed") == "follower":
        logger.info("Skip graph hop from follower-origin @%s", from_username)
        return
    if db.candidate_count() >= MAX_CANDIDATES:
        logger.info("Skip graph hop for @%s; candidate cap %s reached", from_username, MAX_CANDIDATES)
        return

    following = list(getattr(snapshot, "related_following", None) or [])
    followers = list(getattr(snapshot, "related_followers", None) or [])
    discover = getattr(collector, "discover_related", None)
    if callable(discover):
        extra_following, extra_followers = discover(from_username)
        following.extend(extra_following)
        followers.extend(extra_followers)

    following = [name for name in _unique(following, MAX_FOLLOWING_CANDIDATES) if is_valid_username(name)]
    # Never ingest a full follower list. Only a small public sample, and only if following was empty/gated.
    followers = [] if following else [name for name in _unique(followers, MAX_FOLLOWER_CANDIDATES) if is_valid_username(name)]
    room = max(0, MAX_CANDIDATES - db.candidate_count())
    following = following[:room]
    followers = followers[: max(0, room - len(following))]
    added = 0
    for username in following:
        db.upsert_candidate(
            username=username,
            url=f"https://www.instagram.com/{username}/",
            niches=seed_niches,
            source="following",
            discovered_from=from_username,
        )
        added += 1
    for username in followers:
        db.upsert_candidate(
            username=username,
            url=f"https://www.instagram.com/{username}/",
            niches=seed_niches,
            source="follower",
            discovered_from=from_username,
        )
        added += 1
    if added:
        logger.info(
            "Queued %s additional candidates from @%s (following=%s follower_sample=%s; caps %s/%s)",
            added,
            from_username,
            len(following),
            len(followers),
            MAX_FOLLOWING_CANDIDATES,
            MAX_FOLLOWER_CANDIDATES,
        )
