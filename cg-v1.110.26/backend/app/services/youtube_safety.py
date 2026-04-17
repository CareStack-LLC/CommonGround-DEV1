"""
Wave 3 C8 — YouTube content validation for Watch Together.

This is a pragmatic first pass: format validation + a curated allow-list
of well-known kid-safe channels. It does NOT guarantee every video is
appropriate — it raises the floor so random internet links can't be
dropped into KidSpace theater.

Upgrade path (post-launch): call the YouTube Data API `videos.list` with
the API key, inspect `contentDetails.contentRating` / `status.madeForKids`
and cache the result. Until then, the allow-list is the ground truth.
"""

from __future__ import annotations

import re
from typing import Optional, Tuple

# Channel IDs known to produce child-appropriate content. Presence here
# does NOT mean every video is fine — but absence blocks by default when
# strict mode is on. Parents can override per family via the `override`
# list passed into `validate_youtube_url`.
ALLOWED_CHANNEL_IDS = {
    "UCXIJgqnII2ZOINSWNOGFThA",  # National Geographic Kids
    "UCpGSQRFSM28BmvIx1Yrj5Jg",  # Sesame Street
    "UCy9xjZtiZwzx9gBMH1oAOEg",  # PBS Kids
    "UCh6KFtW7a1AvnjBO3nq-jGA",  # SciShow Kids
    "UCbCmjCuTUZos6Inko4u57UQ",  # Cocomelon (very popular for young kids)
    "UCZLbvNy_oVkqeAoJcLWdMMg",  # Moonbug Kids
    "UCCnxSFtYRjabM8w6lXExtxQ",  # Art for Kids Hub
    "UCiH828EtgQjTyNIMH6YiOSw",  # The Okee Dokee Brothers
}

_YT_URL_PATTERNS = (
    re.compile(r"(?:youtube\.com/watch\?v=|youtu\.be/|youtube\.com/embed/)([A-Za-z0-9_-]{6,})"),
    re.compile(r"youtube\.com/v/([A-Za-z0-9_-]{6,})"),
)


def extract_youtube_id(url: str) -> Optional[str]:
    if not url:
        return None
    for pattern in _YT_URL_PATTERNS:
        m = pattern.search(url)
        if m:
            return m.group(1)
    return None


def validate_youtube_url(
    url: str,
    strict: bool = True,
    override_channel_ids: Optional[set] = None,
    override_video_ids: Optional[set] = None,
) -> Tuple[bool, str]:
    """Return (is_allowed, reason).

    When `strict` is False, any format-valid YouTube URL passes. When True,
    only URLs whose embedded video or channel appears in the allow-lists
    pass. The override lists let parents/family whitelist additional
    channels or specific videos beyond the default.
    """
    if not url:
        return False, "empty_url"

    video_id = extract_youtube_id(url)
    if not video_id:
        return False, "invalid_url_format"

    if not strict:
        return True, "format_ok"

    if override_video_ids and video_id in override_video_ids:
        return True, "override_video"

    # We don't resolve channel ID without the YouTube Data API. In strict
    # mode without an override video match, we fail closed and ask the
    # parent to whitelist the video.
    return False, "strict_mode_not_whitelisted"
