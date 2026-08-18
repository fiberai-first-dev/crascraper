from __future__ import annotations

import json

import pika

from app.config.settings import RABBITMQ_URL, SCRAPE_JOBS_QUEUE, SCRAPE_POSTS_QUEUE


def connect():
    params = pika.URLParameters(RABBITMQ_URL)
    params.heartbeat = 60
    connection = pika.BlockingConnection(params)
    channel = connection.channel()
    channel.queue_declare(queue=SCRAPE_JOBS_QUEUE, durable=True)
    channel.queue_declare(queue=SCRAPE_POSTS_QUEUE, durable=True)
    channel.basic_qos(prefetch_count=1)
    return connection, channel


def publish_json(channel, payload: dict, queue: str | None = None) -> None:
    channel.basic_publish(
        exchange="",
        routing_key=queue or SCRAPE_JOBS_QUEUE,
        body=json.dumps(payload).encode("utf-8"),
        properties=pika.BasicProperties(delivery_mode=2, content_type="application/json"),
    )
