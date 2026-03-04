#!/usr/bin/env python3
"""
Seed script for Professional Portal demo data.

Creates professional users for all seeded firms so they can log in
and accept case invitations from parents.

For each firm:
- Creates a user account (Supabase auth)
- Creates a ProfessionalProfile
- Links them to their firm via FirmMembership

Usage:
    python scripts/seed_professional_demo.py --api-url https://commonground-api-gdxg.onrender.com
    python scripts/seed_professional_demo.py --api-url http://localhost:8000
"""

import argparse
import requests
import json
from datetime import datetime, timedelta

# All firms with their professional details
FIRM_PROFESSIONALS = [
    {
        "firm_name": "Harbor Family Law Group",
        "firm_email": "info@harborfamilylaw.com",
        "professional": {
            "email": "attorney@harborfamilylaw.com",
            "first_name": "Michael",
            "last_name": "Chen",
            "professional_type": "attorney",
            "license_number": "CA-HFL-001",
        }
    },
    {
        "firm_name": "Pasadena Family Mediation Center",
        "firm_email": "mediate@pfmc.com",
        "professional": {
            "email": "mediate@pfmc.com",
            "first_name": "Sarah",
            "last_name": "Thompson",
            "professional_type": "mediator",
            "license_number": "CA-PFMC-002",
        }
    },
    {
        "firm_name": "Irvine Custody Solutions",
        "firm_email": "contact@irvinecustody.com",
        "professional": {
            "email": "contact@irvinecustody.com",
            "first_name": "David",
            "last_name": "Park",
            "professional_type": "attorney",
            "license_number": "CA-ICS-003",
        }
    },
    {
        "firm_name": "Compton Community Legal Aid",
        "firm_email": "help@comptonlegal.org",
        "professional": {
            "email": "help@comptonlegal.org",
            "first_name": "Angela",
            "last_name": "Washington",
            "professional_type": "attorney",
            "license_number": "CA-CCLA-004",
        }
    },
    {
        "firm_name": "Carson Family Advocates",
        "firm_email": "advocates@carsonfamily.com",
        "professional": {
            "email": "advocates@carsonfamily.com",
            "first_name": "Marcus",
            "last_name": "Rivera",
            "professional_type": "attorney",
            "license_number": "CA-CFA-005",
        }
    },
    {
        "firm_name": "Downtown LA Family Law Partners",
        "firm_email": "partners@lafamilylaw.com",
        "professional": {
            "email": "partners@lafamilylaw.com",
            "first_name": "Jennifer",
            "last_name": "Kim",
            "professional_type": "attorney",
            "license_number": "CA-DLFLP-006",
        }
    },
    {
        "firm_name": "Redlands Family Justice Center",
        "firm_email": "justice@redlandsfamily.org",
        "professional": {
            "email": "justice@redlandsfamily.org",
            "first_name": "Robert",
            "last_name": "Martinez",
            "professional_type": "attorney",
            "license_number": "CA-RFJC-007",
        }
    },
    {
        "firm_name": "Riverside Co-Parenting Institute",
        "firm_email": "institute@riversidecopi.com",
        "professional": {
            "email": "institute@riversidecopi.com",
            "first_name": "Lisa",
            "last_name": "Nguyen",
            "professional_type": "parenting_coordinator",
            "license_number": "CA-RCPI-008",
        }
    },
    {
        "firm_name": "Culver City Collaborative Law",
        "firm_email": "collab@culvercitylaw.com",
        "professional": {
            "email": "collab@culvercitylaw.com",
            "first_name": "Daniel",
            "last_name": "Foster",
            "professional_type": "attorney",
            "license_number": "CA-CCCL-009",
        }
    },
    {
        "firm_name": "Lakewood Family Mediation Services",
        "firm_email": "mediate@lakewoodfms.com",
        "professional": {
            "email": "mediate@lakewoodfms.com",
            "first_name": "Patricia",
            "last_name": "Hughes",
            "professional_type": "mediator",
            "license_number": "CA-LFMS-010",
        }
    },
    {
        "firm_name": "South Bay Children's Law Center",
        "firm_email": "children@southbaylaw.org",
        "professional": {
            "email": "children@southbaylaw.org",
            "first_name": "Amanda",
            "last_name": "Brooks",
            "professional_type": "attorney",
            "license_number": "CA-SBCLC-011",
        }
    },
    {
        "firm_name": "Orange County Family Solutions",
        "firm_email": "solutions@ocfamily.com",
        "professional": {
            "email": "solutions@ocfamily.com",
            "first_name": "Christopher",
            "last_name": "Lee",
            "professional_type": "attorney",
            "license_number": "CA-OCFS-012",
        }
    },
    {
        "firm_name": "San Gabriel Valley Legal Group",
        "firm_email": "sgv@legalgroup.com",
        "professional": {
            "email": "sgv@legalgroup.com",
            "first_name": "Maria",
            "last_name": "Garcia",
            "professional_type": "attorney",
            "license_number": "CA-SGVLG-013",
        }
    },
    {
        "firm_name": "Inglewood Family Advocacy",
        "firm_email": "advocacy@inglewoodfamily.com",
        "professional": {
            "email": "advocacy@inglewoodfamily.com",
            "first_name": "Kevin",
            "last_name": "Johnson",
            "professional_type": "attorney",
            "license_number": "CA-IFA-014",
        }
    },
    {
        "firm_name": "West LA Co-Parenting Counsel",
        "firm_email": "counsel@westlacpc.com",
        "professional": {
            "email": "counsel@westlacpc.com",
            "first_name": "Rachel",
            "last_name": "Anderson",
            "professional_type": "parenting_coordinator",
            "license_number": "CA-WLACPC-015",
        }
    },
]

DEFAULT_PASSWORD = "Demo2026!"


def main():
    parser = argparse.ArgumentParser(description='Seed Professional Portal demo data')
    parser.add_argument('--api-url', default='http://localhost:8000', help='API base URL')
    args = parser.parse_args()

    API_BASE = args.api_url.rstrip('/')
    print(f"\n{'='*70}")
    print(f"  PROFESSIONAL PORTAL SEEDING")
    print(f"  API: {API_BASE}")
    print(f"{'='*70}\n")

    successful = []
    failed = []

    for i, firm_data in enumerate(FIRM_PROFESSIONALS, 1):
        firm_name = firm_data["firm_name"]
        prof = firm_data["professional"]

        print(f"\n[{i}/{len(FIRM_PROFESSIONALS)}] {firm_name}")
        print(f"    Email: {prof['email']}")

        # Step 1: Register user
        user_data = {
            "email": prof["email"],
            "password": DEFAULT_PASSWORD,
            "first_name": prof["first_name"],
            "last_name": prof["last_name"]
        }

        resp = requests.post(f"{API_BASE}/api/v1/auth/register", json=user_data)

        if resp.status_code == 201:
            print(f"    ✅ User registered")
            token = resp.json().get('access_token')
        elif resp.status_code == 400 and "already registered" in resp.text.lower():
            print(f"    ℹ️  User exists, logging in...")
            resp = requests.post(f"{API_BASE}/api/v1/auth/login", json={
                "email": prof["email"],
                "password": DEFAULT_PASSWORD
            })
            if resp.status_code == 200:
                token = resp.json().get('access_token')
            else:
                print(f"    ❌ Login failed: {resp.text[:100]}")
                failed.append({"firm": firm_name, "error": "Login failed"})
                continue
        else:
            print(f"    ❌ Registration failed: {resp.text[:100]}")
            failed.append({"firm": firm_name, "error": f"Registration failed: {resp.status_code}"})
            continue

        # Step 2: Create professional profile
        profile_data = {
            "professional_type": prof["professional_type"],
            "license_number": prof["license_number"],
            "license_state": "CA"
        }

        resp = requests.post(
            f"{API_BASE}/api/v1/professional/profile",
            json=profile_data,
            headers={"Authorization": f"Bearer {token}"}
        )

        if resp.status_code in [200, 201]:
            profile = resp.json()
            print(f"    ✅ Professional profile created ({prof['professional_type']})")
        elif resp.status_code == 400 and "already exists" in resp.text.lower():
            print(f"    ℹ️  Profile already exists")
            # Get existing profile
            resp = requests.get(
                f"{API_BASE}/api/v1/professional/profile",
                headers={"Authorization": f"Bearer {token}"}
            )
            if resp.status_code == 200:
                profile = resp.json()
            else:
                print(f"    ❌ Could not get profile")
                failed.append({"firm": firm_name, "error": "Could not get profile"})
                continue
        else:
            print(f"    ❌ Profile creation failed: {resp.text[:100]}")
            failed.append({"firm": firm_name, "error": f"Profile failed: {resp.status_code}"})
            continue

        # Step 3: Find the firm by name and join it
        resp = requests.get(
            f"{API_BASE}/api/v1/professional/directory",
            headers={"Authorization": f"Bearer {token}"}
        )

        if resp.status_code == 200:
            data = resp.json()
            firms = data.get("items", []) if isinstance(data, dict) else data
            target_firm = None
            for f in firms:
                if f.get("name") == firm_name:
                    target_firm = f
                    break

            if target_firm:
                firm_id = target_firm.get("id")

                # Check if already a member
                resp = requests.get(
                    f"{API_BASE}/api/v1/professional/firms",
                    headers={"Authorization": f"Bearer {token}"}
                )

                existing_firms = resp.json() if resp.status_code == 200 else []
                already_member = any(ef.get("id") == firm_id for ef in existing_firms)

                if already_member:
                    print(f"    ℹ️  Already member of firm")
                    successful.append({"firm": firm_name, "email": prof["email"]})
                else:
                    # Join the firm (create membership)
                    # Since the firm exists but has no owner, we'll create as owner
                    resp = requests.post(
                        f"{API_BASE}/api/v1/professional/firms/{firm_id}/join",
                        json={"role": "owner"},
                        headers={"Authorization": f"Bearer {token}"}
                    )

                    if resp.status_code in [200, 201]:
                        print(f"    ✅ Joined firm as owner")
                        successful.append({"firm": firm_name, "email": prof["email"]})
                    elif resp.status_code == 404:
                        # Join endpoint might not exist, try adding membership directly
                        # This is a fallback - the professional can claim the firm through UI
                        print(f"    ⚠️  Firm found but join endpoint unavailable")
                        print(f"       Professional can claim firm through onboarding")
                        successful.append({"firm": firm_name, "email": prof["email"], "note": "needs to claim firm"})
                    else:
                        print(f"    ⚠️  Could not join firm: {resp.status_code}")
                        successful.append({"firm": firm_name, "email": prof["email"], "note": "needs to claim firm"})
            else:
                print(f"    ⚠️  Firm not found in directory")
                successful.append({"firm": firm_name, "email": prof["email"], "note": "firm not in directory"})
        else:
            print(f"    ⚠️  Could not fetch directory")
            successful.append({"firm": firm_name, "email": prof["email"], "note": "directory unavailable"})

    # Summary
    print(f"\n{'='*70}")
    print(f"  SEEDING COMPLETE")
    print(f"{'='*70}\n")

    print(f"✅ Successful: {len(successful)}")
    print(f"❌ Failed: {len(failed)}")

    if successful:
        print(f"\n📋 Professional Login Credentials:")
        print(f"   Password for all: {DEFAULT_PASSWORD}\n")
        for s in successful:
            note = f" ({s['note']})" if s.get('note') else ""
            print(f"   • {s['email']}{note}")

    if failed:
        print(f"\n❌ Failed accounts:")
        for f in failed:
            print(f"   • {f['firm']}: {f['error']}")

    print(f"\n💡 To use:")
    print(f"   1. Go to /login")
    print(f"   2. Sign in with professional email + {DEFAULT_PASSWORD}")
    print(f"   3. Navigate to /professional")
    print(f"   4. Complete onboarding if prompted")
    print()


if __name__ == "__main__":
    main()
