import pytest
import pytest_asyncio
from httpx import AsyncClient
import uuid
from datetime import datetime, timedelta

# Shared state for schedule flow
class ScheduleFlowContext:
    parent_a_token: str = None
    parent_b_token: str = None
    parent_a_id: str = None
    parent_b_id: str = None
    case_id: str = None
    child_id: str = None
    event_id: str = None
    
    # Generate unique emails
    run_id = str(uuid.uuid4())[:8]
    parent_a_email = f"sched_parent_a_{run_id}@example.com"
    parent_b_email = f"sched_parent_b_{run_id}@example.com"

context = ScheduleFlowContext()

@pytest.mark.asyncio
async def test_schedule_flow_complete(test_client: AsyncClient):
    """
    End-to-End Schedule Verification Flow.
    
    Sequence:
    1. Setup: Register A & B, Create Case (with child), B Joins.
    2. A Creates an Exchange Event.
    3. B Lists events (Calendar View).
    4. B Checks-in at the exchange.
    5. Verify Compliance Metrics (optional).
    """
    
    def get_headers(token):
        return {"Authorization": f"Bearer {token}"}

    # ==========================================
    # 1. Setup: Auth & Case
    # ==========================================
    # Register A
    res = await test_client.post("/api/v1/auth/register", json={
        "email": context.parent_a_email, "password": "Password123!",
        "first_name": "SchedParent", "last_name": "A", "phone": "+15550000001"
    })
    assert res.status_code == 201
    context.parent_a_token = res.json()["access_token"]
    context.parent_a_id = res.json()["user"]["id"]

    # Register B
    res = await test_client.post("/api/v1/auth/register", json={
        "email": context.parent_b_email, "password": "Password123!",
        "first_name": "SchedParent", "last_name": "B", "phone": "+15550000002"
    })
    assert res.status_code == 201
    context.parent_b_token = res.json()["access_token"]
    context.parent_b_id = res.json()["user"]["id"]

    # Case Data
    case_data = {
        "case_name": "Schedule Test Case",
        "state": "CA",
        "other_parent_email": context.parent_b_email,
        "children": [{"first_name": "Kid", "last_name": "Sched", "date_of_birth": "2015-01-01"}]
    }
    
    # A Creates Case
    res = await test_client.post("/api/v1/cases/", json=case_data, headers=get_headers(context.parent_a_token))
    assert res.status_code == 201
    context.case_id = res.json()["id"]
    invite_token = res.json()["invitation_token"]
    
    # Get Child ID (needed for event)
    # The Case response might not have child IDs explicitly in main dict, let's fetch case to be sure or use logic
    # Actually, verify_feature_flows noted this limitation.
    # Let's hit the endpoint to add a child to be sure we have one ID we know, OR list children.
    # Let's list children or get case details.
    res = await test_client.get(f"/api/v1/cases/{context.case_id}", headers=get_headers(context.parent_a_token))
    # If participants doesn't have it, we might need a separate call.
    # But wait, we just need ANY text for child_ids if it's just a string list in JSON? 
    # Schema says `child_ids: List[str]`. 
    # Let's add a NEW child explicitly to get its ID returned.
    new_child = {"first_name": "EventKid", "last_name": "One", "date_of_birth": "2018-01-01"}
    res = await test_client.post(f"/api/v1/cases/{context.case_id}/children", json=new_child, headers=get_headers(context.parent_a_token))
    assert res.status_code == 200
    # The return of add_child (which calls `create_child`) typically returns the Child object.
    # Let's assume it returns JSON with ID.
    child_res = res.json()
    if isinstance(child_res, list): # sometimes APIs return list of all children
         context.child_id = child_res[-1]["id"]
    else:
         context.child_id = child_res["id"]

    # B Joins Case
    res = await test_client.post(
        f"/api/v1/cases/{context.case_id}/accept",
        json={"invitation_token": invite_token},
        headers=get_headers(context.parent_b_token)
    )
    assert res.status_code == 200
    print("\n[PASS] Setup Complete: Case created, Child added, B joined.")

    # ==========================================
    # 2. A Creates Exchange Event
    # ==========================================
    start_time = datetime.utcnow() + timedelta(days=1, hours=10) # Tomorrow 10am
    end_time = start_time + timedelta(hours=1)
    
    event_data = {
        "case_id": context.case_id,
        "event_type": "regular", # or custody? schema says regular/holiday etc.
        "start_time": start_time.isoformat(),
        "end_time": end_time.isoformat(),
        "custodial_parent_id": context.parent_a_id,
        "child_ids": [context.child_id],
        "title": "Weekend Exchange",
        "description": "Drop off at Starbucks",
        "is_exchange": True,
        "exchange_location": "123 Main St",
        "grace_period_minutes": 15
    }
    
    res = await test_client.post(
        "/api/v1/schedule/events",
        json=event_data,
        headers=get_headers(context.parent_a_token)
    )
    assert res.status_code == 201, f"Create event failed: {res.text}"
    context.event_id = res.json()["id"]
    print(f"[PASS] Event Created: {context.event_id}")

    # ==========================================
    # 3. B Lists Events (Calendar)
    # ==========================================
    # Calendar requires start/end range
    cal_start = datetime.utcnow().isoformat()
    cal_end = (datetime.utcnow() + timedelta(days=7)).isoformat()
    
    res = await test_client.get(
        f"/api/v1/schedule/cases/{context.case_id}/calendar",
        params={"start_date": cal_start, "end_date": cal_end},
        headers=get_headers(context.parent_b_token)
    )
    assert res.status_code == 200
    calendar_data = res.json()
    assert len(calendar_data["events"]) >= 1
    found = False
    for evt in calendar_data["events"]:
        if evt["id"] == context.event_id:
            found = True
            break
    assert found, "Created event not found in calendar"
    print("[PASS] Event visible in Calendar for Parent B.")

    # ==========================================
    # 4. B Checks-in
    # ==========================================
    # Check-in normally happens at the time of event. 
    # API allows check-in.
    check_in_data = {
        "event_id": context.event_id,
        "parent_role": "picking_up", # B is picking up? A was custodial.
        "check_in_method": "manual",
        "location_lat": 37.7749,
        "location_lng": -122.4194,
        "children_present": [context.child_id],
        "notes": "Arrived on time."
    }
    
    res = await test_client.post(
        "/api/v1/schedule/check-ins",
        json=check_in_data,
        headers=get_headers(context.parent_b_token)
    )
    assert res.status_code == 201, f"Check-in failed: {res.text}"
    print("[PASS] Check-in successful.")
    
    # Verify check-in listing
    res = await test_client.get(
        f"/api/v1/schedule/events/{context.event_id}/check-ins",
        headers=get_headers(context.parent_a_token)
    )
    assert res.status_code == 200
    check_ins = res.json()
    assert len(check_ins) == 1
    assert check_ins[0]["user_id"] == context.parent_b_id
    print("[PASS] Check-in verified by listing.")
