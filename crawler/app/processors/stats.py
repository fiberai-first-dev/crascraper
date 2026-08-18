from __future__ import annotations

from statistics import mean, median


def numeric(values: list[int | float | None]) -> list[float]:
    return [float(v) for v in values if isinstance(v, (int, float))]


def mean_or_none(values: list[int | float | None]) -> float | None:
    nums = numeric(values)
    if not nums:
        return None
    return mean(nums)


def median_or_none(values: list[int | float | None]) -> float | None:
    nums = numeric(values)
    if not nums:
        return None
    return median(nums)


def as_int(value: float | None) -> int | None:
    if value is None:
        return None
    return int(round(value))
