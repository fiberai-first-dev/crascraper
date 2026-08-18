from __future__ import annotations

import re

from app.collectors.base import CreatorSnapshot

MENTION_RE = re.compile(r"@([A-Za-z0-9._]{2,30})")
SKIP = {"instagram", "facebook", "meta", "reels", "explore", "stories"}


def extract_mentions(snapshot: CreatorSnapshot, *, limit: int = 25) -> list[str]:
    texts = [snapshot.bio or "", snapshot.username or ""]
    texts.extend(p.caption or "" for p in snapshot.posts)
    found: list[str] = []
    seen = {snapshot.username.lower()} if snapshot.username else set()
    for text in texts:
        for match in MENTION_RE.findall(text):
            username = match.strip(".").lower()
            if not username or username in seen or username in SKIP:
                continue
            if username.endswith("."):
                continue
            seen.add(username)
            found.append(username)
            if len(found) >= limit:
                return found
    return found
