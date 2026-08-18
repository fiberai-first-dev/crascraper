import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()


def _env(name: str, default: str | None = None) -> str:
    value = os.getenv(name, default)
    if value is None:
        raise RuntimeError(f"Missing environment variable: {name}")
    return value


DATABASE_URL = _env("DATABASE_URL", "postgres://crafter:crafter@localhost:5432/crafter")
RABBITMQ_URL = _env("RABBITMQ_URL", "amqp://crafter:crafter@localhost:5672")
COLLECTOR_MODE = os.getenv("COLLECTOR_MODE", "public").strip().lower()
SCRAPE_JOBS_QUEUE = os.getenv("SCRAPE_JOBS_QUEUE", "scrape.jobs")
SCRAPE_POSTS_QUEUE = os.getenv("SCRAPE_POSTS_QUEUE", "scrape.posts")
MAX_POST_ENRICH_BATCH = int(os.getenv("MAX_POST_ENRICH_BATCH", "12"))
PLAYWRIGHT_TIMEOUT_MS = int(os.getenv("PLAYWRIGHT_TIMEOUT_MS", "20000"))
MIN_FOLLOWERS = int(os.getenv("MIN_FOLLOWERS", "1000"))
RECENT_CONTENT_DAYS = int(os.getenv("RECENT_CONTENT_DAYS", "180"))
POLITE_DELAY_SECONDS = float(os.getenv("POLITE_DELAY_SECONDS", "3"))
TARGET_QUALIFIED = int(os.getenv("TARGET_QUALIFIED", "1000"))
WIKIDATA_ENABLED = os.getenv("WIKIDATA_ENABLED", "false").strip().lower() in {"1", "true", "yes"}
WIKIDATA_LIMIT = int(os.getenv("WIKIDATA_LIMIT", "0"))
SEED_CSV_PATH = os.getenv(
    "SEED_CSV_PATH",
    str(Path(__file__).resolve().parents[1] / "seeds" / "instagram_profiles.csv"),
)
EXTRA_SEED_URLS = os.getenv("EXTRA_SEED_URLS", "")
MAX_FOLLOWING_CANDIDATES = int(os.getenv("MAX_FOLLOWING_CANDIDATES", "80"))
MAX_FOLLOWER_CANDIDATES = int(os.getenv("MAX_FOLLOWER_CANDIDATES", "40"))
MAX_CANDIDATES = int(os.getenv("MAX_CANDIDATES", "5000"))
STALE_INFLIGHT_MINUTES = int(os.getenv("STALE_INFLIGHT_MINUTES", "30"))
DISCOVER_BATCH_SIZE = int(os.getenv("DISCOVER_BATCH_SIZE", "20"))
LEADER_LOCK_KEY = 87231001
