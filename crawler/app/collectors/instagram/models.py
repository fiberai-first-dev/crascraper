from __future__ import annotations

from typing import Any
from dataclasses import dataclass, field

from app.collectors.base import PostSnapshot


@dataclass
class PublicProfileParse:
    display_name: str | None = None
    bio: str | None = None
    profile_image_url: str | None = None
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
    extra: dict[str, Any] = field(default_factory=dict)
    posts: list[PostSnapshot] = field(default_factory=list)
    related_following: list[str] = field(default_factory=list)
    related_followers: list[str] = field(default_factory=list)
    blocked: bool = False
    block_reason: str | None = None
