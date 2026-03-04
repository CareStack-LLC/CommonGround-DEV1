#!/usr/bin/env python3
"""
Seed script to create a firm invitation for testing.

Creates:
- Parent Celia (celia@dde.com)
- Family file between Celia and Terry
- Professional access request from Celia to Family First Law Group

Usage:
    python scripts/seed_firm_invitation.py --api-url https://commonground-api-gdxg.onrender.com
    python scripts/seed_firm_invitation.py --api-url http://localhost:8000
"""

import argparse
import requests
import json
from datetime import datetime, timedelta

def main():
    parser = argparse.ArgumentParser(description='Seed firm invitation test data')
    parser.add_argument('--api-url', default='http://localhost:8000', help='API base URL')
    args = parser.parse_args()

    API_BASE = args.api_url.rstrip('/')
    print(f"Seeding data to: {API_BASE}")

    # Step 1: Login as Jennifer Lawson to get firm ID
    print("\n=== Step 1: Get Firm Info ===")
    resp = requests.post(f"{API_BASE}/api/v1/auth/login", json={
        "email": "jennifer.lawson@familyfirst.com",
        "password": "lawyer123"
    })
    if resp.status_code != 200:
        print(f"Login failed for Jennifer: {resp.text}")
        return
    prof_token = resp.json().get('access_token')

    # Get professional profile with firms
    resp = requests.get(
        f"{API_BASE}/api/v1/professional/profile",
        headers={"Authorization": f"Bearer {prof_token}"}
    )
    if resp.status_code != 200:
        print(f"Profile fetch failed: {resp.text}")
        return

    profile = resp.json()
    firms = profile.get('firms', [])
    if not firms:
        print("No firms found for Jennifer")
        return

    firm_id = firms[0].get('firm_id')
    firm_name = firms[0].get('firm_name')
    print(f"Found firm: {firm_name} ({firm_id})")

    # Step 2: Register Celia (Parent A)
    print("\n=== Step 2: Register Celia ===")
    celia_data = {
        "email": "celia@dde.com",
        "password": "power123!!!",
        "first_name": "Celia",
        "last_name": "Davis"
    }
    resp = requests.post(f"{API_BASE}/api/v1/auth/register", json=celia_data)
    if resp.status_code == 201:
        print(f"Celia registered: {celia_data['email']}")
        celia_token = resp.json().get('access_token')
    elif resp.status_code == 400:
        print("Celia exists, logging in...")
        resp = requests.post(f"{API_BASE}/api/v1/auth/login", json={
            "email": celia_data["email"],
            "password": celia_data["password"]
        })
        if resp.status_code == 200:
            celia_token = resp.json().get('access_token')
        else:
            print(f"Login failed: {resp.text}")
            return
    else:
        print(f"Registration failed: {resp.text}")
        return

    # Get Celia's user ID
    resp = requests.get(
        f"{API_BASE}/api/v1/auth/me",
        headers={"Authorization": f"Bearer {celia_token}"}
    )
    if resp.status_code == 200:
        celia_user = resp.json()
        celia_id = celia_user.get('id')
        print(f"Celia user ID: {celia_id}")
    else:
        print(f"Could not get Celia's user info: {resp.status_code} - {resp.text[:100]}")
        return

    # Step 3: Login as Terry (existing user)
    print("\n=== Step 3: Login as Terry ===")
    terry_data = {
        "email": "twilliams@test.com",
        "password": "power123!!!"
    }
    resp = requests.post(f"{API_BASE}/api/v1/auth/login", json=terry_data)
    if resp.status_code == 200:
        terry_token = resp.json().get('access_token')
        print("Terry logged in")
    else:
        # Terry might not exist, create him
        print("Terry doesn't exist, creating...")
        resp = requests.post(f"{API_BASE}/api/v1/auth/register", json={
            "email": "twilliams@test.com",
            "password": "power123!!!",
            "first_name": "Terry",
            "last_name": "Williams"
        })
        if resp.status_code == 201:
            terry_token = resp.json().get('access_token')
            print("Terry created and logged in")
        else:
            print(f"Could not create/login Terry: {resp.text}")
            return

    # Get Terry's user ID
    resp = requests.get(
        f"{API_BASE}/api/v1/auth/me",
        headers={"Authorization": f"Bearer {terry_token}"}
    )
    terry_id = resp.json().get('id') if resp.status_code == 200 else None
    print(f"Terry user ID: {terry_id}")

    # Step 4: Create Family File (Celia creates)
    print("\n=== Step 4: Create Family File ===")
    ff_data = {
        "title": "Davis-Williams Family",
        "parent_a_role": "mother",
        "parent_b_email": terry_data["email"],
        "state": "CA",
        "county": "Orange"
    }
    resp = requests.post(
        f"{API_BASE}/api/v1/family-files/",
        json=ff_data,
        headers={"Authorization": f"Bearer {celia_token}"}
    )
    if resp.status_code == 201:
        family_file = resp.json()
        ff_id = family_file.get('id')
        print(f"Family file created: {ff_id}")
    else:
        print(f"Family file creation: {resp.status_code} - {resp.text[:200]}")
        # Try to get existing
        resp = requests.get(
            f"{API_BASE}/api/v1/family-files/",
            headers={"Authorization": f"Bearer {celia_token}"}
        )
        if resp.status_code == 200:
            files = resp.json().get('items', [])
            # Find the Davis-Williams one
            for f in files:
                if "Davis" in f.get('title', ''):
                    family_file = f
                    ff_id = f.get('id')
                    break
            else:
                if files:
                    family_file = files[0]
                    ff_id = family_file.get('id')
                else:
                    print("No family files found")
                    return
            print(f"Using existing family file: {ff_id}")
        else:
            return

    # Step 5: Terry accepts invitation
    print("\n=== Step 5: Terry Accepts Invitation ===")
    resp = requests.post(
        f"{API_BASE}/api/v1/family-files/{ff_id}/accept",
        headers={"Authorization": f"Bearer {terry_token}"}
    )
    if resp.status_code == 200:
        print("Terry joined family file")
    else:
        print(f"Accept invitation: {resp.status_code} - {resp.text[:100]}")

    # Step 6: Add a child
    print("\n=== Step 6: Add Child ===")
    child_data = {
        "first_name": "Mia",
        "last_name": "Davis-Williams",
        "date_of_birth": "2018-05-10",
        "gender": "female"
    }
    resp = requests.post(
        f"{API_BASE}/api/v1/family-files/{ff_id}/children",
        json=child_data,
        headers={"Authorization": f"Bearer {celia_token}"}
    )
    if resp.status_code in [200, 201]:
        child = resp.json()
        child_id = child.get('id')
        print(f"Child added: {child_data['first_name']} ({child_id})")

        # Terry approves
        resp2 = requests.post(
            f"{API_BASE}/api/v1/children/{child_id}/approve",
            headers={"Authorization": f"Bearer {terry_token}"}
        )
        if resp2.status_code == 200:
            print("  -> Approved by Terry")
    else:
        print(f"Child add: {resp.status_code} - {resp.text[:100]}")

    # Step 7: Create Professional Access Request from Celia to the firm
    print("\n=== Step 7: Create Firm Invitation (Access Request) ===")
    access_request_data = {
        "firm_id": firm_id,
        "message": "Looking for legal representation for our custody case. We need help with our parenting plan and schedule.",
        "requested_scopes": ["schedule", "messages", "agreement"]
    }
    resp = requests.post(
        f"{API_BASE}/api/v1/family-files/{ff_id}/professionals/invite",
        json=access_request_data,
        headers={"Authorization": f"Bearer {celia_token}"}
    )
    if resp.status_code in [200, 201]:
        invitation = resp.json()
        invitation_id = invitation.get('id')
        print(f"Firm invitation created: {invitation_id}")
        print(f"  -> Status: {invitation.get('status')}")
    else:
        print(f"Invitation failed: {resp.status_code} - {resp.text}")

    print("\n" + "="*60)
    print("SEED COMPLETE!")
    print("="*60)
    print(f"\nFamily File ID: {ff_id}")
    print(f"Firm ID: {firm_id}")
    print(f"\nLogin credentials:")
    print(f"  Professional: jennifer.lawson@familyfirst.com / lawyer123")
    print(f"  Celia (Parent A): celia@dde.com / power123!!!")
    print(f"  Terry (Parent B): twilliams@test.com / power123!!!")
    print(f"\nThe firm should now have a pending invitation visible in the Intake Center!")

if __name__ == "__main__":
    main()
