from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any


class CollectionBlockedError(RuntimeError):
    """Raised when a public page is gated, rate-limited, or otherwise unavailable."""


@dataclass
class PostSnapshot:
    platform_post_id: str | None = None
    post_url: str | None = None
    post_type: str | None = None
    caption: str | None = None
    likes: int | None = None
    comments: int | None = None
    views: int | None = None
    published_at: str | None = None
    hashtags: list[str] = field(default_factory=list)


@dataclass
class CreatorSnapshot:
    platform: str
    username: str
    display_name: str | None = None
    profile_url: str | None = None
    profile_image_url: str | None = None
    bio: str | None = None
    followers: int | None = None
    following: int | None = None
    post_count: int | None = None
    is_verified: bool | None = None
    category: str | None = None
    website_url: str | None = None
    is_private: bool | None = None
    account_type: str | None = None
    pronouns: str | None = None
    location: str | None = None
    posts: list[PostSnapshot] = field(default_factory=list)
    blocked: bool = False
    block_reason: str | None = None
    related_following: list[str] = field(default_factory=list)
    related_followers: list[str] = field(default_factory=list)
    raw: dict[str, Any] = field(default_factory=dict)


class Collector(ABC):
    """Replaceable data-source interface. Do not couple the rest of the app to Playwright."""

    @abstractmethod
    def collect(self, *, username: str, platform: str, existing: dict[str, Any] | None) -> CreatorSnapshot:
        raise NotImplementedError
