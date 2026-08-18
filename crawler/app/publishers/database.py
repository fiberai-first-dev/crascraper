from __future__ import annotations

import json
from contextlib import contextmanager

import psycopg2
import psycopg2.extras

from app.collectors.base import PostSnapshot
from app.config.settings import DATABASE_URL, LEADER_LOCK_KEY, MIN_FOLLOWERS, STALE_INFLIGHT_MINUTES, TARGET_QUALIFIED


@contextmanager
def connection():
    conn = psycopg2.connect(DATABASE_URL)
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def wait_for_schema(retries: int = 40) -> None:
    import time

    last = None
    for _ in range(retries):
        try:
            with connection() as conn:
                with conn.cursor() as cur:
                    cur.execute("SELECT followers, category FROM influencer_catalog LIMIT 1")
            return
        except Exception as exc:  # noqa: BLE001
            last = exc
            time.sleep(1)
    raise RuntimeError(f"influencer_catalog view not ready: {last}")


def wait_for_db(retries: int = 40) -> None:
    import time

    last = None
    for _ in range(retries):
        try:
            with connection() as conn:
                with conn.cursor() as cur:
                    cur.execute("SELECT 1")
            return
        except Exception as exc:  # noqa: BLE001
            last = exc
            time.sleep(1)
    raise RuntimeError(f"PostgreSQL not ready: {last}")


def qualified_count() -> int:
    with connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT COUNT(*) FROM influencers")
            return int(cur.fetchone()[0])


def below_target() -> bool:
    return qualified_count() < TARGET_QUALIFIED


def retry_seed_candidates() -> None:
    with connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE candidates
                SET status = 'pending', reject_reason = NULL, updated_at = NOW()
                WHERE source = 'seed' AND status IN ('rejected', 'blocked', 'failed')
                """
            )


def reset_inflight_candidates() -> None:
    """Re-queue only stale in-flight rows so live workers are not interrupted."""
    with connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE candidates
                SET status = 'pending', updated_at = NOW()
                WHERE status IN ('queued', 'processing')
                  AND updated_at < NOW() - (%s || ' minutes')::interval
                """,
                (STALE_INFLIGHT_MINUTES,),
            )


def run_with_leader_lock(fn) -> bool:
    """Run fn once across crawler replicas. Session lock is held until this returns."""
    conn = psycopg2.connect(DATABASE_URL)
    conn.autocommit = True
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT pg_try_advisory_lock(%s)", (LEADER_LOCK_KEY,))
            if not cur.fetchone()[0]:
                return False
        fn()
        return True
    finally:
        conn.close()


def candidate_count() -> int:
    with connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT COUNT(*) FROM candidates")
            return int(cur.fetchone()[0])


def claim_pending_candidates(limit: int) -> list[dict]:
    with connection() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                """
                WITH picked AS (
                  SELECT id FROM candidates
                  WHERE status = 'pending'
                  ORDER BY CASE source
                    WHEN 'seed' THEN 0
                    WHEN 'following' THEN 1
                    WHEN 'follower' THEN 2
                    ELSE 3
                  END, created_at ASC
                  LIMIT %s
                  FOR UPDATE SKIP LOCKED
                )
                UPDATE candidates AS c
                SET status = 'queued', updated_at = NOW()
                FROM picked
                WHERE c.id = picked.id
                RETURNING c.*
                """,
                (limit,),
            )
            return [dict(r) for r in cur.fetchall()]


def posts_awaiting_details(influencer_id: str) -> int:
    with connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT COUNT(*) FROM influencer_posts
                WHERE influencer_id = %s AND details_status IN ('pending', 'queued')
                """,
                (influencer_id,),
            )
            return int(cur.fetchone()[0])


def has_graph_job(username: str) -> bool:
    with connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT 1 FROM scrape_jobs
                WHERE job_type = 'discover_graph'
                  AND payload->>'username' = %s
                  AND status IN ('queued', 'processing', 'completed')
                LIMIT 1
                """,
                (username.lower(),),
            )
            return cur.fetchone() is not None


def upsert_candidate(*, username: str, url: str, niches: list[str], source: str, discovered_from: str | None = None) -> dict:
    with connection() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                """
                INSERT INTO candidates (platform, username, profile_url, source, discovered_from, seed_niches, status)
                VALUES ('instagram', %s, %s, %s, %s, %s, 'pending')
                ON CONFLICT (platform, username) DO UPDATE
                  SET profile_url = COALESCE(EXCLUDED.profile_url, candidates.profile_url),
                      seed_niches = (
                        SELECT ARRAY(SELECT DISTINCT unnest(candidates.seed_niches || EXCLUDED.seed_niches))
                      ),
                      updated_at = NOW()
                RETURNING *
                """,
                (username.lower(), url, source, discovered_from, niches or []),
            )
            return dict(cur.fetchone())


def pending_candidates(limit: int) -> list[dict]:
    return claim_pending_candidates(limit)


def mark_candidate(username: str, status: str, reason: str | None = None, followers: int | None = None) -> None:
    with connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE candidates
                SET status = %s,
                    reject_reason = %s,
                    followers = COALESCE(%s, followers),
                    last_checked_at = NOW(),
                    updated_at = NOW()
                WHERE platform = 'instagram' AND username = %s
                """,
                (status, reason, followers, username.lower()),
            )


def create_job(*, job_type: str, candidate_id: str | None = None, influencer_id: str | None = None, payload: dict | None = None) -> dict:
    with connection() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                """
                INSERT INTO scrape_jobs (influencer_id, candidate_id, status, job_type, payload)
                VALUES (%s, %s, 'queued', %s, %s)
                RETURNING *
                """,
                (influencer_id, candidate_id, job_type, json.dumps(payload or {})),
            )
            return dict(cur.fetchone())


def load_influencer(influencer_id: str) -> dict | None:
    with connection() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("SELECT * FROM influencer_catalog WHERE id = %s", (influencer_id,))
            row = cur.fetchone()
            if not row:
                return None
            cur.execute(
                """
                SELECT platform_post_id, post_url, post_type, caption, hashtags, likes, comments, views, published_at
                FROM influencer_posts
                WHERE influencer_id = %s
                ORDER BY published_at DESC NULLS LAST
                LIMIT 12
                """,
                (influencer_id,),
            )
            posts = list(cur.fetchall())
            cur.execute(
                "SELECT niche, sub_niche FROM influencer_niches WHERE influencer_id = %s",
                (influencer_id,),
            )
            niches = list(cur.fetchall())
            data = dict(row)
            data["recent_posts"] = posts
            data["niches"] = [n["niche"] for n in niches]
            return data


def load_candidate(username: str) -> dict | None:
    with connection() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                "SELECT * FROM candidates WHERE platform = 'instagram' AND username = %s",
                (username.lower(),),
            )
            row = cur.fetchone()
            return dict(row) if row else None


def mark_job(job_id: str, status: str, error_message: str | None = None) -> None:
    with connection() as conn:
        with conn.cursor() as cur:
            if status == "processing":
                cur.execute(
                    "UPDATE scrape_jobs SET status = %s, started_at = NOW(), error_message = NULL WHERE id = %s",
                    (status, job_id),
                )
            elif status in {"completed", "failed"}:
                cur.execute(
                    """
                    UPDATE scrape_jobs
                    SET status = %s, completed_at = NOW(), error_message = %s
                    WHERE id = %s
                    """,
                    (status, error_message, job_id),
                )
            else:
                cur.execute(
                    "UPDATE scrape_jobs SET status = %s, error_message = %s WHERE id = %s",
                    (status, error_message, job_id),
                )


def upsert_qualified(processed: dict) -> tuple[str, list[dict]]:
    followers = processed.get("followers")
    try:
        follower_count = int(followers) if followers is not None else None
    except (TypeError, ValueError):
        follower_count = None
    if follower_count is None or follower_count < MIN_FOLLOWERS:
        raise ValueError(
            f"refusing catalog insert for @{processed.get('username')}: "
            f"followers {followers} below {MIN_FOLLOWERS}"
        )
    posts: list[PostSnapshot] = processed.get("posts") or []
    niches = processed.get("niches") or []
    saved_posts: list[dict] = []
    with connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO influencers (
                  platform, username, display_name, profile_url, profile_image_url, bio,
                  followers, following, post_count, niche, sub_niche, location, is_verified,
                  category, website_url, is_private, account_type, pronouns, language, extra,
                  last_scraped_at
                ) VALUES (
                  %s, %s, %s, %s, %s, %s,
                  %s, %s, %s, %s, %s, %s, COALESCE(%s, FALSE),
                  %s, %s, %s, %s, %s, %s, %s,
                  NOW()
                )
                ON CONFLICT (platform, username) DO UPDATE SET
                  display_name = COALESCE(EXCLUDED.display_name, influencers.display_name),
                  profile_url = COALESCE(EXCLUDED.profile_url, influencers.profile_url),
                  profile_image_url = COALESCE(EXCLUDED.profile_image_url, influencers.profile_image_url),
                  bio = COALESCE(EXCLUDED.bio, influencers.bio),
                  followers = COALESCE(EXCLUDED.followers, influencers.followers),
                  following = COALESCE(EXCLUDED.following, influencers.following),
                  post_count = COALESCE(EXCLUDED.post_count, influencers.post_count),
                  niche = COALESCE(EXCLUDED.niche, influencers.niche),
                  sub_niche = COALESCE(EXCLUDED.sub_niche, influencers.sub_niche),
                  location = COALESCE(EXCLUDED.location, influencers.location),
                  is_verified = COALESCE(EXCLUDED.is_verified, influencers.is_verified),
                  category = COALESCE(EXCLUDED.category, influencers.category),
                  website_url = COALESCE(EXCLUDED.website_url, influencers.website_url),
                  is_private = COALESCE(EXCLUDED.is_private, influencers.is_private),
                  account_type = COALESCE(EXCLUDED.account_type, influencers.account_type),
                  pronouns = COALESCE(EXCLUDED.pronouns, influencers.pronouns),
                  language = COALESCE(EXCLUDED.language, influencers.language),
                  extra = COALESCE(influencers.extra, '{}'::jsonb) || COALESCE(EXCLUDED.extra, '{}'::jsonb),
                  last_scraped_at = NOW(),
                  updated_at = NOW()
                RETURNING id
                """,
                (
                    processed.get("platform") or "instagram",
                    processed["username"],
                    processed.get("display_name"),
                    processed.get("profile_url"),
                    processed.get("profile_image_url"),
                    processed.get("bio"),
                    processed.get("followers"),
                    processed.get("following"),
                    processed.get("post_count"),
                    processed.get("niche"),
                    processed.get("sub_niche"),
                    processed.get("location"),
                    processed.get("is_verified"),
                    processed.get("category"),
                    processed.get("website_url"),
                    processed.get("is_private"),
                    processed.get("account_type"),
                    processed.get("pronouns"),
                    processed.get("language"),
                    psycopg2.extras.Json(processed.get("extra") or {}),
                ),
            )
            influencer_id = str(cur.fetchone()[0])
            if niches:
                cur.execute("DELETE FROM influencer_niches WHERE influencer_id = %s", (influencer_id,))
                for item in niches:
                    niche = item["niche"] if isinstance(item, dict) else item
                    sub = item.get("sub_niche") if isinstance(item, dict) else None
                    cur.execute(
                        """
                        INSERT INTO influencer_niches (influencer_id, niche, sub_niche)
                        VALUES (%s, %s, %s)
                        ON CONFLICT (influencer_id, niche) DO UPDATE SET sub_niche = COALESCE(EXCLUDED.sub_niche, influencer_niches.sub_niche)
                        """,
                        (influencer_id, niche, sub),
                    )
            cur.execute(
                """
                INSERT INTO influencer_metrics (
                  influencer_id, followers, following, post_count,
                  engagement_rate, engagement_rate_alt,
                  average_views, median_views, average_likes, average_comments,
                  median_likes, median_comments, recorded_at
                ) VALUES (
                  %s, %s, %s, %s,
                  %s, %s,
                  %s, %s, %s, %s,
                  %s, %s, NOW()
                )
                """,
                (
                    influencer_id,
                    processed.get("followers"),
                    processed.get("following"),
                    processed.get("post_count"),
                    processed.get("engagement_rate"),
                    processed.get("engagement_rate_alt"),
                    processed.get("average_views"),
                    processed.get("median_views"),
                    processed.get("average_likes"),
                    processed.get("average_comments"),
                    processed.get("median_likes"),
                    processed.get("median_comments"),
                ),
            )
            for post in posts:
                if not post.platform_post_id:
                    continue
                cur.execute(
                    """
                    INSERT INTO influencer_posts (
                      influencer_id, platform_post_id, post_url, post_type, caption, hashtags,
                      likes, comments, views, published_at
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (influencer_id, platform_post_id)
                    DO UPDATE SET
                      post_url = COALESCE(EXCLUDED.post_url, influencer_posts.post_url),
                      post_type = COALESCE(EXCLUDED.post_type, influencer_posts.post_type),
                      caption = COALESCE(influencer_posts.caption, EXCLUDED.caption),
                      hashtags = CASE
                        WHEN EXCLUDED.hashtags <> '{}' THEN EXCLUDED.hashtags
                        ELSE influencer_posts.hashtags
                      END,
                      likes = COALESCE(influencer_posts.likes, EXCLUDED.likes),
                      comments = COALESCE(influencer_posts.comments, EXCLUDED.comments),
                      views = COALESCE(influencer_posts.views, EXCLUDED.views),
                      published_at = COALESCE(EXCLUDED.published_at, influencer_posts.published_at)
                    RETURNING id, post_url, likes, details_status
                    """,
                    (
                        influencer_id,
                        post.platform_post_id,
                        post.post_url,
                        post.post_type,
                        post.caption,
                        list(post.hashtags or []),
                        post.likes,
                        post.comments,
                        post.views,
                        post.published_at,
                    ),
                )
                row = cur.fetchone()
                if row and row[1] and row[2] is None and (row[3] or "pending") == "pending":
                    saved_posts.append({"id": str(row[0]), "post_url": row[1]})
            return influencer_id, saved_posts


def update_post_details(post_id: str, details: PostSnapshot) -> str | None:
    with connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE influencer_posts
                SET caption = COALESCE(%s, caption),
                    hashtags = CASE WHEN %s <> '{}' THEN %s ELSE hashtags END,
                    likes = COALESCE(%s, likes),
                    comments = COALESCE(%s, comments),
                    views = COALESCE(%s, views),
                    published_at = COALESCE(%s, published_at),
                    post_type = COALESCE(%s, post_type),
                    collected_at = NOW(),
                    details_status = 'ready'
                WHERE id = %s
                RETURNING influencer_id
                """,
                (
                    details.caption,
                    list(details.hashtags or []),
                    list(details.hashtags or []),
                    details.likes,
                    details.comments,
                    details.views,
                    details.published_at,
                    details.post_type,
                    post_id,
                ),
            )
            row = cur.fetchone()
            return str(row[0]) if row else None


def refresh_latest_metrics_from_posts(influencer_id: str) -> None:
    with connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT
                  (SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY likes)
                     FROM influencer_posts WHERE influencer_id = %s AND likes IS NOT NULL),
                  (SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY comments)
                     FROM influencer_posts WHERE influencer_id = %s AND comments IS NOT NULL),
                  (SELECT AVG(likes)
                     FROM influencer_posts WHERE influencer_id = %s AND likes IS NOT NULL),
                  (SELECT AVG(comments)
                     FROM influencer_posts WHERE influencer_id = %s AND comments IS NOT NULL),
                  (SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY views)
                     FROM influencer_posts WHERE influencer_id = %s AND views IS NOT NULL),
                  (SELECT AVG(views)
                     FROM influencer_posts WHERE influencer_id = %s AND views IS NOT NULL)
                """,
                (influencer_id,) * 6,
            )
            median_likes, median_comments, avg_likes, avg_comments, median_views, avg_views = cur.fetchone()
            cur.execute(
                """
                SELECT id, followers FROM influencer_metrics
                WHERE influencer_id = %s
                ORDER BY recorded_at DESC
                LIMIT 1
                """,
                (influencer_id,),
            )
            latest = cur.fetchone()
            if not latest:
                return
            metric_id, followers = latest
            engagement = None
            engagement_alt = None
            if followers and median_likes is not None:
                engagement = round((float(median_likes) / followers) * 100, 2)
                comments = float(median_comments or 0)
                engagement_alt = round(((float(median_likes) + comments) / followers) * 100, 2)
            cur.execute(
                """
                UPDATE influencer_metrics
                SET median_likes = COALESCE(%s, median_likes),
                    median_comments = COALESCE(%s, median_comments),
                    average_likes = COALESCE(%s, average_likes),
                    average_comments = COALESCE(%s, average_comments),
                    median_views = COALESCE(%s, median_views),
                    average_views = COALESCE(%s, average_views),
                    engagement_rate = COALESCE(%s, engagement_rate),
                    engagement_rate_alt = COALESCE(%s, engagement_rate_alt)
                WHERE id = %s
                """,
                (
                    int(round(median_likes)) if median_likes is not None else None,
                    int(round(median_comments)) if median_comments is not None else None,
                    int(round(avg_likes)) if avg_likes is not None else None,
                    int(round(avg_comments)) if avg_comments is not None else None,
                    int(round(median_views)) if median_views is not None else None,
                    int(round(avg_views)) if avg_views is not None else None,
                    engagement,
                    engagement_alt,
                    metric_id,
                ),
            )


def refresh_niches_from_posts(influencer_id: str) -> None:
    """Reclassify niches from stored post captions and hashtags once enrich fills them."""
    from app.processors.pipeline import niches_from_posts

    with connection() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                """
                SELECT caption, hashtags
                FROM influencer_posts
                WHERE influencer_id = %s
                """,
                (influencer_id,),
            )
            posts = list(cur.fetchall())
            captions = [row["caption"] for row in posts]
            tags: list[str] = []
            for row in posts:
                tags.extend(list(row["hashtags"] or []))
            niches = niches_from_posts(captions=captions, hashtags=tags)
            if not niches:
                return
            cur.execute("DELETE FROM influencer_niches WHERE influencer_id = %s", (influencer_id,))
            for item in niches:
                cur.execute(
                    """
                    INSERT INTO influencer_niches (influencer_id, niche, sub_niche)
                    VALUES (%s, %s, %s)
                    ON CONFLICT (influencer_id, niche) DO UPDATE SET
                      sub_niche = COALESCE(EXCLUDED.sub_niche, influencer_niches.sub_niche)
                    """,
                    (influencer_id, item["niche"], item.get("sub_niche")),
                )
            cur.execute(
                """
                UPDATE influencers
                SET niche = %s, sub_niche = %s, updated_at = NOW()
                WHERE id = %s
                """,
                (niches[0]["niche"], niches[0].get("sub_niche"), influencer_id),
            )


def mark_posts_queued(post_ids: list[str]) -> None:
    if not post_ids:
        return
    with connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE influencer_posts
                SET details_status = 'queued'
                WHERE id = ANY(%s::uuid[])
                """,
                (post_ids,),
            )


def mark_post_details_status(post_id: str, status: str) -> None:
    with connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE influencer_posts SET details_status = %s WHERE id = %s",
                (status, post_id),
            )


def pending_post_enrichment(limit: int) -> list[dict]:
    with connection() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                """
                SELECT p.id, p.influencer_id, p.post_url, i.username
                FROM influencer_posts p
                JOIN influencers i ON i.id = p.influencer_id
                WHERE p.post_url IS NOT NULL
                  AND p.details_status = 'pending'
                ORDER BY p.collected_at ASC
                LIMIT %s
                """,
                (limit,),
            )
            return [dict(r) for r in cur.fetchall()]


def save_processed(influencer_id: str, processed: dict) -> None:
    del influencer_id
    upsert_qualified(processed)

