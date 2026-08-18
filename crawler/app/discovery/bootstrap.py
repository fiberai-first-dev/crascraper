from __future__ import annotations

from app.config.logging import logger
from app.config.settings import DISCOVER_BATCH_SIZE, MAX_POST_ENRICH_BATCH, SCRAPE_POSTS_QUEUE, TARGET_QUALIFIED
from app.discovery.seed_loader import load_seed_profiles
from app.publishers import database as db
from app.publishers.rabbit import publish_json


def bootstrap_candidates(reset_inflight: bool = True) -> int:
    if reset_inflight:
        db.reset_inflight_candidates()
        db.retry_seed_candidates()
    seed_count = 0
    for profile in load_seed_profiles():
        db.upsert_candidate(
            username=profile["username"],
            url=profile["url"],
            niches=profile.get("niches") or [],
            source="seed",
        )
        seed_count += 1
    logger.info("Seed CSV loaded %s candidates into the queue", seed_count)
    logger.info("Qualified so far: %s / %s", db.qualified_count(), TARGET_QUALIFIED)
    return seed_count


def enqueue_pending(channel, limit: int | None = None) -> int:
    if not db.below_target():
        logger.info("Qualified catalog already at target %s", TARGET_QUALIFIED)
        return 0
    pending = db.claim_pending_candidates(limit or DISCOVER_BATCH_SIZE)
    queued = 0
    for candidate in pending:
        job = db.create_job(
            job_type="discover_profile",
            candidate_id=str(candidate["id"]),
            payload={
                "username": candidate["username"],
                "platform": "instagram",
                "source": candidate.get("source"),
            },
        )
        publish_json(
            channel,
            {
                "type": "discover_profile",
                "jobId": str(job["id"]),
                "candidateId": str(candidate["id"]),
                "username": candidate["username"],
                "platform": "instagram",
            },
        )
        queued += 1
    if queued:
        logger.info("Queued %s discover_profile jobs (%s/%s qualified)", queued, db.qualified_count(), TARGET_QUALIFIED)
    return queued


def enqueue_pending_posts(channel, limit: int | None = None) -> int:
    pending = db.pending_post_enrichment(limit or MAX_POST_ENRICH_BATCH)
    queued = 0
    for post in pending:
        job = db.create_job(
            job_type="enrich_post",
            influencer_id=str(post["influencer_id"]),
            payload={
                "postId": str(post["id"]),
                "postUrl": post["post_url"],
                "username": post["username"],
            },
        )
        publish_json(
            channel,
            {
                "type": "enrich_post",
                "jobId": str(job["id"]),
                "influencerId": str(post["influencer_id"]),
                "postId": str(post["id"]),
                "postUrl": post["post_url"],
                "username": post["username"],
            },
            queue=SCRAPE_POSTS_QUEUE,
        )
        queued += 1
    if queued:
        db.mark_posts_queued([str(post["id"]) for post in pending])
        logger.info("Queued %s enrich_post jobs", queued)
    return queued
