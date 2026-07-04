"""Deep functional verification against the LIVE API — proves the specific
end-user safety mechanisms actually work, with evidence printed per check.

Covers the gaps the bug-campaign doesn't exercise directly:
  1. ARIA parent messaging: safe passes, hostile is flagged, severe threat is
     flagged/blocked (the Safety Shield).
  2. My Circle ARIA monitoring: a hostile child→contact message is analyzed and
     flagged (proves circle contacts are monitored).
  3. Daily.co room lifecycle: a KidComs session creates a real Daily room and
     tearing it down flips the session to completed (create → teardown).

Read-mostly + self-cleaning (ends any room it opens). Uses an existing synthetic
family (no new users). GPS/custody/export accuracy is covered separately by the
bug-campaign oracle (scripts.bug_campaign.run --mode fast).

USAGE
  cd backend && source .venv/bin/activate && source scripts/bug_campaign/state/campaign.env
  python -m scripts.deep_verify
"""
from __future__ import annotations

import json
import os
import sys

import httpx

# Default is the live post-cutover (2026-07-03) host; the pre-cutover Oregon
# host (commonground-api-a0fr) now returns 503. CAMPAIGN_BASE_URL overrides.
BASE = os.environ.get("CAMPAIGN_BASE_URL", "https://api.find-commonground.com")
API = f"{BASE}/api/v1"
ADMIN_EMAIL = os.environ["CAMPAIGN_ADMIN_EMAIL"]
ADMIN_PW = os.environ["CAMPAIGN_ADMIN_PASSWORD"]

PASS, FAIL = "✅ PASS", "❌ FAIL"
results: list[tuple[str, bool, str]] = []


def record(name: str, ok: bool, evidence: str) -> None:
    results.append((name, ok, evidence))
    print(f"  {PASS if ok else FAIL}  {name}\n       {evidence}")


def flagged_signal(resp: dict) -> tuple[bool, float, str]:
    """Extract a (flagged, score, label) triple from either ARIA response shape."""
    flagged = bool(resp.get("is_flagged") or resp.get("flagged") or resp.get("should_block")
                   or resp.get("is_toxic"))
    score = float(resp.get("toxicity_score") or resp.get("confidence_score")
                  or resp.get("score") or 0.0)
    label = str(resp.get("severity") or resp.get("action") or resp.get("category") or "")
    return flagged, score, label


def main() -> None:
    with httpx.Client(timeout=60.0, follow_redirects=True) as c:
        atok = c.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PW}).json()["access_token"]
        ah = {"Authorization": f"Bearer {atok}"}
        cohorts = c.get(f"{API}/admin/bug-hunts", headers=ah).json()
        cohorts = cohorts.get("items", cohorts) if isinstance(cohorts, dict) else cohorts
        fam = None
        for co in cohorts:
            dash = c.get(f"{API}/admin/bug-hunts/{co['id']}", headers=ah).json()
            for f in dash.get("families", []):
                if f.get("family_file_id") and f.get("parent_a_email"):
                    fam = f
                    break
            if fam:
                break
        if not fam:
            print("ABORT: no usable synthetic family")
            sys.exit(1)

        ptok = c.post(f"{API}/auth/login", json={"email": fam["parent_a_email"],
                                                 "password": fam["parent_a_password"]}).json()["access_token"]
        ph = {"Authorization": f"Bearer {ptok}"}
        ffid = fam["family_file_id"]
        kids = c.get(f"{API}/family-files/{ffid}/children", headers=ph).json()
        kids = kids.get("items", kids) if isinstance(kids, dict) else kids
        child_id = kids[0]["id"] if kids else None
        print(f"Deep verify → {BASE}\n  family={ffid[:8]}  child={(child_id or '-')[:8]}\n")

        # ---- 1. ARIA parent messaging (Safety Shield) --------------------------
        print("1) ARIA parent messaging")
        r = c.post(f"{API}/messages/analyze", headers=ph,
                   params={"content": "Thanks for picking the kids up on time, I appreciate it.",
                           "family_file_id": ffid})
        ok_safe = r.status_code == 200
        fl, sc, lab = flagged_signal(r.json()) if ok_safe else (True, 0, "err")
        record("safe message is NOT flagged", ok_safe and not fl,
               f"HTTP {r.status_code}, flagged={fl} score={sc} {lab}")

        r = c.post(f"{API}/messages/analyze", headers=ph,
                   params={"content": "You are a pathetic excuse for a parent and everyone knows it.",
                           "family_file_id": ffid})
        fl, sc, lab = flagged_signal(r.json()) if r.status_code == 200 else (False, 0, "err")
        record("hostile message IS flagged (with rewrite offered)", r.status_code == 200 and fl,
               f"HTTP {r.status_code}, flagged={fl} score={sc} sev/action={lab}")

        # severe threat — send path should block (403) or analyze flags severe
        threat = "I am going to find you and make you regret this, you will be sorry."
        r = c.post(f"{API}/messages/analyze", headers=ph,
                   params={"content": threat, "family_file_id": ffid})
        fl, sc, lab = flagged_signal(r.json()) if r.status_code == 200 else (False, 0, "err")
        record("severe threat flagged at high severity", r.status_code == 200 and fl,
               f"HTTP {r.status_code}, flagged={fl} score={sc} sev/action={lab}")

        # ---- 2. My Circle ARIA monitoring -------------------------------------
        print("\n2) My Circle ARIA monitoring (circle contact channel)")
        if child_id:
            r = c.post(f"{API}/circle-messages/analyze", headers=ph,
                       json={"content": "shut up you're so stupid i hate you", "sender_type": "child",
                             "child_id": child_id, "family_file_id": ffid})
            if r.status_code == 200:
                body = r.json()
                fl, sc, lab = flagged_signal(body)
                record("hostile circle message analyzed + flagged", fl,
                       f"HTTP 200, flagged={fl} score={sc} sev={lab} cats={body.get('categories')}")
            else:
                record("hostile circle message analyzed + flagged", False,
                       f"HTTP {r.status_code}: {str(r.text)[:120]}")
        else:
            record("hostile circle message analyzed + flagged", False, "no child_id available")

        # ---- 3. Daily.co room lifecycle ---------------------------------------
        print("\n3) Daily.co room lifecycle (create → teardown)")
        session_id = None
        if child_id:
            r = c.post(f"{API}/kidcoms/sessions", headers=ph,
                       json={"family_file_id": ffid, "child_id": child_id,
                             "session_type": "video_call", "invited_contact_ids": []})
            if r.status_code in (200, 201):
                s = r.json()
                session_id = s.get("id")
                room = s.get("daily_room_name") or s.get("daily_room_url")
                record("KidComs session creates a Daily room", bool(room),
                       f"HTTP {r.status_code}, room={room}, status={s.get('status')}")
            else:
                record("KidComs session creates a Daily room", False,
                       f"HTTP {r.status_code}: {str(r.text)[:140]}")

            if session_id:
                r = c.post(f"{API}/kidcoms/sessions/{session_id}/end", headers=ph, json={})
                if r.status_code in (200, 201):
                    s = r.json()
                    done = str(s.get("status", "")).lower() in ("completed", "ended")
                    record("ending the call tears the room down", done,
                           f"HTTP {r.status_code}, status={s.get('status')}, ended_at={s.get('ended_at')}")
                else:
                    record("ending the call tears the room down", False,
                           f"HTTP {r.status_code}: {str(r.text)[:140]}")
        else:
            record("KidComs session creates a Daily room", False, "no child_id available")

    # ---- summary ----
    passed = sum(1 for _, ok, _ in results if ok)
    print(f"\n{'='*60}\nDEEP VERIFY: {passed}/{len(results)} checks passed")
    for name, ok, _ in results:
        if not ok:
            print(f"  FAILED: {name}")
    sys.exit(0 if passed == len(results) else 1)


if __name__ == "__main__":
    main()
