import pytest
import pytest_asyncio
from httpx import AsyncClient
import uuid

# Shared state for messaging flow
class MessagingFlowContext:
    parent_a_token: str = None
    parent_b_token: str = None
    parent_a_id: str = None
    parent_b_id: str = None
    case_id: str = None
    thread_id: str = None
    message_id: str = None
    
    # Generate unique emails
    run_id = str(uuid.uuid4())[:8]
    parent_a_email = f"msg_parent_a_{run_id}@example.com"
    parent_b_email = f"msg_parent_b_{run_id}@example.com"

context = MessagingFlowContext()

@pytest.mark.asyncio
async def test_messaging_flow_complete(test_client: AsyncClient):
    """
    End-to-End Messaging Verification Flow.
    
    Sequence:
    1. Setup: Register A & B, Create Case, B Joins.
    2. A creates a Thread.
    3. A sends a Message to B (ARIA analysis checked implicitly or explicitly).
    4. B lists messages and sees the new message.
    5. B replies to the message.
    """
    
    def get_headers(token):
        return {"Authorization": f"Bearer {token}"}

    # ==========================================
    # 1. Setup: Auth & Case
    # ==========================================
    # Register A
    res = await test_client.post("/api/v1/auth/register", json={
        "email": context.parent_a_email, "password": "Password123!",
        "first_name": "MsgParent", "last_name": "A", "phone": "+15550000001"
    })
    assert res.status_code == 201
    context.parent_a_token = res.json()["access_token"]
    context.parent_a_id = res.json()["user"]["id"]

    # Register B
    res = await test_client.post("/api/v1/auth/register", json={
        "email": context.parent_b_email, "password": "Password123!",
        "first_name": "MsgParent", "last_name": "B", "phone": "+15550000002"
    })
    assert res.status_code == 201
    context.parent_b_token = res.json()["access_token"]
    context.parent_b_id = res.json()["user"]["id"]

    # Valid Case Schema requires children and other_parent_email
    case_data = {
        "case_name": "Messaging Test Case",
        "state": "CA",
        "other_parent_email": context.parent_b_email,
        "children": [{"first_name": "Kid", "last_name": "Msg", "date_of_birth": "2015-01-01"}]
    }
    
    # A Creates Case
    res = await test_client.post("/api/v1/cases/", json=case_data, headers=get_headers(context.parent_a_token))
    assert res.status_code == 201
    context.case_id = res.json()["id"]
    invite_token = res.json()["invitation_token"]

    # B Joins Case
    res = await test_client.post(
        f"/api/v1/cases/{context.case_id}/accept",
        json={"invitation_token": invite_token},
        headers=get_headers(context.parent_b_token)
    )
    assert res.status_code == 200
    print("\n[PASS] Setup Complete: Case created and both parents joined.")

    # ==========================================
    # 2. A Analyzes Message (Preview ARIA)
    # ==========================================
    analyze_params = {
        "case_id": context.case_id,
        "content": "You are being difficult again.",
        "use_ai": False # Use regex for speed/mock
    }
    res = await test_client.post(
        "/api/v1/messages/analyze",
        params=analyze_params,
        headers=get_headers(context.parent_a_token)
    )
    assert res.status_code == 200
    analysis = res.json()
    assert "toxicity_score" in analysis
    print(f"[PASS] ARIA Analysis Ran: Score={analysis['toxicity_score']}")

    # ==========================================
    # 3. A Sends Message
    # ==========================================
    # Note: Threads might be optional or auto-created, but let's try sending without thread_id first 
    # or create one if there's an endpoint. 
    # Based on schemas, thread_id is optional in MessageCreate. Let's send a direct message.
    msg_data = {
        "case_id": context.case_id,
        "recipient_id": context.parent_b_id,
        "content": "Hey, can we swap weekends?",
        "message_type": "text"
    }
    res = await test_client.post(
        "/api/v1/messages/",
        json=msg_data,
        headers=get_headers(context.parent_a_token)
    )
    assert res.status_code == 201, f"Send message failed: {res.text}"
    context.message_id = res.json()["id"]
    print("[PASS] Message Sent by Parent A.")

    # ==========================================
    # 4. B Lists Messages
    # ==========================================
    res = await test_client.get(
        f"/api/v1/messages/case/{context.case_id}",
        headers=get_headers(context.parent_b_token)
    )
    assert res.status_code == 200
    messages = res.json()
    assert len(messages) >= 1
    recent_msg = messages[0]
    assert recent_msg["content"] == "Hey, can we swap weekends?"
    assert recent_msg["sender_id"] == context.parent_a_id
    print("[PASS] Parent B received the message.")

    # ==========================================
    # 5. Reply from B
    # ==========================================
    reply_data = {
        "case_id": context.case_id,
        "thread_id": context.thread_id,
        "recipient_id": context.parent_a_id,
        "content": "Sounds good, thanks.",
        "message_type": "text"
    }
    
    res = await test_client.post(
        "/api/v1/messages/",
        json=reply_data,
        headers=get_headers(context.parent_b_token)
    )
    assert res.status_code == 201
    print("[PASS] Reply sent successfully.")

    # ==========================================
    # 6. ARIA Intervention Flow
    # ==========================================
    # Send a toxic message from A
    toxic_data = {
        "case_id": context.case_id,
        "thread_id": context.thread_id,
        "recipient_id": context.parent_b_id,
        "content": "You are a stupid idiot.", # Triggers INSULT_PATTERNS
        "message_type": "text"
    }
    
    res = await test_client.post(
        "/api/v1/messages/",
        json=toxic_data,
        headers=get_headers(context.parent_a_token)
    )
    assert res.status_code == 201
    toxic_msg = res.json()
    assert toxic_msg["was_flagged"] == True, "Message should have been flagged by ARIA"
    toxic_msg_id = toxic_msg["id"]
    print("[PASS] Toxic message flagged successfully.")
    
    # Handle Intervention (Accept Suggestion)
    # The /intervention endpoint expects a structure for action.
    # Looking at schemas/message.py (implied): action="accepted"
    intervention_data = {
        "action": "accepted",
        "notes": "I will do better"
    }
    
    res = await test_client.post(
        f"/api/v1/messages/{toxic_msg_id}/intervention",
        json=intervention_data,
        headers=get_headers(context.parent_a_token)
    )
    assert res.status_code == 200
    updated_msg = res.json()
    assert updated_msg["content"] != "You are a stupid idiot."
    # ARIA replaces it with something polite or empty if removal. 
    # For "idiot", it replaces with "" (empty string) in SUGGESTIONS map?
    # NO, "stupid" -> "confusing". "idiot" -> "". 
    # "You are a stupid idiot" -> "You are a confusing ." possibly.
    # Or strict replacement.
    print(f"[PASS] Intervention handled. Content updated to: '{updated_msg['content']}'")
