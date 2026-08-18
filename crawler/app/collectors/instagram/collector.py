from __future__ import annotations

import re
import time
from typing import Any
from urllib.parse import parse_qs, unquote, urlparse

from app.collectors.base import CollectionBlockedError, Collector, CreatorSnapshot, PostSnapshot, RateLimitedError
from app.collectors.instagram.parser import (
    _bio_from_visible,
    apply_visible_text,
    extract_graph_usernames,
    extract_hashtags,
    parse_public_html,
    parse_public_post,
)
from app.config.logging import logger
from app.config.settings import (
    MAX_FOLLOWER_CANDIDATES,
    MAX_FOLLOWING_CANDIDATES,
    PLAYWRIGHT_TIMEOUT_MS,
    POLITE_DELAY_SECONDS,
)

_CLOSE_SELECTORS = (
    'div[role="dialog"] [aria-label="Close"]',
    'div[role="dialog"] svg[aria-label="Close"]',
    'button[aria-label="Close"]',
    'div[role="dialog"] button:has-text("Not now")',
    'button:has-text("Not Now")',
    'button:has-text("Decline optional cookies")',
    'button:has-text("Allow all cookies")',
)
_STAT_TITLE_RE = re.compile(r"^\d[\d,]*$")
_POST_HREF_RE = re.compile(r"/(p|reel|reels)/([A-Za-z0-9_-]+)", re.I)


def _raise_for_http_status(status: int, what: str) -> None:
    if status == 429:
        raise RateLimitedError(f"{what} returned HTTP 429")
    if status in {401, 403, 404, 503}:
        raise CollectionBlockedError(f"{what} returned HTTP {status}")


class InstagramPublicCollector(Collector):
    """Collects only publicly available profile metadata.

    Does not log in, solve CAPTCHAs, rotate identities, spoof clients,
    or otherwise circumvent platform protections. Gated pages fail cleanly.
    A signup overlay is closed when a Close control is present; profile
    header stats behind that overlay are still public page content.
    """

    def collect(self, *, username: str, platform: str, existing: dict[str, Any] | None) -> CreatorSnapshot:
        from playwright.sync_api import sync_playwright

        url = f"https://www.instagram.com/{username}/"
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page(locale="en-US")
            try:
                response = page.goto(url, wait_until="domcontentloaded", timeout=PLAYWRIGHT_TIMEOUT_MS)
                status = response.status if response else 0
                _raise_for_http_status(status, "Public profile")
                self._dismiss_public_overlays(page)
                self._wait_for_profile_header(page)
                self._dismiss_public_overlays(page)
                self._wait_for_post_grid(page)

                html = page.content()
                visible = self._visible_profile_text(page)
                extra_followers, extra_following, extra_posts = self._header_title_counts(page)
                parsed = parse_public_html(html, page.url, username)
                parsed = apply_visible_text(
                    parsed,
                    visible,
                    html,
                    extra_followers=extra_followers,
                    extra_following=extra_following,
                    extra_posts=extra_posts,
                    extra_image=self._profile_image(page),
                    extra_bio=self._header_bio(page, username, parsed.display_name),
                    extra_display_name=parsed.display_name,
                    extra_website=self._header_website(page),
                    grid_posts=self._grid_posts(page),
                    username=username,
                )
                if parsed.blocked or (
                    parsed.followers is None and parsed.display_name is None and parsed.bio is None
                ):
                    logger.info(
                        "Public parse @%s url=%s followers=%s visible=%s",
                        username,
                        page.url,
                        parsed.followers,
                        " | ".join((visible or "").splitlines()[:8])[:240],
                    )
                if parsed.blocked:
                    raise CollectionBlockedError(parsed.block_reason or "Public collection blocked")
                if parsed.followers is None and parsed.display_name is None and parsed.bio is None:
                    raise CollectionBlockedError("No public profile metadata was available")
                return CreatorSnapshot(
                    platform=platform,
                    username=username,
                    display_name=parsed.display_name,
                    profile_url=url,
                    profile_image_url=parsed.profile_image_url,
                    bio=parsed.bio,
                    followers=parsed.followers,
                    following=parsed.following,
                    post_count=parsed.post_count,
                    is_verified=parsed.is_verified,
                    category=parsed.category,
                    website_url=parsed.website_url,
                    is_private=parsed.is_private,
                    account_type=parsed.account_type,
                    pronouns=parsed.pronouns,
                    location=parsed.location,
                    posts=parsed.posts,
                    related_following=list(parsed.related_following),
                    related_followers=list(parsed.related_followers),
                    raw=dict(parsed.extra or {"source": "instagram_public_html"}),
                )
            finally:
                browser.close()

    def collect_post(self, post_url: str) -> PostSnapshot:
        """Public post/reel page. Closes signup overlay; does not log in."""
        from playwright.sync_api import sync_playwright

        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page(locale="en-US")
            try:
                response = page.goto(post_url, wait_until="domcontentloaded", timeout=PLAYWRIGHT_TIMEOUT_MS)
                status = response.status if response else 0
                _raise_for_http_status(status, "Public post")
                self._dismiss_public_overlays(page)
                try:
                    page.locator("h1, article, [role='dialog']").first.wait_for(timeout=8000)
                except Exception:
                    pass
                self._dismiss_public_overlays(page)
                html = page.content()
                try:
                    visible = page.inner_text("body")
                except Exception:
                    visible = ""
                parsed = parse_public_post(html, visible, page.url or post_url)
                if not parsed.caption and parsed.likes is None and parsed.views is None:
                    logger.info("Public post parse empty url=%s visible=%s", page.url, " | ".join(visible.splitlines()[:6])[:240])
                    raise CollectionBlockedError("No public post details were available")
                return parsed
            finally:
                browser.close()

    def discover_related(self, username: str) -> tuple[list[str], list[str]]:
        """Permitted discovery: public following first. Followers only if following is empty/gated."""
        from playwright.sync_api import sync_playwright

        following: list[str] = []
        followers: list[str] = []
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page(locale="en-US")
            try:
                following = self._public_graph_page(page, username, "following")[:MAX_FOLLOWING_CANDIDATES]
                if not following:
                    followers = self._public_graph_page(page, username, "followers")[:MAX_FOLLOWER_CANDIDATES]
            finally:
                browser.close()
        return following, followers

    def _dismiss_public_overlays(self, page) -> None:
        """Close cookie/signup dialogs when a Close control exists. Does not log in."""
        for sel in _CLOSE_SELECTORS:
            try:
                loc = page.locator(sel).first
                if loc.is_visible(timeout=400):
                    loc.click(timeout=1500)
            except Exception:
                continue
        try:
            page.keyboard.press("Escape")
        except Exception:
            pass

    def _wait_for_profile_header(self, page) -> None:
        try:
            page.locator("header").first.wait_for(state="visible", timeout=8000)
        except Exception:
            pass
        try:
            page.get_by_text(re.compile(r"followers", re.I)).first.wait_for(timeout=12000)
        except Exception:
            pass

    def _wait_for_post_grid(self, page) -> None:
        try:
            page.locator("main a[href*='/p/'], main a[href*='/reel/']").first.wait_for(timeout=8000)
        except Exception:
            pass

    def _profile_image(self, page) -> str | None:
        for sel in ('header img', 'img[alt*="profile picture" i]'):
            try:
                src = page.locator(sel).first.get_attribute("src", timeout=800)
            except Exception:
                src = None
            if src and src.startswith("http"):
                return src.replace("&amp;", "&")
        return None

    def _header_bio(self, page, username: str, display_name: str | None) -> str | None:
        try:
            visible = page.locator("header").first.inner_text(timeout=2500)
        except Exception:
            return None
        return _bio_from_visible(visible, username=username, display_name=display_name)

    def _grid_posts(self, page) -> list[PostSnapshot]:
        posts: list[PostSnapshot] = []
        seen: set[str] = set()
        try:
            locators = page.locator("main a[href*='/p/'], main a[href*='/reel/']")
            count = min(locators.count(), 12)
        except Exception:
            return posts
        for idx in range(count):
            try:
                href = locators.nth(idx).get_attribute("href") or ""
            except Exception:
                continue
            match = _POST_HREF_RE.search(href)
            if not match:
                continue
            kind, code = match.group(1).lower(), match.group(2)
            if code in seen:
                continue
            seen.add(code)
            caption = None
            try:
                alt = locators.nth(idx).locator("img").first.get_attribute("alt", timeout=400)
                if alt and "profile picture" not in alt.lower():
                    caption = alt.strip()
            except Exception:
                pass
            path = "reel" if kind.startswith("reel") else "p"
            posts.append(
                PostSnapshot(
                    platform_post_id=code,
                    post_url=f"https://www.instagram.com/{path}/{code}/",
                    post_type="reel" if path == "reel" else "post",
                    caption=caption,
                    hashtags=extract_hashtags(caption),
                )
            )
        return posts

    def _visible_profile_text(self, page) -> str:
        chunks: list[str] = []
        try:
            chunks.append(page.locator("header").first.inner_text(timeout=2500))
        except Exception:
            pass
        try:
            chunks.append(page.inner_text("body"))
        except Exception:
            pass
        return "\n".join(chunk for chunk in chunks if chunk)

    def _header_website(self, page) -> str | None:
        try:
            locators = page.locator("header a[href]")
            count = min(locators.count(), 12)
        except Exception:
            return None
        for idx in range(count):
            try:
                href = locators.nth(idx).get_attribute("href") or ""
            except Exception:
                continue
            url = self._unwrap_instagram_link(href)
            if url:
                return url
        return None

    def _unwrap_instagram_link(self, href: str) -> str | None:
        if not href:
            return None
        parsed = urlparse(href)
        host = (parsed.netloc or "").lower()
        if "l.instagram.com" in host:
            target = parse_qs(parsed.query).get("u", [None])[0]
            return unquote(target) if target else None
        if host.endswith("instagram.com") or href.startswith("/"):
            return None
        if href.startswith("http"):
            return href
        return None

    def _header_title_counts(self, page) -> tuple[int | None, int | None, int | None]:
        """Exact counts from title attributes on the public header (e.g. title='4123456')."""
        followers = following = posts = None
        try:
            nodes = page.locator("header [title]").all()[:24]
        except Exception:
            return None, None, None
        for node in nodes:
            try:
                title = (node.get_attribute("title") or "").strip()
                if not _STAT_TITLE_RE.fullmatch(title):
                    continue
                count = int(title.replace(",", ""))
                context = f"{title} {node.evaluate('el => (el.parentElement && el.parentElement.innerText) || el.innerText')}"
            except Exception:
                continue
            low = context.lower()
            if "follower" in low and followers is None:
                followers = count
            elif "following" in low and following is None:
                following = count
            elif "post" in low and posts is None:
                posts = count
        return followers, following, posts

    def _public_graph_page(self, page, username: str, kind: str) -> list[str]:
        if POLITE_DELAY_SECONDS > 0:
            time.sleep(POLITE_DELAY_SECONDS)
        url = f"https://www.instagram.com/{username}/{kind}/"
        try:
            response = page.goto(url, wait_until="domcontentloaded", timeout=PLAYWRIGHT_TIMEOUT_MS)
            status = response.status if response else 0
            if status == 429:
                raise RateLimitedError(f"Public {kind} page for @{username} returned HTTP 429")
            if status in {401, 403, 404, 503}:
                logger.info("Public %s page for @%s returned HTTP %s; skip hop", kind, username, status)
                return []
            html = page.content()
            final_url = page.url or ""
            if "accounts/login" in final_url.lower() or "/login" in final_url.lower():
                logger.info("Public %s page for @%s is login-gated; skip hop", kind, username)
                return []
            lowered = html.lower()
            if "checkpoint" in lowered and "login" in lowered[:8000]:
                logger.info("Public %s page for @%s hit a checkpoint; skip hop", kind, username)
                return []
            handles = extract_graph_usernames(html, username)
            logger.info("Public %s hop for @%s found %s handles", kind, username, len(handles))
            return handles
        except RateLimitedError:
            raise
        except Exception as exc:  # noqa: BLE001
            logger.info("Public %s hop for @%s failed: %s", kind, username, exc)
            return []
