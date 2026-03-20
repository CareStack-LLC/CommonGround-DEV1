#!/usr/bin/env python3
"""
SendGrid Marketing Setup Script

Creates contact lists and custom fields for CommonGround's marketing infrastructure.
Run once, then paste the printed IDs into your .env file.

Usage:
    SENDGRID_API_KEY=SG.xxx python scripts/setup_sendgrid_lists.py
"""

import os
import sys
import json
import httpx

API_KEY = os.environ.get("SENDGRID_API_KEY")
if not API_KEY:
    print("ERROR: Set SENDGRID_API_KEY environment variable first.")
    print("  export SENDGRID_API_KEY=SG.your_key_here")
    sys.exit(1)

BASE = "https://api.sendgrid.com/v3"
HEADERS = {
    "Authorization": f"Bearer {API_KEY}",
    "Content-Type": "application/json",
}

# ── Lists to create ──────────────────────────────────────────────────────────
LISTS = [
    {"name": "Early Adopters", "env_var": "SENDGRID_EARLY_ADOPTER_LIST_ID"},
    {"name": "Newsletter Subscribers", "env_var": "SENDGRID_NEWSLETTER_LIST_ID"},
    {"name": "Contact Form Leads", "env_var": "SENDGRID_LEADS_LIST_ID"},
    {"name": "Professional Leads", "env_var": "SENDGRID_PROFESSIONAL_LIST_ID"},
    {"name": "Registered Users", "env_var": "SENDGRID_USERS_LIST_ID"},
]

# ── Custom fields to create ──────────────────────────────────────────────────
CUSTOM_FIELDS = [
    {"name": "signup_source", "field_type": "Text"},
    {"name": "user_type", "field_type": "Text"},       # parent, professional, admin
    {"name": "inquiry_type", "field_type": "Text"},     # general, support, professional, etc.
]


def get_existing_lists():
    """Fetch all existing marketing contact lists."""
    resp = httpx.get(f"{BASE}/marketing/lists", headers=HEADERS, timeout=10)
    if resp.status_code != 200:
        print(f"  WARNING: Could not fetch lists ({resp.status_code})")
        return {}
    data = resp.json()
    return {lst["name"]: lst["id"] for lst in data.get("result", [])}


def create_list(name: str) -> str:
    """Create a marketing contact list and return its ID."""
    resp = httpx.post(
        f"{BASE}/marketing/lists",
        headers=HEADERS,
        json={"name": name},
        timeout=10,
    )
    if resp.status_code in [200, 201]:
        list_id = resp.json()["id"]
        return list_id
    else:
        print(f"  ERROR creating '{name}': {resp.status_code} {resp.text}")
        return ""


def get_existing_fields():
    """Fetch existing custom field definitions."""
    resp = httpx.get(f"{BASE}/marketing/field_definitions", headers=HEADERS, timeout=10)
    if resp.status_code != 200:
        print(f"  WARNING: Could not fetch fields ({resp.status_code})")
        return {}
    data = resp.json()
    custom = data.get("custom_fields", [])
    return {f["name"]: f["id"] for f in custom}


def create_custom_field(name: str, field_type: str) -> str:
    """Create a custom field and return its ID."""
    resp = httpx.post(
        f"{BASE}/marketing/field_definitions",
        headers=HEADERS,
        json={"name": name, "field_type": field_type},
        timeout=10,
    )
    if resp.status_code in [200, 201]:
        field_id = resp.json()["id"]
        return field_id
    else:
        print(f"  ERROR creating field '{name}': {resp.status_code} {resp.text}")
        return ""


def main():
    print("=" * 60)
    print("  CommonGround — SendGrid Marketing Setup")
    print("=" * 60)

    # ── Step 1: Create/find lists ─────────────────────────────────────────
    print("\n📋 CONTACT LISTS")
    print("-" * 40)
    existing_lists = get_existing_lists()
    list_results = {}

    for lst in LISTS:
        name = lst["name"]
        env_var = lst["env_var"]

        if name in existing_lists:
            list_id = existing_lists[name]
            print(f"  ✅ {name}: {list_id} (already exists)")
        else:
            list_id = create_list(name)
            if list_id:
                print(f"  ✨ {name}: {list_id} (created)")
            else:
                print(f"  ❌ {name}: FAILED")
                continue

        list_results[env_var] = list_id

    # ── Step 2: Create/find custom fields ─────────────────────────────────
    print("\n🏷️  CUSTOM FIELDS")
    print("-" * 40)
    existing_fields = get_existing_fields()
    field_results = {}

    for field in CUSTOM_FIELDS:
        name = field["name"]
        field_type = field["field_type"]

        if name in existing_fields:
            field_id = existing_fields[name]
            print(f"  ✅ {name}: {field_id} (already exists)")
        else:
            field_id = create_custom_field(name, field_type)
            if field_id:
                print(f"  ✨ {name}: {field_id} (created)")
            else:
                print(f"  ❌ {name}: FAILED")
                continue

        field_results[name] = field_id

    # ── Step 3: Print .env block ──────────────────────────────────────────
    print("\n" + "=" * 60)
    print("  📋 COPY THIS INTO YOUR .env FILE")
    print("=" * 60)
    print()
    print("# SendGrid Marketing Contact Lists")
    for env_var, list_id in list_results.items():
        print(f"{env_var}={list_id}")

    print()
    print("# SendGrid Custom Field IDs (for reference in code)")
    print("# Use these field IDs in add_marketing_contact() custom_fields param")
    for name, field_id in field_results.items():
        print(f"# {name} = {field_id}")

    print()
    print("=" * 60)
    print("  ✅ DONE! Paste the env vars above into your .env and Render.")
    print("=" * 60)


if __name__ == "__main__":
    main()
