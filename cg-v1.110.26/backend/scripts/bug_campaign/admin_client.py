"""
AdminClient — superadmin-authenticated calls to set up and read the bug-hunt
cohort (create, seed families, assign/resend tester tokens, AI overview,
teardown). Reuses ParentAgentClient's transport for auth + retry.
"""

from __future__ import annotations

from typing import Any, Optional

from .client import ParentAgentClient
from .config import CampaignConfig


class AdminClient:
    def __init__(self, cfg: CampaignConfig):
        self.cfg = cfg
        if not cfg.admin_email or not cfg.admin_password:
            raise SystemExit("AdminClient needs CAMPAIGN_ADMIN_EMAIL / CAMPAIGN_ADMIN_PASSWORD.")
        self._c = ParentAgentClient(cfg, cfg.admin_email, cfg.admin_password, name="admin")

    async def __aenter__(self) -> "AdminClient":
        await self._c.login()
        return self

    async def __aexit__(self, *exc) -> None:
        await self._c.aclose()

    async def _req(self, method: str, path: str, **kw) -> Any:
        return await self._c._raw_request(method, path, **kw)

    # ---- cohort lifecycle --------------------------------------------------
    async def create_cohort(
        self, name: str, target_feature: str, family_count: int,
        description: str = "", test_instructions: str = "",
    ) -> dict:
        return await self._req("POST", "/admin/bug-hunts", json={
            "name": name, "description": description, "target_feature": target_feature,
            "family_count": family_count, "test_instructions": test_instructions,
        })

    async def get_cohort(self, cohort_id: str) -> dict:
        """Full dashboard: cohort, families (with parent credentials), bugs, notes, stats."""
        return await self._req("GET", f"/admin/bug-hunts/{cohort_id}")

    async def generate_families(self, cohort_id: str) -> dict:
        """
        Bulk-seeds cohort.family_count families (Supabase auth + Stripe +
        18-section agreement per family) — sequential server-side, easily
        60-150s+ for 50 families. Uses a long timeout and NO retry-on-timeout:
        a client-side timeout retry of this non-idempotent endpoint would race
        the still-running original request and crash both on a duplicate
        email (observed in prod — the retry re-ran family generation from
        index 0 while the original request was still creating families).
        """
        return await self._req(
            "POST", f"/admin/bug-hunts/{cohort_id}/generate",
            timeout=300.0, retry_on_timeout=False,
        )

    async def list_cohorts(self, status: str | None = None, limit: int = 50) -> Any:
        params = {"limit": limit}
        if status:
            params["status"] = status
        return await self._req("GET", "/admin/bug-hunts", params=params)

    async def delete_cohort(self, cohort_id: str) -> Any:
        return await self._req("DELETE", f"/admin/bug-hunts/{cohort_id}")

    async def ai_overview(self, cohort_id: str) -> Any:
        return await self._req("POST", f"/admin/bug-hunts/{cohort_id}/ai-overview")

    # ---- checklist ---------------------------------------------------------
    async def add_checklist_item(self, cohort_id: str, title: str, description: str = "") -> dict:
        return await self._req(
            "POST", f"/admin/bug-hunts/{cohort_id}/checklist",
            json={"title": title, "description": description},
        )

    # ---- testers (token now returned by the endpoint) ----------------------
    async def assign_tester(self, cohort_id: str, family_id: str, tester_name: str, tester_email: str) -> dict:
        return await self._req(
            "POST", f"/admin/bug-hunts/{cohort_id}/families/{family_id}/assign-tester",
            json={"tester_name": tester_name, "tester_email": tester_email},
        )

    async def resend_tester(self, cohort_id: str, tester_id: str) -> dict:
        return await self._req("POST", f"/admin/bug-hunts/{cohort_id}/testers/{tester_id}/resend")
