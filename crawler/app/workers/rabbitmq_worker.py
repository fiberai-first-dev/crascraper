from __future__ import annotations

import json
import time

from app.collectors.base import RateLimitedError
from app.config.logging import logger
from app.config.settings import (
    POLITE_DELAY_SECONDS,
    SCRAPE_JOBS_QUEUE,
    SCRAPE_POSTS_QUEUE,
)
from app.discovery.bootstrap import bootstrap_candidates, enqueue_pending, enqueue_pending_posts
from app.publishers import database as db
from app.publishers.database import run_with_leader_lock, wait_for_db, wait_for_schema
from app.publishers.rabbit import connect, publish_json
from app.workers.job_handler import handle_job

PAUSE_POLL_SECONDS = 60


def _wait_for_rabbit(retries: int = 40):
    last = None
    for _ in range(retries):
        try:
            return connect()
        except Exception as exc:  # noqa: BLE001
            last = exc
            logger.warning("Waiting for RabbitMQ: %s", exc)
            time.sleep(1)
    raise RuntimeError(f"RabbitMQ not ready: {last}")


def _publish_followups(channel, followups: list[dict]) -> None:
    if db.crawler_is_paused():
        return
    for item in followups:
        queue = SCRAPE_POSTS_QUEUE if item.get("type") == "enrich_post" else SCRAPE_JOBS_QUEUE
        publish_json(channel, item, queue=queue)


def _stop_after_rate_limit(ch, method, exc: Exception) -> None:
    db.pause_crawler(str(exc))
    logger.error(
        "Rate limited. Stopping all crawler fetching. Resume with: "
        "UPDATE crawler_control SET paused = false, reason = NULL, paused_at = NULL, updated_at = NOW() WHERE id = 1;"
    )
    try:
        ch.basic_ack(delivery_tag=method.delivery_tag)
    except Exception:
        pass
    try:
        ch.stop_consuming()
    except Exception:
        pass


def run_worker() -> None:
    wait_for_db()
    wait_for_schema()

    def leader_startup() -> None:
        if db.crawler_is_paused():
            logger.warning("Leader startup skipped enqueue; crawler is paused after a rate limit")
            return
        bootstrap_candidates()
        connection, channel = _wait_for_rabbit()
        try:
            enqueue_pending(channel)
            enqueue_pending_posts(channel)
        finally:
            connection.close()

    if run_with_leader_lock(leader_startup):
        logger.info("This crawler replica ran leader startup")
    else:
        logger.info("Another crawler replica already started; this one only consumes queues")

    while True:
        if db.crawler_is_paused():
            logger.warning(
                "Crawler paused (%s). Not fetching. Rechecking in %ss.",
                db.crawler_pause_reason() or "rate limit",
                PAUSE_POLL_SECONDS,
            )
            time.sleep(PAUSE_POLL_SECONDS)
            continue

        connection, channel = _wait_for_rabbit()
        enqueue_pending(channel)
        enqueue_pending_posts(channel)
        logger.info("Crawler listening on %s and %s", SCRAPE_JOBS_QUEUE, SCRAPE_POSTS_QUEUE)

        def on_message(ch, method, _properties, body):
            if db.crawler_is_paused():
                ch.basic_nack(delivery_tag=method.delivery_tag, requeue=True)
                ch.stop_consuming()
                return
            try:
                message = json.loads(body.decode("utf-8"))
                followups = handle_job(message) or []
                _publish_followups(ch, followups)
                if POLITE_DELAY_SECONDS > 0:
                    time.sleep(POLITE_DELAY_SECONDS)
                if message.get("type") not in {"enrich_post"}:
                    enqueue_pending(ch)
                ch.basic_ack(delivery_tag=method.delivery_tag)
            except RateLimitedError as exc:
                _stop_after_rate_limit(ch, method, exc)
            except Exception as exc:  # noqa: BLE001
                logger.error("Worker error: %s", exc)
                try:
                    parsed = json.loads(body.decode("utf-8"))
                    if parsed.get("type") not in {"enrich_post"}:
                        enqueue_pending(ch)
                except Exception:
                    pass
                ch.basic_ack(delivery_tag=method.delivery_tag)
                if POLITE_DELAY_SECONDS > 0:
                    time.sleep(POLITE_DELAY_SECONDS)
                if db.crawler_is_paused():
                    ch.stop_consuming()

        channel.basic_consume(queue=SCRAPE_JOBS_QUEUE, on_message_callback=on_message)
        channel.basic_consume(queue=SCRAPE_POSTS_QUEUE, on_message_callback=on_message)
        try:
            channel.start_consuming()
        except KeyboardInterrupt:
            channel.stop_consuming()
            connection.close()
            return
        finally:
            try:
                if not connection.is_closed:
                    connection.close()
            except Exception:
                pass
