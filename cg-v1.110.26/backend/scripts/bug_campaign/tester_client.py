"""
TesterClient — token-based (unauthenticated) ingestion into the bug-hunt
system: bugs, notes, feedback, checklist. This is the same public API a human
tester's browser uses, so we exercise the real ingestion path too.
"""

from __future__ import annotations

import asyncio
from typing import Any

import httpx

from .client import ApiError, _safe_json
from .config import CampaignConfig


class TesterClient:
    def __init__(self, cfg: CampaignConfig, token: str, family_label: str = ""):
        self.cfg = cfg
        self.token = token
        self.family_label = family_label
        self._http = httpx.AsyncClient(base_url=cfg.api_base, timeout=cfg.http_timeout_s)

    async def aclose(self) -> None:
        await self._http.aclose()

    async def __aenter__(self) -> "TesterClient":
        return self

    async def __aexit__(self, *exc) -> None:
        await self.aclose()

    async def _post(self, path: str, json: dict) -> Any:
        if self.cfg.request_delay_ms:
            await asyncio.sleep(self.cfg.request_delay_ms / 1000)
        for attempt in range(3):
            try:
                resp = await self._http.post(path, json=json)
            except (httpx.TransportError, httpx.TimeoutException):
                await asyncio.sleep(0.5 * (attempt + 1))
                continue
            if resp.status_code >= 500:
                await asyncio.sleep(0.5 * (attempt + 1))
                continue
            if resp.status_code >= 400:
                raise ApiError("POST", path, resp.status_code, _safe_json(resp))
            return resp.json()
        raise ApiError("POST", path, 0, "ingestion failed after retries")

    async def submit_bug(
        self, title: str, description: str, severity: str = "medium",
        steps_to_reproduce: str | None = None, screenshot_urls: list[str] | None = None,
    ) -> dict:
        payload = {
            "title": title[:500], "description": description[:5000], "severity": severity,
        }
        if steps_to_reproduce:
            payload["steps_to_reproduce"] = steps_to_reproduce[:5000]
        if screenshot_urls:
            payload["screenshot_urls"] = screenshot_urls[:3]
        return await self._post(f"/bug-hunt/test/{self.token}/bugs", payload)

    async def add_note(self, content: str, note_type: str = "observation") -> dict:
        return await self._post(
            f"/bug-hunt/test/{self.token}/notes",
            {"content": content[:5000], "note_type": note_type},
        )

    async def add_feedback(
        self, content: str, category: str = "functionality",
        rating: int | None = None, feature_area: str | None = None,
    ) -> dict:
        payload: dict = {"content": content[:5000], "category": category}
        if rating is not None:
            payload["rating"] = rating
        if feature_area:
            payload["feature_area"] = feature_area
        return await self._post(f"/bug-hunt/test/{self.token}/feedback", payload)

    async def toggle_checklist(self, item_id: str) -> dict:
        return await self._post(f"/bug-hunt/test/{self.token}/checklist/{item_id}", {})
