"""
Reddit API Service — OAuth2 integration for SuperAdmin Reddit management.

Uses Reddit's script-type OAuth (username + password + client credentials)
to read subreddit posts, post comments, and create submissions.
"""

import base64
import logging
import time
from typing import Any, Dict, List, Optional

import httpx

logger = logging.getLogger(__name__)

REDDIT_AUTH_URL = "https://www.reddit.com/api/v1/access_token"
REDDIT_API_BASE = "https://oauth.reddit.com"
TOKEN_TTL = 3500  # Refresh 100s before 1-hour expiry


class RedditService:
    """Async Reddit API client using script-type OAuth."""

    def __init__(
        self,
        client_id: str,
        client_secret: str,
        username: str,
        password: str,
    ):
        self.client_id = client_id
        self.client_secret = client_secret
        self.username = username
        self.password = password
        self._access_token: Optional[str] = None
        self._token_expires_at: float = 0
        self._user_agent = f"commonground-admin/1.0 (by /u/{username})"

    # ── Auth ──────────────────────────────────────────────────

    async def _ensure_token(self) -> str:
        """Get a valid access token, refreshing if needed."""
        if self._access_token and time.time() < self._token_expires_at:
            return self._access_token

        auth = base64.b64encode(
            f"{self.client_id}:{self.client_secret}".encode()
        ).decode()

        async with httpx.AsyncClient() as client:
            resp = await client.post(
                REDDIT_AUTH_URL,
                headers={
                    "Authorization": f"Basic {auth}",
                    "User-Agent": self._user_agent,
                },
                data={
                    "grant_type": "password",
                    "username": self.username,
                    "password": self.password,
                },
            )
            resp.raise_for_status()
            data = resp.json()

        self._access_token = data["access_token"]
        self._token_expires_at = time.time() + TOKEN_TTL
        logger.info("Reddit OAuth token acquired for u/%s", self.username)
        return self._access_token

    async def _request(
        self, method: str, path: str, **kwargs
    ) -> Any:
        """Make an authenticated request to the Reddit API."""
        token = await self._ensure_token()
        url = f"{REDDIT_API_BASE}{path}"
        async with httpx.AsyncClient() as client:
            resp = await client.request(
                method,
                url,
                headers={
                    "Authorization": f"Bearer {token}",
                    "User-Agent": self._user_agent,
                },
                timeout=15.0,
                **kwargs,
            )
            resp.raise_for_status()
            return resp.json()

    # ── Public methods ────────────────────────────────────────

    async def verify_auth(self) -> Dict[str, Any]:
        """Verify credentials and return user info."""
        data = await self._request("GET", "/api/v1/me")
        return {
            "username": data.get("name"),
            "karma": data.get("total_karma", 0),
            "created_utc": data.get("created_utc"),
            "connected": True,
        }

    async def get_subreddit_posts(
        self,
        subreddit: str,
        sort: str = "hot",
        limit: int = 25,
        after: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Fetch posts from a subreddit."""
        params: Dict[str, Any] = {"limit": min(limit, 100)}
        if after:
            params["after"] = after

        data = await self._request("GET", f"/r/{subreddit}/{sort}", params=params)
        posts = []
        for child in data.get("data", {}).get("children", []):
            p = child.get("data", {})
            posts.append({
                "id": p.get("id"),
                "fullname": child.get("kind", "t3") + "_" + p.get("id", ""),
                "title": p.get("title"),
                "author": p.get("author"),
                "selftext": (p.get("selftext") or "")[:500],
                "score": p.get("score", 0),
                "upvote_ratio": p.get("upvote_ratio", 0),
                "num_comments": p.get("num_comments", 0),
                "created_utc": p.get("created_utc"),
                "url": p.get("url"),
                "permalink": f"https://reddit.com{p.get('permalink', '')}",
                "flair": p.get("link_flair_text"),
                "is_self": p.get("is_self", True),
                "subreddit": p.get("subreddit"),
            })

        return {
            "posts": posts,
            "after": data.get("data", {}).get("after"),
            "subreddit": subreddit,
            "sort": sort,
        }

    async def search_subreddit(
        self, subreddit: str, query: str, limit: int = 25
    ) -> List[Dict[str, Any]]:
        """Search posts within a subreddit."""
        data = await self._request(
            "GET",
            f"/r/{subreddit}/search",
            params={
                "q": query,
                "restrict_sr": "true",
                "sort": "relevance",
                "limit": min(limit, 100),
            },
        )
        posts = []
        for child in data.get("data", {}).get("children", []):
            p = child.get("data", {})
            posts.append({
                "id": p.get("id"),
                "fullname": child.get("kind", "t3") + "_" + p.get("id", ""),
                "title": p.get("title"),
                "author": p.get("author"),
                "selftext": (p.get("selftext") or "")[:500],
                "score": p.get("score", 0),
                "num_comments": p.get("num_comments", 0),
                "created_utc": p.get("created_utc"),
                "permalink": f"https://reddit.com{p.get('permalink', '')}",
                "flair": p.get("link_flair_text"),
                "subreddit": p.get("subreddit"),
            })
        return posts

    async def get_post_comments(
        self, subreddit: str, post_id: str, limit: int = 50
    ) -> List[Dict[str, Any]]:
        """Fetch comments for a post."""
        data = await self._request(
            "GET",
            f"/r/{subreddit}/comments/{post_id}",
            params={"limit": limit, "depth": 3, "sort": "best"},
        )
        comments = []
        if isinstance(data, list) and len(data) > 1:
            for child in data[1].get("data", {}).get("children", []):
                c = child.get("data", {})
                if child.get("kind") != "t1":
                    continue
                comments.append({
                    "id": c.get("id"),
                    "fullname": "t1_" + c.get("id", ""),
                    "author": c.get("author"),
                    "body": c.get("body", ""),
                    "score": c.get("score", 0),
                    "created_utc": c.get("created_utc"),
                    "is_submitter": c.get("is_submitter", False),
                    "depth": c.get("depth", 0),
                })
        return comments

    async def post_comment(self, parent_fullname: str, text: str) -> Dict[str, Any]:
        """Post a comment or reply."""
        data = await self._request(
            "POST",
            "/api/comment",
            data={"thing_id": parent_fullname, "text": text},
        )
        # Reddit wraps the response
        things = (
            data.get("json", {})
            .get("data", {})
            .get("things", [])
        )
        if things:
            c = things[0].get("data", {})
            return {
                "id": c.get("id"),
                "fullname": c.get("name"),
                "body": c.get("body"),
                "permalink": c.get("permalink"),
            }
        return {"posted": True, "raw": data}

    async def submit_post(
        self, subreddit: str, title: str, text: str
    ) -> Dict[str, Any]:
        """Create a new text post."""
        data = await self._request(
            "POST",
            "/api/submit",
            data={
                "sr": subreddit,
                "kind": "self",
                "title": title,
                "text": text,
                "resubmit": "true",
            },
        )
        result = data.get("json", {}).get("data", {})
        return {
            "id": result.get("id"),
            "name": result.get("name"),
            "url": result.get("url"),
            "posted": True,
        }
