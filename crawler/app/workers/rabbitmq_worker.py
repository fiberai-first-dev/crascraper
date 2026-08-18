from __future__ import annotations

import json
import time

from app.config.logging import logger
from app.config.settings import (
    MAX_POST_ENRICH_BATCH,
    POLITE_DELAY_SECONDS,
    SCRAPE_JOBS_QUEUE,
    SCRAPE_POSTS_QUEUE,
)
from app.discovery.bootstrap import bootstrap_candidates, enqueue_pending, enqueue_pending_posts
from app.publishers.database import run_with_leader_lock, wait_for_db, wait_for_schema
from app.publishers.rabbit import connect, publish_json
from app.workers.job_handler import handle_job


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
    for item in followups:
        queue = SCRAPE_POSTS_QUEUE if item.get("type") == "enrich_post" else SCRAPE_JOBS_QUEUE
        publish_json(channel, item, queue=queue)


def run_worker() -> None:
    wait_for_db()
    wait_for_schema()
    connection, channel = _wait_for_rabbit()

    def leader_startup() -> None:
        bootstrap_candidates()
        enqueue_pending(channel)
        enqueue_pending_posts(channel)

    if run_with_leader_lock(leader_startup):
        logger.info("This crawler replica ran leader startup")
    else:
        logger.info("Another crawler replica already started; this one only consumes queues")

    logger.info("Crawler listening on %s and %s", SCRAPE_JOBS_QUEUE, SCRAPE_POSTS_QUEUE)

    def on_message(ch, method, _properties, body):
        try:
            message = json.loads(body.decode("utf-8"))
            followups = handle_job(message) or []
            _publish_followups(ch, followups)
            if POLITE_DELAY_SECONDS > 0:
                time.sleep(POLITE_DELAY_SECONDS)
            if message.get("type") not in {"enrich_post"}:
                enqueue_pending(ch)
            ch.basic_ack(delivery_tag=method.delivery_tag)
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

    channel.basic_consume(queue=SCRAPE_JOBS_QUEUE, on_message_callback=on_message)
    channel.basic_consume(queue=SCRAPE_POSTS_QUEUE, on_message_callback=on_message)
    try:
        channel.start_consuming()
    except KeyboardInterrupt:
        channel.stop_consuming()
        connection.close()
