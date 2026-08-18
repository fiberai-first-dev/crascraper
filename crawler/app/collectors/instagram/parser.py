from __future__ import annotations

import json
import re
from html import unescape

from app.collectors.base import PostSnapshot
from app.collectors.instagram.models import PublicProfileParse

COUNT_TOKEN = r"([\d.,]+\s*[kmb]?)"
FOLLOWERS_RE = re.compile(COUNT_TOKEN + r"\s*Followers", re.I)
FOLLOWING_RE = re.compile(COUNT_TOKEN + r"\s*Following", re.I)
POSTS_RE = re.compile(COUNT_TOKEN + r"\s*Posts", re.I)
OG_TITLE = re.compile(r'<meta[^>]+property=["\']og:title["\'][^>]+content=["\']([^"\']+)["\']', re.I)
OG_DESC = re.compile(r'<meta[^>]+property=["\']og:description["\'][^>]+content=["\']([^"\']+)["\']', re.I)
OG_IMAGE = re.compile(r'<meta[^>]+property=["\']og:image["\'][^>]+content=["\']([^"\']+)["\']', re.I)
META_DESC = re.compile(r'<meta[^>]+name=["\']description["\'][^>]+content=["\']([^"\']+)["\']', re.I)
TIME_RE = re.compile(r'<time[^>]+datetime=["\']([^"\']+)["\']', re.I)
CAPTION_RE = re.compile(r'<img[^>]+alt=["\']([^"\']+)["\']', re.I)
GRID_POST_RE = re.compile(
    r'href="(?:https://www\.instagram\.com)?/(?:[A-Za-z0-9._]+/)?(p|reel|reels)/([A-Za-z0-9_-]+)/?',
    re.I,
)
HREF_RE = re.compile(
    r'href="/(?!accounts/|explore/|reels/|p/|stories/|legal/|reel/)([A-Za-z0-9._]{2,30})/?["\']'
)
USERNAME_JSON_RE = re.compile(r'"username"\s*:\s*"([A-Za-z0-9._]{2,30})"')
FOLLOW_EDGE_RE = re.compile(
    r'"(edge_follow|edge_followed_by)"\s*:\s*\{.*?"edges"\s*:\s*\[(.*?)\]',
    re.S,
)
FOLLOWED_BY_COUNT_RE = re.compile(r'"edge_followed_by"\s*:\s*\{\s*"count"\s*:\s*(\d+)')
FOLLOW_COUNT_RE = re.compile(r'"edge_follow"\s*:\s*\{\s*"count"\s*:\s*(\d+)')
FOLLOWER_COUNT_JSON_RE = re.compile(r'"follower_count"\s*:\s*(\d+)')
FOLLOWING_COUNT_JSON_RE = re.compile(r'"following_count"\s*:\s*(\d+)')
MEDIA_COUNT_JSON_RE = re.compile(r'"media_count"\s*:\s*(\d+)')
BIOGRAPHY_JSON_RE = re.compile(r'"biography"\s*:\s*"((?:\\.|[^"\\])*)"')
CATEGORY_JSON_RE = re.compile(r'"(?:category_name|business_category_name)"\s*:\s*"((?:\\.|[^"\\])*)"')
EXTERNAL_URL_JSON_RE = re.compile(r'"external_url"\s*:\s*(?:null|"((?:\\.|[^"\\])*)")')
IS_PRIVATE_JSON_RE = re.compile(r'"is_private"\s*:\s*(true|false)', re.I)
IS_BUSINESS_JSON_RE = re.compile(r'"is_business_account"\s*:\s*(true|false)', re.I)
IS_PROFESSIONAL_JSON_RE = re.compile(r'"is_professional_account"\s*:\s*(true|false)', re.I)
PRONOUNS_JSON_RE = re.compile(r'"pronouns"\s*:\s*"((?:\\.|[^"\\])*)"')
CITY_NAME_JSON_RE = re.compile(r'"city_name"\s*:\s*"((?:\\.|[^"\\])*)"')
ADDRESS_JSON_RE = re.compile(r'"business_address_json"\s*:\s*"((?:\\.|[^"\\])*)"')
LANGUAGE_JSON_RE = re.compile(r'"language"\s*:\s*"([a-zA-Z-]{2,12})"')
HIGHLIGHT_COUNT_JSON_RE = re.compile(r'"highlight_reel_count"\s*:\s*(\d+)')
HAS_CLIPS_JSON_RE = re.compile(r'"has_clips"\s*:\s*(true|false)', re.I)
EMBEDS_DISABLED_JSON_RE = re.compile(r'"is_embeds_disabled"\s*:\s*(true|false)', re.I)
HASHTAG_RE = re.compile(r"(?:^|[^\w])#([\w]{2,60})", re.UNICODE)
BIO_URL_RE = re.compile(r"(https?://[^\s<>\"']+|(?:www\.)[a-z0-9.-]+\.[a-z]{2,}[^\s<>\"']*)", re.I)
IG_CATEGORY_NAMES = {
    "digital creator",
    "video creator",
    "content creator",
    "entrepreneur",
    "public figure",
    "artist",
    "musician/band",
    "health/beauty",
    "product/service",
    "blogger",
    "personal blog",
    "community",
    "media/news company",
    "education",
    "fitness model",
    "photographer",
    "writer",
    "journalist",
    "politician",
    "athlete",
    "coach",
    "consultant",
    "designer",
    "restaurant",
    "hotel",
    "author",
    "actor",
    "comedian",
    "gamer",
    "producer",
    "editor",
}
VISIBLE_STATS_RE = re.compile(
    r"([\d.,]+\s*[kmb]?)\s*posts?\b[\s\u00a0]+([\d.,]+\s*[kmb]?)\s*followers?\b[\s\u00a0]+([\d.,]+\s*[kmb]?)\s*following\b",
    re.I,
)
STAT_TITLE_GAP = r"(?:(?!title=)(?!\bfollowers\b)(?!\bfollowing\b)(?!\bposts\b).){0,160}"
FOLLOWER_TITLE_RE = re.compile(rf'title="([\d,]+)"{STAT_TITLE_GAP}followers', re.I | re.S)
FOLLOWING_TITLE_RE = re.compile(rf'title="([\d,]+)"{STAT_TITLE_GAP}following', re.I | re.S)
POSTS_TITLE_RE = re.compile(rf'title="([\d,]+)"{STAT_TITLE_GAP}posts', re.I | re.S)
SIGNUP_NOISE_RE = re.compile(
    r"sign up|log in|never miss a post|terms of use|privacy policy|see photos, videos",
    re.I,
)

# Patterns that indicate og:description / bio text is not a real bio (noise)
OG_BIO_NOISE = re.compile(
    r"^(?:instagram photos? and videos?|see instagram photos?|\d+\s*(?:follower|following|post))",
    re.I,
)

# Per-post JSON stats: likes, comments, video_view_count, is_video
LIKE_COUNT_JSON_RE = re.compile(r'"like_count"\s*:\s*(\d+)')
COMMENT_COUNT_JSON_RE = re.compile(r'"comment_count"\s*:\s*(\d+)')
VIEW_COUNT_JSON_RE = re.compile(r'"video_view_count"\s*:\s*(\d+)')
PLAY_COUNT_JSON_RE = re.compile(r'"play_count"\s*:\s*(\d+)')
IG_PLAY_COUNT_JSON_RE = re.compile(r'"ig_play_count"\s*:\s*(\d+)')
VIDEO_PLAY_COUNT_JSON_RE = re.compile(r'"video_play_count"\s*:\s*(\d+)')
PLAY_COUNT_ALT_JSON_RE = re.compile(r'"(?:fb_play_count|view_count)"\s*:\s*(\d+)')
IS_VIDEO_JSON_RE = re.compile(r'"is_video"\s*:\s*(true|false)', re.I)
PRODUCT_TYPE_JSON_RE = re.compile(r'"product_type"\s*:\s*"([^"]+)"')
VERIFIED_JSON_RE = re.compile(r'"is_verified"\s*:\s*(true|false)', re.I)
VERIFIED_BADGE_RE = re.compile(r'verified[_\-\s]?badge|aria-label=["\']verified["\']', re.I)

ARIA_FOLLOWERS_RE = re.compile(r'aria-label="([^"]*followers[^"]*)"', re.I)
ARIA_FOLLOWING_RE = re.compile(r'aria-label="([^"]*following[^"]*)"', re.I)
ARIA_POSTS_RE = re.compile(r'aria-label="([^"]*posts[^"]*)"', re.I)
HANDLE_RE = re.compile(r"^[a-z0-9](?:[a-z0-9._]{0,28}[a-z0-9])?$")
SKIP_HANDLES = {
    "instagram",
    "accounts",
    "explore",
    "reels",
    "stories",
    "direct",
    "about",
    "legal",
    "privacy",
    "emailsignup",
    "popular",
    "trending",
    "suggested",
    "directory",
    "nametag",
    "developer",
    "developers",
    "graphql",
    "static",
    "session",
    "challenge",
    "oauth",
    "help",
    "support",
    "blog",
    "press",
    "jobs",
    "terms",
    "locations",
    "tv",
    "live",
    "music",
    "shop",
    "shopping",
    "tagged",
    "guides",
    "highlights",
    "inbox",
    "activity",
    "notifications",
    "settings",
    "edit",
    "create",
    "share",
    "hashtag",
    "hashtags",
    "tags",
    "download",
    "android",
    "ios",
    "facebook",
    "meta",
    "threads",
    "layout",
    "lite",
    "web",
    "api",
    "push",
    "reel",
    "p",
    "s",
    "www",
    "http",
    "https",
    "mailto",
    "tel",
    "footer",
    "header",
    "login",
    "signup",
    "register",
    "logout",
    "home",
    "search",
    "discover",
}


def is_valid_username(username: str) -> bool:
    name = (username or "").strip().lstrip("@").strip(".").lower()
    if not name or name in SKIP_HANDLES:
        return False
    if not HANDLE_RE.fullmatch(name):
        return False
    if ".." in name:
        return False
    return True


def extract_grid_posts(html: str) -> list[PostSnapshot]:
    """Recent posts from the public profile grid (/p/ and /reel/ links)."""
    posts: list[PostSnapshot] = []
    seen: set[str] = set()
    for kind, code in GRID_POST_RE.findall(html or ""):
        if code in seen or len(posts) >= 12:
            continue
        seen.add(code)
        path = "reel" if kind.lower().startswith("reel") else "p"
        caption = None
        nearby = re.search(
            rf"{re.escape(code)}[\s\S]{{0,1500}}?<img[^>]+alt=\"([^\"]*)\"",
            html or "",
            re.I,
        )
        if nearby:
            alt = unescape(nearby.group(1)).strip()
            if alt and "profile picture" not in alt.lower():
                caption = alt
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


def extract_hashtags(*texts: str | None) -> list[str]:
    seen: set[str] = set()
    tags: list[str] = []
    for text in texts:
        for tag in HASHTAG_RE.findall(text or ""):
            name = tag.lower().strip("_")
            if len(name) < 2 or name in seen:
                continue
            seen.add(name)
            tags.append(name)
    return tags


def extract_related_usernames(html: str, self_username: str) -> tuple[list[str], list[str]]:
    """Handles from public follow-graph JSON only. Page nav links like /popular/ are ignored."""
    self_name = (self_username or "").lower()
    following: list[str] = []
    followers: list[str] = []
    seen: set[str] = {self_name, *SKIP_HANDLES}

    def take(bucket: list[str], username: str) -> None:
        name = username.strip(".").lower()
        if not is_valid_username(name) or name in seen:
            return
        seen.add(name)
        bucket.append(name)

    for block_name, blob in FOLLOW_EDGE_RE.findall(html):
        bucket = following if block_name == "edge_follow" else followers
        for name in USERNAME_JSON_RE.findall(blob):
            take(bucket, name)

    return following, followers


def extract_graph_usernames(html: str, self_username: str) -> list[str]:
    """Handles visible on a public following/followers page. Empty if the page is gated."""
    self_name = (self_username or "").lower()
    found: list[str] = []
    seen: set[str] = {self_name, *SKIP_HANDLES}
    for name in [*USERNAME_JSON_RE.findall(html), *HREF_RE.findall(html)]:
        handle = name.strip(".").lower()
        if not is_valid_username(handle) or handle in seen:
            continue
        seen.add(handle)
        found.append(handle)
    return found


def _parse_count(raw: str | None) -> int | None:
    if not raw:
        return None
    text = raw.strip().lower().replace(",", "").replace(" ", "")
    multiplier = 1
    if text.endswith("m"):
        multiplier = 1_000_000
        text = text[:-1]
    elif text.endswith("k"):
        multiplier = 1_000
        text = text[:-1]
    try:
        return int(round(float(text) * multiplier))
    except ValueError:
        return None


def _first_int(regex: re.Pattern[str], text: str) -> int | None:
    match = regex.search(text or "")
    if not match:
        return None
    try:
        return int(match.group(1))
    except ValueError:
        return None


def _count_from_aria(regex: re.Pattern[str], text: str) -> int | None:
    match = regex.search(text or "")
    if not match:
        return None
    token = re.search(r"([\d.,]+\s*[kmb]?)", match.group(1), re.I)
    return _parse_count(token.group(1) if token else match.group(1))


def _counts_from_text(text: str) -> tuple[int | None, int | None, int | None]:
    compact = VISIBLE_STATS_RE.search(text or "")
    if compact:
        return (
            _parse_count(compact.group(2)),
            _parse_count(compact.group(3)),
            _parse_count(compact.group(1)),
        )
    followers = _parse_count(FOLLOWERS_RE.search(text).group(1) if FOLLOWERS_RE.search(text) else None)
    following = _parse_count(FOLLOWING_RE.search(text).group(1) if FOLLOWING_RE.search(text) else None)
    posts = _parse_count(POSTS_RE.search(text).group(1) if POSTS_RE.search(text) else None)
    return followers, following, posts


def _counts_from_html(html: str, description: str) -> tuple[int | None, int | None, int | None]:
    followers, following, posts = _counts_from_text(description)
    if followers is None:
        title_followers = FOLLOWER_TITLE_RE.search(html)
        if title_followers:
            followers = _parse_count(title_followers.group(1))
        followers = followers or _first_int(FOLLOWED_BY_COUNT_RE, html) or _first_int(FOLLOWER_COUNT_JSON_RE, html)
    if following is None:
        title_following = FOLLOWING_TITLE_RE.search(html)
        if title_following:
            following = _parse_count(title_following.group(1))
        following = following or _first_int(FOLLOW_COUNT_RE, html) or _first_int(FOLLOWING_COUNT_JSON_RE, html)
    if posts is None:
        title_posts = POSTS_TITLE_RE.search(html)
        if title_posts:
            posts = _parse_count(title_posts.group(1))
        posts = posts or _first_int(MEDIA_COUNT_JSON_RE, html)
    followers = followers or _count_from_aria(ARIA_FOLLOWERS_RE, html)
    following = following or _count_from_aria(ARIA_FOLLOWING_RE, html)
    posts = posts or _count_from_aria(ARIA_POSTS_RE, html)
    return followers, following, posts


def _clean_bio(raw: str | None) -> str | None:
    if not raw:
        return None
    text = unescape(raw.replace("\\n", "\n").replace("\\/", "/")).strip()
    if not text:
        return None
    if OG_BIO_NOISE.search(text):
        return None
    if FOLLOWERS_RE.search(text) and FOLLOWING_RE.search(text):
        return None
    return text


def _first_json_string(regex: re.Pattern[str], text: str) -> str | None:
    match = regex.search(text or "")
    if not match:
        return None
    return _json_unescape(match.group(1))


def _json_unescape(raw: str | None) -> str | None:
    if not raw:
        return None
    try:
        value = json.loads(f'"{raw}"')
    except json.JSONDecodeError:
        value = unescape(raw.replace("\\n", "\n").replace("\\/", "/"))
    text = str(value).strip() if value is not None else ""
    return text or None


def _first_bool(regex: re.Pattern[str], text: str) -> bool | None:
    match = regex.search(text or "")
    if not match:
        return None
    return match.group(1).lower() == "true"


def _website_from_text(*texts: str | None) -> str | None:
    for text in texts:
        match = BIO_URL_RE.search(text or "")
        if not match:
            continue
        url = match.group(1).rstrip(").,;")
        if "instagram.com" in url.lower():
            continue
        if url.lower().startswith("www."):
            url = f"https://{url}"
        return url
    return None


def _location_from_html(html: str) -> str | None:
    address_raw = _first_json_string(ADDRESS_JSON_RE, html)
    if address_raw:
        try:
            address = json.loads(address_raw)
        except json.JSONDecodeError:
            address = None
        if isinstance(address, dict):
            parts = [address.get("city_name"), address.get("region_name"), address.get("country_code")]
            loc = ", ".join(str(part) for part in parts if part)
            if loc:
                return loc
    return _first_json_string(CITY_NAME_JSON_RE, html)


def _account_type_from_html(html: str) -> str | None:
    if _first_bool(IS_BUSINESS_JSON_RE, html):
        return "business"
    if _first_bool(IS_PROFESSIONAL_JSON_RE, html):
        return "professional"
    private = _first_bool(IS_PRIVATE_JSON_RE, html)
    if private is False:
        return "personal"
    return None


def _extract_profile_extras(html: str, bio: str | None = None) -> dict:
    extra: dict = {"source": "instagram_public_html"}
    highlights = _first_int(HIGHLIGHT_COUNT_JSON_RE, html)
    if highlights is not None:
        extra["highlight_reel_count"] = highlights
    has_clips = _first_bool(HAS_CLIPS_JSON_RE, html)
    if has_clips is not None:
        extra["has_clips"] = has_clips
    embeds_disabled = _first_bool(EMBEDS_DISABLED_JSON_RE, html)
    if embeds_disabled is not None:
        extra["is_embeds_disabled"] = embeds_disabled
    language = _first_json_string(LANGUAGE_JSON_RE, html)
    if language:
        extra["language"] = language.lower()
    website = _website_from_text(bio)
    if website:
        extra["bio_website"] = website
    return extra


def _bio_from_visible(visible: str, *, username: str = "", display_name: str | None = None) -> str | None:
    lines = [ln.strip() for ln in (visible or "").splitlines() if ln.strip()]
    started = False
    bio_lines: list[str] = []
    skip = {username.lower().lstrip("@"), "verified", "follow", "message"}
    if display_name:
        skip.add(display_name.strip().lower())
    for line in lines:
        low = line.lower()
        if SIGNUP_NOISE_RE.search(low):
            continue
        if FOLLOWERS_RE.search(line) or FOLLOWING_RE.search(line) or POSTS_RE.search(line):
            started = True
            continue
        if not started:
            continue
        if re.search(r"show more posts|\b(follow|message|suggested|see all|related accounts)\b", low):
            break
        if low.strip("@") in skip or HANDLE_RE.fullmatch(low.strip("@")):
            continue
        if len(line) < 2:
            continue
        if line in {"-", "•", "|"}:
            continue
        bio_lines.append(line)
        if len(bio_lines) >= 8:
            break
    return _clean_bio("\n".join(bio_lines))


def _display_name_from_visible(visible: str, username: str = "") -> str | None:
    lines = [ln.strip() for ln in (visible or "").splitlines() if ln.strip()]
    started = False
    for line in lines:
        low = line.lower()
        if FOLLOWERS_RE.search(line) or FOLLOWING_RE.search(line) or POSTS_RE.search(line):
            started = True
            continue
        if not started:
            continue
        if SIGNUP_NOISE_RE.search(low):
            continue
        if low.strip("@") in {username.lower().lstrip("@"), "verified"}:
            continue
        if HANDLE_RE.fullmatch(low.strip("@")):
            continue
        if 1 < len(line) <= 80:
            return line
        break
    return None


def apply_visible_text(
    parsed: PublicProfileParse,
    visible: str,
    html: str = "",
    *,
    extra_followers: int | None = None,
    extra_following: int | None = None,
    extra_posts: int | None = None,
    extra_image: str | None = None,
    extra_bio: str | None = None,
    extra_display_name: str | None = None,
    extra_website: str | None = None,
    extra_category: str | None = None,
    grid_posts: list[PostSnapshot] | None = None,
    username: str = "",
) -> PublicProfileParse:
    """Fill gaps from the rendered profile header, including behind a signup overlay."""
    vis_followers, vis_following, vis_posts = _counts_from_text(visible)
    html_followers, html_following, html_posts = _counts_from_html(html, "") if html else (None, None, None)
    parsed.followers = extra_followers or parsed.followers or vis_followers or html_followers
    parsed.following = extra_following or parsed.following or vis_following or html_following
    parsed.post_count = extra_posts or parsed.post_count or vis_posts or html_posts
    parsed.display_name = (
        extra_display_name
        or parsed.display_name
        or _display_name_from_visible(visible, username)
    )
    parsed.profile_image_url = extra_image or parsed.profile_image_url
    parsed.bio = extra_bio or parsed.bio or _bio_from_visible(
        visible, username=username, display_name=parsed.display_name
    )
    parsed.website_url = extra_website or parsed.website_url or _website_from_text(parsed.bio, visible)
    parsed.category = extra_category or parsed.category or _category_from_visible(
        visible, username=username, display_name=parsed.display_name
    )
    if grid_posts:
        parsed.posts = grid_posts
    elif html and not parsed.posts:
        parsed.posts = extract_grid_posts(html)
    if parsed.is_verified is None and re.search(r"\bverified\b", visible or "", re.I):
        parsed.is_verified = True
    if parsed.followers is not None or parsed.following is not None:
        parsed.blocked = False
        parsed.block_reason = None
    elif re.search(
        r"profile isn't available|content isn't available|page isn't available|the link may be broken",
        visible or "",
        re.I,
    ):
        parsed.blocked = True
        parsed.block_reason = "Profile is not publicly available"
    return parsed


def _category_from_visible(visible: str, *, username: str = "", display_name: str | None = None) -> str | None:
    skip = {username.lower().lstrip("@"), "verified", "follow", "message"}
    if display_name:
        skip.add(display_name.strip().lower())
    for line in (visible or "").splitlines():
        low = line.strip().lower()
        if low in skip:
            continue
        if low in IG_CATEGORY_NAMES:
            return line.strip()
    return None


def _looks_like_login_url(url: str) -> bool:
    lowered = (url or "").lower()
    return "accounts/login" in lowered or "/login" in lowered


def _extract_post_stats_from_json(html: str) -> list[dict]:
    """Try to extract per-post like/comment/view counts from embedded JSON blobs.

    Instagram embeds structured data in <script> tags. We look for objects
    that contain edge_media_to_comment, like_count, or video_view_count.
    Returns a list of dicts with keys: likes, comments, views, is_video, product_type.
    """
    results: list[dict] = []
    # Find all <script> blocks
    script_blocks = re.findall(r'<script[^>]*>(.*?)</script>', html, re.S | re.I)
    for block in script_blocks:
        block = block.strip()
        if not block or '{' not in block:
            continue
        # Find JSON-like objects that have media stats
        sub_objects = re.findall(r'\{[^{}]{20,3000}\}', block)
        for obj_str in sub_objects:
            if 'like_count' not in obj_str and 'video_view_count' not in obj_str:
                continue
            try:
                obj = json.loads(obj_str)
            except (json.JSONDecodeError, ValueError):
                # Try regex extraction for partial matches
                likes_m = LIKE_COUNT_JSON_RE.search(obj_str)
                comments_m = COMMENT_COUNT_JSON_RE.search(obj_str)
                views_m = VIEW_COUNT_JSON_RE.search(obj_str) or PLAY_COUNT_JSON_RE.search(obj_str)
                is_vid_m = IS_VIDEO_JSON_RE.search(obj_str)
                if likes_m or views_m:
                    results.append({
                        "likes": int(likes_m.group(1)) if likes_m else None,
                        "comments": int(comments_m.group(1)) if comments_m else None,
                        "views": int(views_m.group(1)) if views_m else None,
                        "is_video": (is_vid_m.group(1).lower() == "true") if is_vid_m else False,
                        "product_type": None,
                    })
                continue

            likes = obj.get("like_count")
            comments = obj.get("comment_count")
            views = obj.get("video_view_count") or obj.get("play_count")
            is_video = bool(obj.get("is_video") or obj.get("is_reel"))
            product_type = obj.get("product_type")  # e.g. "clips" for reels
            if likes is not None or views is not None:
                results.append({
                    "likes": int(likes) if likes is not None else None,
                    "comments": int(comments) if comments is not None else None,
                    "views": int(views) if views is not None else None,
                    "is_video": is_video,
                    "product_type": product_type,
                })
    return results


def _detect_verified(html: str) -> bool | None:
    """Check public HTML for verified badge signals."""
    m = VERIFIED_JSON_RE.search(html)
    if m:
        return m.group(1).lower() == "true"
    if VERIFIED_BADGE_RE.search(html):
        return True
    return None


def parse_public_html(html: str, final_url: str, username: str = "") -> PublicProfileParse:
    lowered = html.lower()
    loginish = _looks_like_login_url(final_url)
    if "checkpoint" in lowered and "login" in lowered[:8000] and "followers" not in lowered:
        return PublicProfileParse(blocked=True, block_reason="Checkpoint or login wall encountered")
    if "content isn't available" in lowered or "page isn't available" in lowered:
        return PublicProfileParse(blocked=True, block_reason="Profile is not publicly available")

    title = OG_TITLE.search(html)
    desc = OG_DESC.search(html) or META_DESC.search(html)
    image = OG_IMAGE.search(html)
    description = unescape(desc.group(1)) if desc else ""

    followers, following, posts = _counts_from_html(html, description)

    display_name = None
    if title:
        display_name = unescape(title.group(1)).split("(")[0].strip() or None
    if display_name and display_name.lower() in {"instagram", "instagram.com"}:
        display_name = None

    bio = _clean_bio(_first_json_string(BIOGRAPHY_JSON_RE, html))
    if description:
        parts = [p.strip() for p in description.split(" - ") if p.strip()]
        for part in reversed(parts):
            cleaned = _clean_bio(part)
            if cleaned:
                bio = bio or cleaned
                break

    json_ld = re.search(r'<script type="application/ld\+json">(.*?)</script>', html, re.S | re.I)
    collected_posts: list[PostSnapshot] = []
    if json_ld:
        try:
            data = json.loads(json_ld.group(1))
            display_name = display_name or data.get("name")
            bio = bio or _clean_bio(data.get("description"))
        except json.JSONDecodeError:
            pass

    # Prefer the public post grid (links + alts). <time> tags are often absent when logged out.
    collected_posts = extract_grid_posts(html)
    if not collected_posts:
        post_stats = _extract_post_stats_from_json(html)
        times = TIME_RE.findall(html)[:12]
        alts = [unescape(a) for a in CAPTION_RE.findall(html)[:12] if a and "profile picture" not in a.lower()]
        for idx, published in enumerate(times):
            caption = alts[idx] if idx < len(alts) else None
            stat = post_stats[idx] if idx < len(post_stats) else {}
            is_video = stat.get("is_video", False)
            product_type = stat.get("product_type") or ""
            if is_video or "clip" in product_type.lower() or "reel" in product_type.lower():
                post_type = "reel"
            else:
                post_type = "post"
            collected_posts.append(
                PostSnapshot(
                    platform_post_id=f"public-{idx + 1}",
                    post_url=None,
                    post_type=post_type,
                    caption=caption,
                    likes=stat.get("likes"),
                    comments=stat.get("comments"),
                    views=stat.get("views"),
                    published_at=published,
                    hashtags=extract_hashtags(caption),
                )
            )

    is_verified = _detect_verified(html)
    related_following, related_followers = extract_related_usernames(html, username)
    extras = _extract_profile_extras(html, bio)
    ext_match = EXTERNAL_URL_JSON_RE.search(html)
    website = _json_unescape(ext_match.group(1) if ext_match else None)
    website = website or extras.pop("bio_website", None) or _website_from_text(bio)
    category = _first_json_string(CATEGORY_JSON_RE, html)

    blocked = loginish and followers is None and following is None and not display_name and not bio
    return PublicProfileParse(
        display_name=display_name,
        bio=bio,
        profile_image_url=unescape(image.group(1)) if image else None,
        followers=followers,
        following=following,
        post_count=posts,
        is_verified=is_verified,
        category=category,
        website_url=website,
        is_private=_first_bool(IS_PRIVATE_JSON_RE, html),
        account_type=_account_type_from_html(html),
        pronouns=_first_json_string(PRONOUNS_JSON_RE, html),
        location=_location_from_html(html),
        extra=extras,
        posts=collected_posts,
        related_following=related_following,
        related_followers=related_followers,
        blocked=blocked,
        block_reason="Login wall encountered" if blocked else None,
    )


LIKES_RE = re.compile(COUNT_TOKEN + r"\s*Likes", re.I)
COMMENTS_RE = re.compile(COUNT_TOKEN + r"\s*Comments", re.I)
VIEWS_RE = re.compile(COUNT_TOKEN + r"\s*(?:video\s+)?(?:views?|plays?)\b", re.I)
MILLION_VIEWS_RE = re.compile(r"([\d.]+)\s*million\s+(?:video\s+)?(?:views?|plays?)\b", re.I)
ARIA_VIEWS_RE = re.compile(r'aria-label="([^"]*(?:views?|plays?)[^"]*)"', re.I)
CAPTION_STOP_RE = re.compile(
    r"more posts from|log in|sign up|suggested for you|see translation|liked by",
    re.I,
)


def _views_from_public_page(html: str, visible: str) -> int | None:
    """Views/plays only when Instagram already exposes them on the public page."""
    million = MILLION_VIEWS_RE.search(visible or "") or MILLION_VIEWS_RE.search(html or "")
    if million:
        try:
            return int(round(float(million.group(1)) * 1_000_000))
        except ValueError:
            pass
    views = _parse_count(VIEWS_RE.search(visible).group(1) if VIEWS_RE.search(visible) else None)
    if views is None:
        views = _parse_count(VIEWS_RE.search(html).group(1) if VIEWS_RE.search(html) else None)
    if views is None:
        views = _count_from_aria(ARIA_VIEWS_RE, html)
    if views is None:
        views = (
            _first_int(IG_PLAY_COUNT_JSON_RE, html)
            or _first_int(VIDEO_PLAY_COUNT_JSON_RE, html)
            or _first_int(PLAY_COUNT_JSON_RE, html)
            or _first_int(VIEW_COUNT_JSON_RE, html)
            or _first_int(PLAY_COUNT_ALT_JSON_RE, html)
        )
    return views


def parse_public_post(html: str, visible: str, final_url: str) -> PostSnapshot:
    """Public reel/post page behind a signup overlay. Does not require login."""
    likes = _parse_count(LIKES_RE.search(visible).group(1) if LIKES_RE.search(visible) else None)
    comments = _parse_count(COMMENTS_RE.search(visible).group(1) if COMMENTS_RE.search(visible) else None)
    views = _views_from_public_page(html, visible)
    if likes is None:
        likes = _parse_count(LIKES_RE.search(html).group(1) if LIKES_RE.search(html) else None)
    if comments is None:
        comments = _parse_count(COMMENTS_RE.search(html).group(1) if COMMENTS_RE.search(html) else None)

    desc = OG_DESC.search(html) or META_DESC.search(html)
    og_caption = _clean_bio(unescape(desc.group(1))) if desc else None
    caption = _caption_from_visible(visible) or og_caption

    kind = "reel" if "/reel/" in (final_url or "").lower() else "post"
    code = None
    match = re.search(r"/(?:p|reel|reels)/([A-Za-z0-9_-]+)", final_url or "", re.I)
    if match:
        code = match.group(1)
    return PostSnapshot(
        platform_post_id=code,
        post_url=final_url,
        post_type=kind,
        caption=caption,
        likes=likes,
        comments=comments,
        views=views,
        hashtags=extract_hashtags(caption),
    )


def _caption_from_visible(visible: str) -> str | None:
    lines = [ln.strip() for ln in (visible or "").splitlines() if ln.strip()]
    started = False
    collected: list[str] = []
    for line in lines:
        low = line.lower()
        if SIGNUP_NOISE_RE.search(low) or low in {"follow", "log in", "sign up"}:
            started = True
            continue
        if CAPTION_STOP_RE.search(low):
            break
        if not started:
            if len(line) > 40:
                started = True
            else:
                continue
        if HANDLE_RE.fullmatch(low.strip("@")) or low in {"verified", "·"}:
            continue
        if LIKES_RE.search(line) or COMMENTS_RE.search(line) or VIEWS_RE.search(line):
            continue
        if len(line) < 8:
            continue
        collected.append(line)
        if sum(len(part) for part in collected) >= 280:
            break
    text = "\n".join(collected).strip()
    return text or None

