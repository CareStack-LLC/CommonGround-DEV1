"""
ParentAgentClient — an authenticated HTTP client that acts as one parent,
driving the real parent-facing API exactly as the app would.

Owns token lifecycle (30-min access token -> refresh on 401), retry on
transient errors, and a small inter-request delay to stay under rate limits.
"""

from __future__ import annotations

import asyncio
import logging
from typing import Any, Optional

import httpx

from .config import CampaignConfig

logger = logging.getLogger("bug_campaign.client")


class ApiError(RuntimeError):
    """Raised when an API call fails after retries. Carries status + body."""

    def __init__(self, method: str, path: str, status: int, body: Any):
        self.method = method
        self.path = path
        self.status = status
        self.body = body
        super().__init__(f"{method} {path} -> {status}: {str(body)[:300]}")


class ParentAgentClient:
    def __init__(self, cfg: CampaignConfig, email: str, password: str, name: str = ""):
        self.cfg = cfg
        self.email = email
        self.password = password
        self.name = name or email
        self.access_token: Optional[str] = None
        self.refresh_token: Optional[str] = None
        self.user_id: Optional[str] = None
        self._http = httpx.AsyncClient(base_url=cfg.api_base, timeout=cfg.http_timeout_s)

    async def aclose(self) -> None:
        await self._http.aclose()

    async def __aenter__(self) -> "ParentAgentClient":
        await self.login()
        return self

    async def __aexit__(self, *exc) -> None:
        await self.aclose()

    # ---- auth -------------------------------------------------------------
    async def login(self) -> str:
        data = await self._raw_request(
            "POST", "/auth/login",
            json={"email": self.email, "password": self.password}, auth=False,
        )
        self.access_token = data["access_token"]
        self.refresh_token = data.get("refresh_token")
        self.user_id = (data.get("user") or {}).get("id")
        return self.access_token

    async def _refresh(self) -> bool:
        if not self.refresh_token:
            return False
        try:
            data = await self._raw_request(
                "POST", "/auth/refresh",
                json={"refresh_token": self.refresh_token}, auth=False,
            )
            self.access_token = data["access_token"]
            self.refresh_token = data.get("refresh_token", self.refresh_token)
            return True
        except ApiError:
            return False

    def _headers(self) -> dict:
        return {"Authorization": f"Bearer {self.access_token}"} if self.access_token else {}

    # ---- core request with retry + 401 refresh -----------------------------
    async def _raw_request(
        self, method: str, path: str, *, json: Any = None, params: Any = None, auth: bool = True,
    ) -> Any:
        if self.cfg.request_delay_ms:
            await asyncio.sleep(self.cfg.request_delay_ms / 1000)

        headers = self._headers() if auth else {}
        last_exc: Optional[Exception] = None

        for attempt in range(3):
            try:
                resp = await self._http.request(method, path, json=json, params=params, headers=headers)
            except (httpx.TransportError, httpx.TimeoutException) as e:
                last_exc = e
                await asyncio.sleep(0.5 * (attempt + 1))
                continue

            if resp.status_code == 401 and auth and attempt == 0:
                if await self._refresh() or await self._relogin():
                    headers = self._headers()
                    continue

            if resp.status_code >= 500:
                last_exc = ApiError(method, path, resp.status_code, _safe_json(resp))
                await asyncio.sleep(0.5 * (attempt + 1))
                continue

            if resp.status_code >= 400:
                raise ApiError(method, path, resp.status_code, _safe_json(resp))

            if resp.status_code == 204 or not resp.content:
                return None
            return resp.json()

        raise last_exc or ApiError(method, path, 0, "unknown error")

    async def _relogin(self) -> bool:
        try:
            await self.login()
            return True
        except ApiError:
            return False

    # ---- family / children -------------------------------------------------
    async def list_family_files(self) -> list:
        return await self._raw_request("GET", "/family-files/")

    async def get_children(self, family_file_id: str) -> list:
        data = await self._raw_request("GET", f"/family-files/{family_file_id}/children")
        if isinstance(data, dict):
            return data.get("items", data.get("children", []))
        return data or []

    # ---- exchanges ---------------------------------------------------------
    async def create_exchange(self, payload: dict) -> dict:
        return await self._raw_request("POST", "/exchanges/", json=payload)

    async def list_upcoming(self, case_id: str, limit: int = 20) -> list:
        return await self._raw_request(
            "GET", f"/exchanges/case/{case_id}/upcoming", params={"limit": limit}
        )

    async def get_exchange_history(self, case_id: str, days: int = 30, upcoming_days: int = 30) -> list:
        return await self._raw_request(
            "GET", f"/exchanges/case/{case_id}/history",
            params={"days": days, "upcoming_days": upcoming_days},
        )

    async def window_status(self, instance_id: str) -> dict:
        return await self._raw_request("GET", f"/exchanges/instances/{instance_id}/window-status")

    async def check_in_manual(self, instance_id: str, notes: str | None = None) -> dict:
        return await self._raw_request(
            "POST", f"/exchanges/instances/{instance_id}/check-in", json={"notes": notes}
        )

    async def check_in_gps(
        self, instance_id: str, latitude: float, longitude: float,
        device_accuracy_meters: float, notes: str | None = None,
    ) -> dict:
        return await self._raw_request(
            "POST", f"/exchanges/instances/{instance_id}/check-in/gps",
            json={
                "latitude": latitude, "longitude": longitude,
                "device_accuracy_meters": device_accuracy_meters, "notes": notes,
            },
        )

    async def custody_status(self, family_file_id: str) -> dict:
        return await self._raw_request(
            "GET", f"/exchanges/family-file/{family_file_id}/custody-status"
        )

    async def override_custody(self, family_file_id: str, child_ids: list[str], notes: str | None = None) -> dict:
        return await self._raw_request(
            "POST", "/exchanges/override-custody",
            json={"family_file_id": family_file_id, "child_ids": child_ids, "notes": notes},
        )

    async def geocode(self, address: str) -> dict:
        return await self._raw_request("POST", "/exchanges/geocode", json={"address": address})

    # ---- custody-time reporting -------------------------------------------
    async def child_stats(self, child_id: str, period: str = "30_days",
                          start_date: str | None = None, end_date: str | None = None) -> dict:
        params: dict = {"period": period}
        if start_date:
            params["start_date"] = start_date
        if end_date:
            params["end_date"] = end_date
        return await self._raw_request("GET", f"/custody-time/child/{child_id}/stats", params=params)

    async def child_timeline(self, child_id: str, start_date: str | None = None, end_date: str | None = None) -> dict:
        params: dict = {}
        if start_date:
            params["start_date"] = start_date
        if end_date:
            params["end_date"] = end_date
        return await self._raw_request("GET", f"/custody-time/child/{child_id}/timeline", params=params)

    async def family_stats(self, family_file_id: str, period: str = "30_days") -> dict:
        return await self._raw_request(
            "GET", f"/custody-time/family/{family_file_id}/stats", params={"period": period}
        )

    async def family_report(self, family_file_id: str, start_date: str, end_date: str) -> dict:
        return await self._raw_request(
            "GET", f"/custody-time/family/{family_file_id}/report",
            params={"start_date": start_date, "end_date": end_date},
        )


def _safe_json(resp: httpx.Response) -> Any:
    try:
        return resp.json()
    except Exception:
        return resp.text
