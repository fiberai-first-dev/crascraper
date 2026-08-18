from __future__ import annotations

import csv
from pathlib import Path
from urllib.parse import urlparse

from app.config.settings import EXTRA_SEED_URLS, SEED_CSV_PATH


def _username_from_url(url: str) -> str:
    path = urlparse(url).path.strip("/")
    return path.split("/")[0].lstrip("@").lower()


def load_seed_profiles(path: str | None = None) -> list[dict]:
    csv_path = Path(path or SEED_CSV_PATH)
    by_user: dict[str, dict] = {}
    if csv_path.exists():
        with csv_path.open(encoding="utf-8") as handle:
            reader = csv.DictReader(handle)
            for row in reader:
                username = (row.get("username") or "").strip().lstrip("@").lower()
                url = (row.get("url") or "").strip()
                if not username and url:
                    username = _username_from_url(url)
                if not username:
                    continue
                niches = [n.strip() for n in (row.get("niches") or "").replace(",", "|").split("|") if n.strip()]
                if username not in by_user:
                    by_user[username] = {
                        "username": username,
                        "url": url or f"https://www.instagram.com/{username}/",
                        "niches": [],
                    }
                for niche in niches:
                    if niche not in by_user[username]["niches"]:
                        by_user[username]["niches"].append(niche)
                if url:
                    by_user[username]["url"] = url

    for raw in EXTRA_SEED_URLS.split(","):
        token = raw.strip()
        if not token:
            continue
        if token.startswith("http"):
            username = _username_from_url(token)
            url = token if token.endswith("/") else f"{token}/"
        else:
            username = token.lstrip("@").lower()
            url = f"https://www.instagram.com/{username}/"
        if not username:
            continue
        if username not in by_user:
            by_user[username] = {"username": username, "url": url, "niches": []}

    return list(by_user.values())
