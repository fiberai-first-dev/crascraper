from app.collectors.base import Collector
from app.collectors.instagram.collector import InstagramPublicCollector


def get_collector() -> Collector:
    return InstagramPublicCollector()

