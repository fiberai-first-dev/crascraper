from __future__ import annotations


def follower_growth_pct(history: list[int]) -> float | None:
    if len(history) < 2:
        return None
    first, last = history[0], history[-1]
    if not first:
        return None
    return round(((last - first) / first) * 100, 2)
