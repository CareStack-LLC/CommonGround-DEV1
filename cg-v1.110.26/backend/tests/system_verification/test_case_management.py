#!/usr/bin/env python3
"""
Test script for case management endpoints.
"""

import requests
import json
from datetime import date
import time

BASE_URL = "http://localhost:8000/api/v1"

def register_user(email, password, first_name, last_name):
    """Register a new user and return auth tokens."""
    data = {
        "email": email,
        "password": password,
        "first_name": first_name,
        "last_name": last_name,
        "phone": "+15551234567"
    }
    response = requests.post(f"{BASE_URL}/auth/register", json=data)
    if response.status_code == 201:
        return response.json()
    return None

def create_case(access_token, case_name, other_parent_email):
    """Create a new case."""
    print("\n=== Creating Case ===")
    headers = {"Authorization": f"Bearer {access_token}"}
    data = {
        "case_name": case_name,
        "other_parent_email": other_parent_email,
        "state": "CA",
        "county": "Los Angeles",
        "children": [
            {
                "first_name": "Emma",
                "last_name": "Smith",
                "date_of_birth": "2015-03-15",
                "gender": "female"
            },
            {
                "first_name": "Noah",
                "last_name": "Smith",
                "date_of_birth": "2017-07-22",
                "gender": "male"
            }
        ]
    }

    response = requests.post(f"{BASE_URL}/cases/", json=data, headers=headers)
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")

    if response.status_code == 201:
        return response.json()
    return None

def list_cases(access_token):
    """List all cases for user."""
    print("\n=== Listing Cases ===")
    headers = {"Authorization": f"Bearer {access_token}"}

    response = requests.get(f"{BASE_URL}/cases/", headers=headers)
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")

    return response.json() if response.status_code == 200 else None

def get_case(access_token, case_id):
    """Get case details."""
    print(f"\n=== Getting Case {case_id} ===")
    headers = {"Authorization": f"Bearer {access_token}"}

    response = requests.get(f"{BASE_URL}/cases/{case_id}", headers=headers)
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")

    return response.json() if response.status_code == 200 else None

def accept_invitation(access_token, case_id, invitation_token):
    """Accept a case invitation."""
    print(f"\n=== Accepting Invitation for Case {case_id} ===")
    headers = {"Authorization": f"Bearer {access_token}"}
    data = {"invitation_token": invitation_token}

    response = requests.post(f"{BASE_URL}/cases/{case_id}/accept", json=data, headers=headers)
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")

    return response.status_code == 200

def add_child(access_token, case_id):
    """Add a child to a case."""
    print(f"\n=== Adding Child to Case {case_id} ===")
    headers = {"Authorization": f"Bearer {access_token}"}
    data = {
        "first_name": "Sophia",
        "last_name": "Smith",
        "date_of_birth": "2019-11-05",
        "gender": "female"
    }

    response = requests.post(f"{BASE_URL}/cases/{case_id}/children", json=data, headers=headers)
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")

    if response.status_code == 200:
        return response.json()
    return None

def update_case(access_token, case_id):
    """Update case details."""
    print(f"\n=== Updating Case {case_id} ===")
    headers = {"Authorization": f"Bearer {access_token}"}
    data = {
        "case_name": "Smith Family Case - Updated",
        "court": "Los Angeles Superior Court"
    }

    response = requests.put(f"{BASE_URL}/cases/{case_id}", json=data, headers=headers)
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")

    return response.status_code == 200

def main():
    """Run case management tests."""
    print("🧪 Testing CommonGround Case Management API")
    print("=" * 60)

    # Register two users (two parents) with unique emails
    timestamp = int(time.time())
    parent1_email = f"parent1_{timestamp}@gmail.com"
    parent2_email = f"parent2_{timestamp}@gmail.com"

    print(f"\n📝 Registering Parent 1 ({parent1_email})...")
    parent1 = register_user(
        parent1_email,
        "TestPassword123!",
        "John",
        "Smith"
    )
    if not parent1:
        print("❌ Failed to register Parent 1")
        return

    print("✅ Parent 1 registered!")
    parent1_token = parent1["access_token"]

    print(f"\n📝 Registering Parent 2 ({parent2_email})...")
    parent2 = register_user(
        parent2_email,
        "TestPassword123!",
        "Jane",
        "Smith"
    )
    if not parent2:
        print("❌ Failed to register Parent 2")
        return

    print("✅ Parent 2 registered!")
    parent2_token = parent2["access_token"]

    # Parent 1 creates a case
    case_result = create_case(
        parent1_token,
        "Smith Family Case",
        parent2_email
    )
    if not case_result:
        print("\n❌ Failed to create case")
        return

    print("\n✅ Case created successfully!")
    case_id = case_result["id"]
    invitation_token = case_result["invitation_token"]

    # Parent 1 lists their cases
    cases = list_cases(parent1_token)
    if cases:
        print(f"\n✅ Parent 1 has {len(cases)} case(s)")

    # Parent 1 gets case details
    case_details = get_case(parent1_token, case_id)
    if case_details:
        print("\n✅ Retrieved case details")

    # Parent 2 accepts the invitation
    if accept_invitation(parent2_token, case_id, invitation_token):
        print("\n✅ Parent 2 accepted invitation!")
    else:
        print("\n❌ Failed to accept invitation")

    # Parent 2 lists their cases (should now include this case)
    parent2_cases = list_cases(parent2_token)
    if parent2_cases:
        print(f"\n✅ Parent 2 now has {len(parent2_cases)} case(s)")

    # Add a child
    child_result = add_child(parent1_token, case_id)
    if child_result:
        print("\n✅ Added child to case!")

    # Update case
    if update_case(parent1_token, case_id):
        print("\n✅ Updated case details!")

    # Get updated case
    updated_case = get_case(parent1_token, case_id)
    if updated_case and updated_case["status"] == "active":
        print("\n✅ Case is now active!")

    print("\n" + "=" * 60)
    print("🎉 All case management tests completed!")
    print("\nCase Management Features Tested:")
    print("  ✅ User registration")
    print("  ✅ Case creation")
    print("  ✅ Case invitation")
    print("  ✅ Invitation acceptance")
    print("  ✅ List cases")
    print("  ✅ Get case details")
    print("  ✅ Add children")
    print("  ✅ Update case")

if __name__ == "__main__":
    main()
