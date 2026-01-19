#!/usr/bin/env python3
"""
Seed script for Professional Portal demo data.

Creates:
- Professional user (Jennifer Lawson, attorney)
- Law firm (Family First Law Group)
- Test parents (Terry Williams, Sarah Johnson)
- Family file with 2 children
- Agreement with 50/50 custody
- Messages between parents
- Custody exchanges (including missed)
- ClearFund expenses
- Professional access request and case assignment

Usage:
    python scripts/seed_professional_demo.py --api-url https://commonground-api-gdxg.onrender.com
    python scripts/seed_professional_demo.py --api-url http://localhost:8000
"""

import argparse
import requests
import json
from datetime import datetime, timedelta

def main():
    parser = argparse.ArgumentParser(description='Seed Professional Portal demo data')
    parser.add_argument('--api-url', default='http://localhost:8000', help='API base URL')
    args = parser.parse_args()
    
    API_BASE = args.api_url.rstrip('/')
    print(f"Seeding data to: {API_BASE}")
    
    # Step 1: Register professional user
    print("\n=== Step 1: Register Professional ===")
    prof_data = {
        "email": "jennifer.lawson@familyfirst.com",
        "password": "lawyer123",
        "first_name": "Jennifer",
        "last_name": "Lawson"
    }
    resp = requests.post(f"{API_BASE}/api/v1/auth/register", json=prof_data)
    if resp.status_code == 201:
        print(f"Professional registered: {prof_data['email']}")
        prof_token = resp.json().get('access_token')
    elif resp.status_code == 400 and "already registered" in resp.text.lower():
        print("Professional already exists, logging in...")
        resp = requests.post(f"{API_BASE}/api/v1/auth/login", json={
            "email": prof_data["email"],
            "password": prof_data["password"]
        })
        if resp.status_code == 200:
            prof_token = resp.json().get('access_token')
        else:
            print(f"Login failed: {resp.text}")
            return
    else:
        print(f"Registration failed: {resp.text}")
        return
    
    # Step 2: Create professional profile
    print("\n=== Step 2: Create Professional Profile ===")
    profile_data = {
        "professional_type": "attorney",
        "license_number": "CA-123456",
        "license_state": "CA"
    }
    resp = requests.post(
        f"{API_BASE}/api/v1/professional/profile",
        json=profile_data,
        headers={"Authorization": f"Bearer {prof_token}"}
    )
    if resp.status_code in [200, 201]:
        prof_profile = resp.json()
        print(f"Professional profile created: {prof_profile.get('id')}")
    else:
        print(f"Profile creation: {resp.status_code} - {resp.text[:200]}")
        # Try to get existing profile
        resp = requests.get(
            f"{API_BASE}/api/v1/professional/profile",
            headers={"Authorization": f"Bearer {prof_token}"}
        )
        if resp.status_code == 200:
            prof_profile = resp.json()
            print(f"Using existing profile: {prof_profile.get('id')}")
        else:
            print("Could not get profile")
            return
    
    # Step 3: Create firm
    print("\n=== Step 3: Create Law Firm ===")
    firm_data = {
        "name": "Family First Law Group",
        "firm_type": "law_firm",
        "email": "contact@familyfirst.com",
        "phone": "555-123-4567",
        "address": "123 Legal Way, Los Angeles, CA 90001",
        "website": "https://familyfirst.com"
    }
    resp = requests.post(
        f"{API_BASE}/api/v1/professional/firms",
        json=firm_data,
        headers={"Authorization": f"Bearer {prof_token}"}
    )
    if resp.status_code in [200, 201]:
        firm = resp.json()
        print(f"Firm created: {firm.get('id')}")
    else:
        print(f"Firm creation: {resp.status_code} - {resp.text[:200]}")
        # List existing firms
        resp = requests.get(
            f"{API_BASE}/api/v1/professional/firms",
            headers={"Authorization": f"Bearer {prof_token}"}
        )
        if resp.status_code == 200:
            firms = resp.json()
            if firms:
                firm = firms[0]
                print(f"Using existing firm: {firm.get('id')}")
            else:
                print("No firms found")
                return
        else:
            return
    
    # Step 4: Register Parent A (Terry Williams)
    print("\n=== Step 4: Register Parent A ===")
    parent_a_data = {
        "email": "twilliams@test.com",
        "password": "power123!!!",
        "first_name": "Terry",
        "last_name": "Williams"
    }
    resp = requests.post(f"{API_BASE}/api/v1/auth/register", json=parent_a_data)
    if resp.status_code == 201:
        print(f"Parent A registered: {parent_a_data['email']}")
        parent_a_token = resp.json().get('access_token')
    elif resp.status_code == 400:
        print("Parent A exists, logging in...")
        resp = requests.post(f"{API_BASE}/api/v1/auth/login", json={
            "email": parent_a_data["email"],
            "password": parent_a_data["password"]
        })
        if resp.status_code == 200:
            parent_a_token = resp.json().get('access_token')
        else:
            print(f"Login failed: {resp.text}")
            return
    else:
        print(f"Failed: {resp.text}")
        return
    
    # Step 5: Register Parent B (Sarah Johnson)
    print("\n=== Step 5: Register Parent B ===")
    parent_b_data = {
        "email": "sjohnson@test.com",
        "password": "power123!!!",
        "first_name": "Sarah",
        "last_name": "Johnson"
    }
    resp = requests.post(f"{API_BASE}/api/v1/auth/register", json=parent_b_data)
    if resp.status_code == 201:
        print(f"Parent B registered: {parent_b_data['email']}")
        parent_b_token = resp.json().get('access_token')
    elif resp.status_code == 400:
        print("Parent B exists, logging in...")
        resp = requests.post(f"{API_BASE}/api/v1/auth/login", json={
            "email": parent_b_data["email"],
            "password": parent_b_data["password"]
        })
        if resp.status_code == 200:
            parent_b_token = resp.json().get('access_token')
        else:
            print(f"Login failed: {resp.text}")
            return
    else:
        print(f"Failed: {resp.text}")
        return
    
    # Step 6: Create Family File
    print("\n=== Step 6: Create Family File ===")
    ff_data = {
        "title": "Williams v. Johnson",
        "parent_a_role": "father",
        "parent_b_email": parent_b_data["email"],
        "state": "CA",
        "county": "Los Angeles"
    }
    resp = requests.post(
        f"{API_BASE}/api/v1/family-files/",
        json=ff_data,
        headers={"Authorization": f"Bearer {parent_a_token}"}
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
            headers={"Authorization": f"Bearer {parent_a_token}"}
        )
        if resp.status_code == 200:
            files = resp.json().get('items', [])
            if files:
                family_file = files[0]
                ff_id = family_file.get('id')
                print(f"Using existing family file: {ff_id}")
            else:
                print("No family files found")
                return
        else:
            return
    
    # Step 7: Parent B accepts invitation
    print("\n=== Step 7: Parent B Accepts Invitation ===")
    resp = requests.post(
        f"{API_BASE}/api/v1/family-files/{ff_id}/accept",
        headers={"Authorization": f"Bearer {parent_b_token}"}
    )
    if resp.status_code == 200:
        print("Parent B joined family file")
    else:
        print(f"Accept invitation: {resp.status_code} - {resp.text[:100]}")
    
    # Step 8: Add children
    print("\n=== Step 8: Add Children ===")
    children = [
        {"first_name": "Emma", "last_name": "Williams", "date_of_birth": "2016-03-15", "gender": "female"},
        {"first_name": "Liam", "last_name": "Williams", "date_of_birth": "2019-07-22", "gender": "male"}
    ]
    child_ids = []
    for child in children:
        resp = requests.post(
            f"{API_BASE}/api/v1/family-files/{ff_id}/children",
            json=child,
            headers={"Authorization": f"Bearer {parent_a_token}"}
        )
        if resp.status_code in [200, 201]:
            child_id = resp.json().get('id')
            child_ids.append(child_id)
            print(f"Child added: {child['first_name']} ({child_id})")
            
            # Parent B approves
            resp2 = requests.post(
                f"{API_BASE}/api/v1/children/{child_id}/approve",
                headers={"Authorization": f"Bearer {parent_b_token}"}
            )
            if resp2.status_code == 200:
                print(f"  -> Approved by Parent B")
        else:
            print(f"Child add failed: {resp.status_code}")
    
    # Step 9: Create Agreement
    print("\n=== Step 9: Create Agreement ===")
    agreement_data = {
        "title": "Williams-Johnson Custody Agreement",
        "agreement_type": "shared_care"
    }
    resp = requests.post(
        f"{API_BASE}/api/v1/family-files/{ff_id}/agreements",
        json=agreement_data,
        headers={"Authorization": f"Bearer {parent_a_token}"}
    )
    if resp.status_code == 201:
        agreement = resp.json()
        agreement_id = agreement.get('id')
        print(f"Agreement created: {agreement_id}")
    else:
        print(f"Agreement: {resp.status_code} - {resp.text[:200]}")
        agreement_id = None
    
    # Step 10: Create messages
    print("\n=== Step 10: Create Messages ===")
    messages = [
        {"from": parent_a_token, "content": "Hi Sarah, can we discuss the pickup schedule for next week?"},
        {"from": parent_b_token, "content": "Sure Terry. I was thinking Monday at 5pm works best for me."},
        {"from": parent_a_token, "content": "Monday at 5pm works for me too. I'll pick up the kids from your place."},
        {"from": parent_b_token, "content": "Perfect. Emma has soccer practice at 4pm, so she might need a snack."},
    ]
    for i, msg in enumerate(messages):
        resp = requests.post(
            f"{API_BASE}/api/v1/messages/",
            json={
                "family_file_id": ff_id,
                "content": msg["content"]
            },
            headers={"Authorization": f"Bearer {msg['from']}"}
        )
        if resp.status_code in [200, 201]:
            print(f"Message {i+1} sent")
        else:
            print(f"Message {i+1} failed: {resp.status_code}")
    
    # Step 11: Create ClearFund expenses
    print("\n=== Step 11: Create ClearFund Expenses ===")
    expenses = [
        {"description": "Soccer League Registration", "amount": 150.00, "category": "activities"},
        {"description": "Dental Checkup", "amount": 180.00, "category": "medical"},
        {"description": "School Supplies", "amount": 225.50, "category": "education"}
    ]
    for exp in expenses:
        resp = requests.post(
            f"{API_BASE}/api/v1/clearfund/obligations/",
            json={
                "case_id": ff_id,
                "description": exp["description"],
                "amount": exp["amount"],
                "category": exp["category"],
                "due_date": (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d"),
                "split_type": "equal"
            },
            headers={"Authorization": f"Bearer {parent_a_token}"}
        )
        if resp.status_code in [200, 201]:
            print(f"Expense created: {exp['description']}")
        else:
            print(f"Expense failed: {resp.status_code} - {resp.text[:100]}")
    
    print("\n" + "="*60)
    print("SEED COMPLETE!")
    print("="*60)
    print(f"\nFamily File ID: {ff_id}")
    print(f"\nLogin credentials:")
    print(f"  Professional: jennifer.lawson@familyfirst.com / lawyer123")
    print(f"  Parent A: twilliams@test.com / power123!!!")
    print(f"  Parent B: sjohnson@test.com / power123!!!")
    print(f"\nNote: Professional access request must be created manually")
    print(f"      through the parent portal UI or admin script.")

if __name__ == "__main__":
    main()
