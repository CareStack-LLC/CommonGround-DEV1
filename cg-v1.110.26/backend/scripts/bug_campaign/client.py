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
        self._http = httpx.AsyncClient(
            base_url=cfg.api_base, timeout=cfg.http_timeout_s, follow_redirects=True,
        )

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
        timeout: Optional[float] = None, retry_on_timeout: bool = True,
    ) -> Any:
        """
        timeout: per-request override (seconds) for slow, non-idempotent bulk
        endpoints (e.g. admin generate_families) that legitimately exceed the
        default 30s.
        retry_on_timeout: set False for non-idempotent mutating calls — a
        client-side timeout retry racing a still-running server-side bulk
        insert is exactly what causes duplicate-key errors (observed on
        POST /admin/bug-hunts/{id}/generate: the retry re-ran the same
        family-generation loop from index 0 while the original request was
        still creating families, colliding on the first email).
        """
        if self.cfg.request_delay_ms:
            await asyncio.sleep(self.cfg.request_delay_ms / 1000)

        headers = self._headers() if auth else {}
        last_exc: Optional[Exception] = None
        req_kwargs = {"timeout": timeout} if timeout is not None else {}

        for attempt in range(3):
            try:
                resp = await self._http.request(method, path, json=json, params=params, headers=headers, **req_kwargs)
            except (httpx.TransportError, httpx.TimeoutException) as e:
                last_exc = e
                if not retry_on_timeout:
                    raise
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

    async def list_exchange_templates(self, case_id: str) -> list:
        """Recurring exchange TEMPLATES. These carry the title; instance
        responses don't (their title is always null), so any title-based
        instance lookup must go template.title -> template.id ->
        instance.exchange_id."""
        return await self._raw_request("GET", f"/exchanges/case/{case_id}")

    async def delete_exchange(self, exchange_id: str) -> Any:
        """Delete a template and (cascade) all its instances. Creator-only."""
        return await self._raw_request("DELETE", f"/exchanges/{exchange_id}")

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

    # ---- family / children lifecycle --------------------------------------
    async def add_child(self, family_file_id: str, payload: dict) -> dict:
        return await self._raw_request("POST", f"/family-files/{family_file_id}/children", json=payload)

    async def approve_child(self, family_file_id: str, child_id: str) -> dict:
        return await self._raw_request(
            "POST", f"/family-files/{family_file_id}/children/{child_id}/approve", json={}
        )

    async def get_child(self, child_id: str) -> dict:
        return await self._raw_request("GET", f"/children/{child_id}")

    async def dashboard_summary(self, family_file_id: str) -> dict:
        return await self._raw_request("GET", f"/dashboard/summary/{family_file_id}")

    async def list_agreements(self, family_file_id: str) -> list:
        data = await self._raw_request("GET", f"/family-files/{family_file_id}/agreements")
        if isinstance(data, dict):
            return data.get("items", data.get("agreements", []))
        return data or []

    # ---- ARIA messaging ----------------------------------------------------
    async def analyze_message(self, content: str, family_file_id: str) -> dict:
        # analyze takes QUERY params (content, family_file_id), not a JSON body
        return await self._raw_request(
            "POST", "/messages/analyze", params={"content": content, "family_file_id": family_file_id}
        )

    async def send_message(self, payload: dict) -> tuple[int, dict]:
        """Returns (status_code, body). 201 sent, 202 flagged, 400 blocked."""
        if self.cfg.request_delay_ms:
            await asyncio.sleep(self.cfg.request_delay_ms / 1000)
        resp = await self._http.request("POST", "/messages/", json=payload, headers=self._headers())
        return resp.status_code, _safe_json(resp)

    # ---- agreements --------------------------------------------------------
    async def create_agreement(self, payload: dict) -> dict:
        return await self._raw_request("POST", "/agreements", json=payload)

    async def get_agreement(self, agreement_id: str) -> dict:
        return await self._raw_request("GET", f"/agreements/{agreement_id}")

    async def submit_agreement(self, agreement_id: str) -> dict:
        return await self._raw_request("POST", f"/agreements/{agreement_id}/submit", json={})

    async def approve_agreement(self, agreement_id: str, notes: str = "") -> dict:
        return await self._raw_request(
            "POST", f"/agreements/{agreement_id}/approve",
            json={"notes": notes, "disclaimer_accepted": True},
        )

    # ---- ClearFund ---------------------------------------------------------
    async def create_obligation(self, payload: dict) -> tuple[int, dict]:
        if self.cfg.request_delay_ms:
            await asyncio.sleep(self.cfg.request_delay_ms / 1000)
        resp = await self._http.request("POST", "/clearfund/obligations/", json=payload, headers=self._headers())
        return resp.status_code, _safe_json(resp)

    async def get_splits(self, family_file_id: str) -> dict:
        return await self._raw_request("GET", f"/clearfund/splits/{family_file_id}")

    # ---- court export ------------------------------------------------------
    async def create_export(self, payload: dict) -> tuple[int, dict]:
        if self.cfg.request_delay_ms:
            await asyncio.sleep(self.cfg.request_delay_ms / 1000)
        resp = await self._http.request("POST", "/exports/", json=payload, headers=self._headers())
        return resp.status_code, _safe_json(resp)

    async def get_export(self, export_id: str) -> dict:
        return await self._raw_request("GET", f"/exports/{export_id}")

    async def download_export(self, export_id: str) -> tuple[int, bytes, dict]:
        resp = await self._http.request("GET", f"/exports/{export_id}/download", headers=self._headers())
        return resp.status_code, resp.content, dict(resp.headers)

    async def verify_export(self, export_number: str) -> dict:
        return await self._raw_request("GET", f"/exports/verify/{export_number}", auth=False)

    # ---- KidComs -----------------------------------------------------------
    async def coppa_consent(self, child_id: str) -> tuple[int, dict]:
        if self.cfg.request_delay_ms:
            await asyncio.sleep(self.cfg.request_delay_ms / 1000)
        resp = await self._http.request("POST", f"/kidcoms/children/{child_id}/coppa-consent", json={}, headers=self._headers())
        return resp.status_code, _safe_json(resp)

    async def get_child_wallet(self, child_id: str) -> tuple[int, dict]:
        resp = await self._http.request("GET", f"/wallets/child/{child_id}", headers=self._headers())
        return resp.status_code, _safe_json(resp)

    async def wallet_contribute(self, child_id: str, payload: dict) -> tuple[int, dict]:
        if self.cfg.request_delay_ms:
            await asyncio.sleep(self.cfg.request_delay_ms / 1000)
        resp = await self._http.request("POST", f"/wallets/child/{child_id}/contribute", json=payload, headers=self._headers())
        return resp.status_code, _safe_json(resp)

    # ---- onboarding (register + family lifecycle) --------------------------
    async def register(self, first_name: str = "QA", last_name: str = "User") -> str:
        data = await self._raw_request(
            "POST", "/auth/register", auth=False,
            json={"email": self.email, "password": self.password,
                  "first_name": first_name, "last_name": last_name},
        )
        self.access_token = data["access_token"]
        self.refresh_token = data.get("refresh_token")
        self.user_id = (data.get("user") or {}).get("id")
        return self.access_token

    async def create_family_file(self, payload: dict) -> dict:
        return await self._raw_request("POST", "/family-files/", json=payload)

    async def get_family_file(self, family_file_id: str) -> dict:
        return await self._raw_request("GET", f"/family-files/{family_file_id}")

    async def invite_coparent(self, family_file_id: str, email: str, role: str = "father") -> dict:
        return await self._raw_request(
            "POST", f"/family-files/{family_file_id}/invite", json={"email": email, "role": role}
        )

    async def accept_invitation(self, family_file_id: str) -> dict:
        return await self._raw_request("POST", f"/family-files/{family_file_id}/accept", json={})

    # ---- notifications -----------------------------------------------------
    async def list_notifications(self, unread_only: bool = False, limit: int = 50) -> dict:
        return await self._raw_request(
            "GET", "/notifications", params={"unread_only": unread_only, "limit": limit}
        )

    async def notifications_unread_count(self) -> dict:
        return await self._raw_request("GET", "/notifications/unread-count")

    async def mark_notifications_read(self, ids: list[str] | None = None) -> dict:
        return await self._raw_request("POST", "/notifications/mark-read", json={"notification_ids": ids or []})

    # ---- schedule events ---------------------------------------------------
    async def create_event(self, payload: dict) -> dict:
        return await self._raw_request("POST", "/schedule/events", json=payload)

    async def list_events(self, case_id: str) -> Any:
        return await self._raw_request("GET", f"/schedule/cases/{case_id}/events")

    # ---- My Time collections (schedule events require a collection_id) ----
    async def list_collections(self, case_id: str) -> Any:
        return await self._raw_request("GET", f"/collections/cases/{case_id}")

    async def create_collection(self, payload: dict) -> dict:
        return await self._raw_request("POST", "/collections/", json=payload)

    # ---- ClearFund funding -------------------------------------------------
    async def fund_obligation(self, obligation_id: str, payload: dict) -> tuple[int, dict]:
        if self.cfg.request_delay_ms:
            await asyncio.sleep(self.cfg.request_delay_ms / 1000)
        resp = await self._http.request(
            "POST", f"/clearfund/obligations/{obligation_id}/fund", json=payload, headers=self._headers()
        )
        return resp.status_code, _safe_json(resp)

    async def get_funding(self, obligation_id: str) -> dict:
        return await self._raw_request("GET", f"/clearfund/obligations/{obligation_id}/funding")

    # ---- a raw GET returning (status, body) for permission checks ----------
    async def try_get(self, path: str) -> tuple[int, Any]:
        if self.cfg.request_delay_ms:
            await asyncio.sleep(self.cfg.request_delay_ms / 1000)
        resp = await self._http.request("GET", path, headers=self._headers())
        return resp.status_code, _safe_json(resp)

    # --- simulation additions ------------------------------------------------
    # Minimal wrappers used by scripts/simulation. Verified against
    # app/api/v1/endpoints/{events,family_files,agreements,clearfund,
    # parent_reports}.py. Additive only.

    async def rsvp_event(self, event_id: str, rsvp_status: str, rsvp_note: str | None = None) -> dict:
        """PUT /events/{event_id}/rsvp — rsvp_status: going|not_going|maybe|no_response."""
        return await self._raw_request(
            "PUT", f"/events/{event_id}/rsvp",
            json={"rsvp_status": rsvp_status, "rsvp_note": rsvp_note},
        )

    async def create_family_agreement(self, family_file_id: str, payload: dict | None = None) -> dict:
        """POST /family-files/{id}/agreements — there is NO generic POST /agreements
        route; SharedCare agreements are created through the family-file flow."""
        return await self._raw_request(
            "POST", f"/family-files/{family_file_id}/agreements", json=payload or {},
        )

    async def update_agreement_section(self, section_id: str, payload: dict) -> dict:
        """PUT /agreements/sections/{id} — any update marks the section completed."""
        return await self._raw_request("PUT", f"/agreements/sections/{section_id}", json=payload)

    async def list_obligations(self, case_id: str, **params: Any) -> Any:
        return await self._raw_request(
            "GET", "/clearfund/obligations/", params={"case_id": case_id, **params}
        )

    async def dispute_obligation(self, obligation_id: str, reason: str) -> tuple[int, Any]:
        """Decline path for an expense request (freezes the obligation)."""
        if self.cfg.request_delay_ms:
            await asyncio.sleep(self.cfg.request_delay_ms / 1000)
        resp = await self._http.request(
            "POST", f"/clearfund/obligations/{obligation_id}/dispute",
            json={"reason": reason}, headers=self._headers(),
        )
        return resp.status_code, _safe_json(resp)

    async def complete_obligation(self, obligation_id: str) -> tuple[int, Any]:
        if self.cfg.request_delay_ms:
            await asyncio.sleep(self.cfg.request_delay_ms / 1000)
        resp = await self._http.request(
            "POST", f"/clearfund/obligations/{obligation_id}/complete",
            json={}, headers=self._headers(),
        )
        return resp.status_code, _safe_json(resp)

    async def generate_parent_report(
        self, report_type: str, family_file_id: str, date_start: str, date_end: str,
    ) -> tuple[int, int]:
        """POST /parent-reports/generate/{type} — returns (status, pdf_byte_count).
        report_type: custody_time|communication|expense|schedule|kidspace_communication.
        The endpoint streams a PDF; we only need status + size."""
        if self.cfg.request_delay_ms:
            await asyncio.sleep(self.cfg.request_delay_ms / 1000)
        resp = await self._http.request(
            "POST", f"/parent-reports/generate/{report_type}",
            params={"family_file_id": family_file_id,
                    "date_start": date_start, "date_end": date_end},
            headers=self._headers(),
        )
        return resp.status_code, len(resp.content or b"")


def _safe_json(resp: httpx.Response) -> Any:
    try:
        return resp.json()
    except Exception:
        return resp.text
