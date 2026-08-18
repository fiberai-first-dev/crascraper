from __future__ import annotations

import json
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from app.config.logging import logger
from app.config.settings import WIKIDATA_ENABLED, WIKIDATA_LIMIT

SPARQL_URL = "https://query.wikidata.org/sparql"
USER_AGENT = "CraScaper/1.0 (local influencer catalog MVP; permitted public Wikidata SPARQL)"

INDIA_QUERY = """
SELECT DISTINCT ?ig WHERE {{
  ?person wdt:P2003 ?ig .
  ?person wdt:P27 wd:Q668 .
}}
LIMIT {limit}
"""

FALLBACK_QUERY = """
SELECT DISTINCT ?ig WHERE {{
  ?person wdt:P2003 ?ig .
  ?person wdt:P106 ?occupation .
  FILTER(?occupation IN (wd:Q33999, wd:Q947873, wd:Q205375, wd:Q33231, wd:Q177220, wd:Q1930187, wd:Q639669, wd:Q43845))
}}
LIMIT {limit}
"""


def _normalize(value: str) -> str | None:
    text = (value or "").strip()
    if not text:
        return None
    if "instagram.com" in text.lower():
        text = text.rstrip("/").split("/")[-1]
    text = text.lstrip("@").strip().lower()
    if not text or " " in text:
        return None
    return text


def _run(query: str) -> list[str]:
    params = urlencode({"query": query, "format": "json"})
    req = Request(
        f"{SPARQL_URL}?{params}",
        headers={"Accept": "application/sparql-results+json", "User-Agent": USER_AGENT},
        method="GET",
    )
    with urlopen(req, timeout=60) as resp:
        payload = json.loads(resp.read().decode("utf-8"))
    usernames: list[str] = []
    seen: set[str] = set()
    for binding in payload.get("results", {}).get("bindings", []):
        raw = binding.get("ig", {}).get("value", "")
        username = _normalize(raw)
        if not username or username in seen:
            continue
        seen.add(username)
        usernames.append(username)
    return usernames


def fetch_wikidata_usernames(limit: int | None = None) -> list[str]:
    if not WIKIDATA_ENABLED:
        return []
    cap = limit or WIKIDATA_LIMIT
    try:
        names = _run(INDIA_QUERY.format(limit=cap))
        logger.info("Wikidata India Instagram usernames: %s", len(names))
        if len(names) < cap:
            extra = _run(FALLBACK_QUERY.format(limit=cap - len(names)))
            have = set(names)
            for name in extra:
                if name not in have:
                    names.append(name)
                    have.add(name)
            logger.info("Wikidata usernames after fallback: %s", len(names))
        return names[:cap]
    except Exception as exc:  # noqa: BLE001
        logger.warning("Wikidata discovery skipped: %s", exc)
        return []
