"""
ARIA Messaging Integration Tests

Tests the complete messaging workflow with ARIA sentiment analysis:
- Message creation with toxicity detection
- Intervention workflow (accept/modify/reject/send_anyway)
- Analytics and good faith metrics
- All three analysis providers (regex, Claude, OpenAI)
"""

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime, timedelta

from app.models.message import Message, MessageFlag
from app.models.case import Case, CaseParticipant
from app.models.child import Child
from app.models.user import User
from app.services.aria import aria_service


# =============================================================================
# Fixtures
# =============================================================================

@pytest.fixture
async def test_case(db: AsyncSession):
    """Create a test case with two parents and a child."""
    # Create two users
    user1 = User(
        id="user1-test",
        supabase_id="supabase1-test",
        email="parent1@test.com",
        first_name="Parent",
        last_name="One",
        is_active=True
    )
    user2 = User(
        id="user2-test",
        supabase_id="supabase2-test",
        email="parent2@test.com",
        first_name="Parent",
        last_name="Two",
        is_active=True
    )

    db.add(user1)
    db.add(user2)

    # Create case
    case = Case(
        id="case-test",
        case_name="Test Case",
        state="CA",
        status="active"
    )
    db.add(case)

    # Add participants
    participant1 = CaseParticipant(
        case_id=case.id,
        user_id=user1.id,
        role="petitioner",
        parent_type="mother",
        is_active=True
    )
    participant2 = CaseParticipant(
        case_id=case.id,
        user_id=user2.id,
        role="respondent",
        parent_type="father",
        is_active=True
    )

    db.add(participant1)
    db.add(participant2)

    # Add child
    child = Child(
        id="child-test",
        case_id=case.id,
        first_name="Emma",
        last_name="Test",
        date_of_birth=datetime.now().date() - timedelta(days=365*5),  # 5 years old
        is_active=True
    )
    db.add(child)

    await db.commit()

    return {
        "case": case,
        "user1": user1,
        "user2": user2,
        "child": child
    }


# =============================================================================
# ARIA Analysis Tests (Preview Mode)
# =============================================================================

class TestARIAAnalysis:
    """Test ARIA message analysis in preview mode."""

    @pytest.mark.asyncio
    async def test_analyze_safe_message_regex(
        self,
        client: AsyncClient,
        test_case: dict,
        auth_headers_user1: dict
    ):
        """Test analyzing a safe message with regex."""
        response = await client.post(
            "/api/v1/messages/analyze",
            params={
                "case_id": test_case["case"].id,
                "content": "Can we discuss Emma's soccer schedule this week?",
                "use_ai": False,
                "ai_provider": "regex"
            },
            headers=auth_headers_user1
        )

        assert response.status_code == 200
        data = response.json()

        assert data["toxicity_level"] == "green"
        assert data["toxicity_score"] < 0.2
        assert data["is_flagged"] is False
        assert len(data["categories"]) == 0

    @pytest.mark.asyncio
    async def test_analyze_toxic_message_regex(
        self,
        client: AsyncClient,
        test_case: dict,
        auth_headers_user1: dict
    ):
        """Test analyzing a toxic message with regex."""
        response = await client.post(
            "/api/v1/messages/analyze",
            params={
                "case_id": test_case["case"].id,
                "content": "You NEVER do anything right! This is ALL YOUR FAULT!",
                "use_ai": False,
                "ai_provider": "regex"
            },
            headers=auth_headers_user1
        )

        assert response.status_code == 200
        data = response.json()

        assert data["toxicity_level"] in ["yellow", "orange", "red"]
        assert data["toxicity_score"] > 0.3
        assert data["is_flagged"] is True
        assert len(data["categories"]) > 0
        assert "all_caps" in data["categories"] or "blame" in data["categories"]

    @pytest.mark.asyncio
    @pytest.mark.skip(reason="Requires Anthropic API key")
    async def test_analyze_with_claude(
        self,
        client: AsyncClient,
        test_case: dict,
        auth_headers_user1: dict
    ):
        """Test analyzing message with Claude AI."""
        response = await client.post(
            "/api/v1/messages/analyze",
            params={
                "case_id": test_case["case"].id,
                "content": "I guess if you actually cared about Emma, you'd remember her appointments.",
                "use_ai": True,
                "ai_provider": "claude"
            },
            headers=auth_headers_user1
        )

        assert response.status_code == 200
        data = response.json()

        # Claude should detect passive-aggressive tone
        assert data["toxicity_score"] > 0.0
        assert data["is_flagged"] is True
        assert data["suggestion"] is not None
        assert len(data["suggestion"]) > 0

    @pytest.mark.asyncio
    @pytest.mark.skip(reason="Requires OpenAI API key")
    async def test_analyze_with_openai(
        self,
        client: AsyncClient,
        test_case: dict,
        auth_headers_user1: dict
    ):
        """Test analyzing message with OpenAI GPT-4."""
        response = await client.post(
            "/api/v1/messages/analyze",
            params={
                "case_id": test_case["case"].id,
                "content": "You're so pathetic. I can't believe I have to deal with you.",
                "use_ai": True,
                "ai_provider": "openai"
            },
            headers=auth_headers_user1
        )

        assert response.status_code == 200
        data = response.json()

        # OpenAI should detect hostility
        assert data["toxicity_score"] > 0.5
        assert data["toxicity_level"] in ["orange", "red"]
        assert data["is_flagged"] is True
        assert "hostility" in data["categories"] or "dismissive" in data["categories"]


# =============================================================================
# Message Sending Tests
# =============================================================================

class TestMessageSending:
    """Test sending messages with ARIA integration."""

    @pytest.mark.asyncio
    async def test_send_safe_message(
        self,
        client: AsyncClient,
        db: AsyncSession,
        test_case: dict,
        auth_headers_user1: dict
    ):
        """Test sending a safe message (no ARIA intervention)."""
        response = await client.post(
            "/api/v1/messages/",
            json={
                "case_id": test_case["case"].id,
                "recipient_id": test_case["user2"].id,
                "content": "Emma has a dentist appointment on Thursday at 3pm. Can you pick her up from school?",
                "message_type": "text"
            },
            headers=auth_headers_user1
        )

        assert response.status_code == 201
        data = response.json()

        assert data["content"] == "Emma has a dentist appointment on Thursday at 3pm. Can you pick her up from school?"
        assert data["was_flagged"] is False
        assert data["sender_id"] == test_case["user1"].id
        assert data["recipient_id"] == test_case["user2"].id

        # Verify message in database
        result = await db.execute(
            select(Message).where(Message.id == data["id"])
        )
        message = result.scalar_one()
        assert message.was_flagged is False

        # Verify no flag created
        flag_result = await db.execute(
            select(MessageFlag).where(MessageFlag.message_id == data["id"])
        )
        flag = flag_result.scalar_one_or_none()
        assert flag is None

    @pytest.mark.asyncio
    async def test_send_toxic_message_creates_flag(
        self,
        client: AsyncClient,
        db: AsyncSession,
        test_case: dict,
        auth_headers_user1: dict
    ):
        """Test that toxic messages create MessageFlag."""
        response = await client.post(
            "/api/v1/messages/",
            json={
                "case_id": test_case["case"].id,
                "recipient_id": test_case["user2"].id,
                "content": "You NEVER follow the schedule! I'm sick of your games!",
                "message_type": "text"
            },
            headers=auth_headers_user1
        )

        assert response.status_code == 201
        data = response.json()

        assert data["was_flagged"] is True

        # Verify flag created
        result = await db.execute(
            select(MessageFlag).where(MessageFlag.message_id == data["id"])
        )
        flag = result.scalar_one()

        assert flag.flagged_by == "aria_auto"
        assert flag.flag_type == "toxicity_detected"
        assert flag.toxicity_score > 0.3
        assert len(flag.toxicity_categories) > 0
        assert flag.suggested_rewrite is not None


# =============================================================================
# Intervention Workflow Tests
# =============================================================================

class TestInterventionWorkflow:
    """Test ARIA intervention response workflow."""

    @pytest.mark.asyncio
    async def test_accept_aria_suggestion(
        self,
        client: AsyncClient,
        db: AsyncSession,
        test_case: dict,
        auth_headers_user1: dict
    ):
        """Test accepting ARIA's suggested rewrite."""
        # First, send toxic message to get flag
        send_response = await client.post(
            "/api/v1/messages/",
            json={
                "case_id": test_case["case"].id,
                "recipient_id": test_case["user2"].id,
                "content": "You're so irresponsible!",
                "message_type": "text"
            },
            headers=auth_headers_user1
        )

        message_id = send_response.json()["id"]

        # Get the flag to see suggestion
        flag_result = await db.execute(
            select(MessageFlag).where(MessageFlag.message_id == message_id)
        )
        flag = flag_result.scalar_one()
        suggested_rewrite = flag.suggested_rewrite

        # Accept the suggestion
        intervention_response = await client.post(
            f"/api/v1/messages/{message_id}/intervention",
            json={
                "action": "accepted",
                "final_message": suggested_rewrite,
                "notes": "ARIA's suggestion is better"
            },
            headers=auth_headers_user1
        )

        assert intervention_response.status_code == 200
        data = intervention_response.json()

        # Message content should be updated to suggestion
        assert data["content"] == suggested_rewrite
        assert data["original_content"] == "You're so irresponsible!"

        # Verify flag updated
        await db.refresh(flag)
        assert flag.user_action == "accepted"

    @pytest.mark.asyncio
    async def test_modify_aria_suggestion(
        self,
        client: AsyncClient,
        db: AsyncSession,
        test_case: dict,
        auth_headers_user1: dict
    ):
        """Test modifying ARIA's suggestion."""
        # Send toxic message
        send_response = await client.post(
            "/api/v1/messages/",
            json={
                "case_id": test_case["case"].id,
                "recipient_id": test_case["user2"].id,
                "content": "Whatever, I don't care what you think.",
                "message_type": "text"
            },
            headers=auth_headers_user1
        )

        message_id = send_response.json()["id"]

        # Modify the suggestion
        modified_message = "I understand we have different perspectives. Can we discuss this?"

        intervention_response = await client.post(
            f"/api/v1/messages/{message_id}/intervention",
            json={
                "action": "modified",
                "final_message": modified_message,
                "notes": "Made my own version"
            },
            headers=auth_headers_user1
        )

        assert intervention_response.status_code == 200
        data = intervention_response.json()

        assert data["content"] == modified_message
        assert data["original_content"] == "Whatever, I don't care what you think."

        # Verify flag
        flag_result = await db.execute(
            select(MessageFlag).where(MessageFlag.message_id == message_id)
        )
        flag = flag_result.scalar_one()
        assert flag.user_action == "modified"

    @pytest.mark.asyncio
    async def test_reject_and_rewrite(
        self,
        client: AsyncClient,
        db: AsyncSession,
        test_case: dict,
        auth_headers_user1: dict
    ):
        """Test rejecting ARIA's suggestion and writing own."""
        # Send toxic message
        send_response = await client.post(
            "/api/v1/messages/",
            json={
                "case_id": test_case["case"].id,
                "recipient_id": test_case["user2"].id,
                "content": "You're terrible at this!",
                "message_type": "text"
            },
            headers=auth_headers_user1
        )

        message_id = send_response.json()["id"]

        # Reject and rewrite
        new_message = "I'd like to discuss how we can improve our communication."

        intervention_response = await client.post(
            f"/api/v1/messages/{message_id}/intervention",
            json={
                "action": "rejected",
                "final_message": new_message,
                "notes": "Wrote my own"
            },
            headers=auth_headers_user1
        )

        assert intervention_response.status_code == 200
        data = intervention_response.json()

        assert data["content"] == new_message
        assert data["original_content"] == "You're terrible at this!"

    @pytest.mark.asyncio
    async def test_send_anyway(
        self,
        client: AsyncClient,
        db: AsyncSession,
        test_case: dict,
        auth_headers_user1: dict
    ):
        """Test sending message anyway (ignoring ARIA)."""
        # Send toxic message
        send_response = await client.post(
            "/api/v1/messages/",
            json={
                "case_id": test_case["case"].id,
                "recipient_id": test_case["user2"].id,
                "content": "Fine, whatever you want.",
                "message_type": "text"
            },
            headers=auth_headers_user1
        )

        message_id = send_response.json()["id"]
        original_content = "Fine, whatever you want."

        # Send anyway
        intervention_response = await client.post(
            f"/api/v1/messages/{message_id}/intervention",
            json={
                "action": "sent_anyway",
                "final_message": original_content,
                "notes": "I want to send as-is"
            },
            headers=auth_headers_user1
        )

        assert intervention_response.status_code == 200
        data = intervention_response.json()

        # Content should remain unchanged
        assert data["content"] == original_content
        assert data["original_content"] is None  # Not modified

        # Verify flag
        flag_result = await db.execute(
            select(MessageFlag).where(MessageFlag.message_id == message_id)
        )
        flag = flag_result.scalar_one()
        assert flag.user_action == "sent_anyway"


# =============================================================================
# Analytics Tests
# =============================================================================

class TestARIAAnalytics:
    """Test good faith metrics and analytics."""

    @pytest.mark.asyncio
    async def test_get_user_analytics(
        self,
        client: AsyncClient,
        db: AsyncSession,
        test_case: dict,
        auth_headers_user1: dict
    ):
        """Test getting user communication metrics."""
        # Create some messages with flags
        # Message 1: Flagged, accepted suggestion
        msg1 = Message(
            id="msg1-test",
            case_id=test_case["case"].id,
            sender_id=test_case["user1"].id,
            recipient_id=test_case["user2"].id,
            content="Can we discuss this calmly?",
            message_type="text",
            sent_at=datetime.utcnow(),
            was_flagged=True,
            original_content="You're wrong!"
        )
        flag1 = MessageFlag(
            id="flag1-test",
            message_id=msg1.id,
            flagged_by="aria_auto",
            flag_type="toxicity_detected",
            toxicity_score=0.4,
            toxicity_categories=["hostility"],
            user_action="accepted"
        )

        # Message 2: Flagged, sent anyway
        msg2 = Message(
            id="msg2-test",
            case_id=test_case["case"].id,
            sender_id=test_case["user1"].id,
            recipient_id=test_case["user2"].id,
            content="Whatever.",
            message_type="text",
            sent_at=datetime.utcnow(),
            was_flagged=True
        )
        flag2 = MessageFlag(
            id="flag2-test",
            message_id=msg2.id,
            flagged_by="aria_auto",
            flag_type="toxicity_detected",
            toxicity_score=0.35,
            toxicity_categories=["dismissive"],
            user_action="sent_anyway"
        )

        # Message 3: Not flagged
        msg3 = Message(
            id="msg3-test",
            case_id=test_case["case"].id,
            sender_id=test_case["user1"].id,
            recipient_id=test_case["user2"].id,
            content="Thanks for picking up Emma today.",
            message_type="text",
            sent_at=datetime.utcnow(),
            was_flagged=False
        )

        db.add(msg1)
        db.add(msg2)
        db.add(msg3)
        db.add(flag1)
        db.add(flag2)
        await db.commit()

        # Get analytics
        response = await client.get(
            f"/api/v1/messages/analytics/{test_case['case'].id}/user",
            headers=auth_headers_user1
        )

        assert response.status_code == 200
        data = response.json()

        assert data["total_messages"] == 3
        assert data["flagged_messages"] == 2
        assert data["flag_rate"] == pytest.approx(66.67, rel=0.1)
        assert data["suggestion_acceptance_rate"] == pytest.approx(50.0, rel=0.1)
        assert data["compliance_score"] in ["good", "fair", "needs_improvement"]

    @pytest.mark.asyncio
    async def test_get_conversation_health(
        self,
        client: AsyncClient,
        db: AsyncSession,
        test_case: dict,
        auth_headers_user1: dict
    ):
        """Test getting overall conversation health."""
        # Create messages from both parents
        msg1 = Message(
            id="msg1-health",
            case_id=test_case["case"].id,
            sender_id=test_case["user1"].id,
            recipient_id=test_case["user2"].id,
            content="Safe message",
            message_type="text",
            sent_at=datetime.utcnow(),
            was_flagged=False
        )

        msg2 = Message(
            id="msg2-health",
            case_id=test_case["case"].id,
            sender_id=test_case["user2"].id,
            recipient_id=test_case["user1"].id,
            content="Another safe message",
            message_type="text",
            sent_at=datetime.utcnow(),
            was_flagged=False
        )

        db.add(msg1)
        db.add(msg2)
        await db.commit()

        # Get conversation health
        response = await client.get(
            f"/api/v1/messages/analytics/{test_case['case'].id}/conversation",
            headers=auth_headers_user1
        )

        assert response.status_code == 200
        data = response.json()

        assert "total_messages" in data
        assert "overall_toxicity" in data
        assert "trend" in data


# =============================================================================
# Access Control Tests
# =============================================================================

class TestAccessControl:
    """Test message access control."""

    @pytest.mark.asyncio
    async def test_cannot_send_to_non_participant(
        self,
        client: AsyncClient,
        db: AsyncSession,
        test_case: dict,
        auth_headers_user1: dict
    ):
        """Test that users can't send messages to non-participants."""
        # Create a third user not in the case
        user3 = User(
            id="user3-test",
            supabase_id="supabase3-test",
            email="outsider@test.com",
            first_name="Outside",
            last_name="User",
            is_active=True
        )
        db.add(user3)
        await db.commit()

        # Try to send message to user3
        response = await client.post(
            "/api/v1/messages/",
            json={
                "case_id": test_case["case"].id,
                "recipient_id": user3.id,
                "content": "Hello",
                "message_type": "text"
            },
            headers=auth_headers_user1
        )

        assert response.status_code == 400
        assert "not a participant" in response.json()["detail"]

    @pytest.mark.asyncio
    async def test_cannot_access_other_case_messages(
        self,
        client: AsyncClient,
        db: AsyncSession,
        test_case: dict,
        auth_headers_user1: dict
    ):
        """Test that users can't access messages from cases they're not in."""
        # Create another case
        other_case = Case(
            id="other-case",
            case_name="Other Case",
            state="CA",
            status="active"
        )
        db.add(other_case)
        await db.commit()

        # Try to analyze message for other case
        response = await client.post(
            "/api/v1/messages/analyze",
            params={
                "case_id": other_case.id,
                "content": "Test message",
                "use_ai": False
            },
            headers=auth_headers_user1
        )

        assert response.status_code == 403
        assert "access" in response.json()["detail"].lower()


# =============================================================================
# Unit Tests for ARIA Service
# =============================================================================

class TestARIAService:
    """Test ARIA service functions directly."""

    def test_regex_analysis_safe_message(self):
        """Test regex analysis on safe message."""
        result = aria_service.analyze_message(
            "Can we discuss Emma's schedule this week?"
        )

        assert result.toxicity_score < 0.2
        assert result.is_flagged is False
        assert len(result.categories) == 0

    def test_regex_analysis_hostile_message(self):
        """Test regex analysis on hostile message."""
        result = aria_service.analyze_message(
            "You're a terrible parent and you know it!"
        )

        assert result.toxicity_score > 0.3
        assert result.is_flagged is True
        assert any(cat.value == "hostility" for cat in result.categories)

    def test_regex_analysis_all_caps(self):
        """Test detection of all caps."""
        result = aria_service.analyze_message(
            "WHY DON'T YOU EVER LISTEN TO ME?!"
        )

        assert result.toxicity_score > 0.2
        assert any(cat.value == "all_caps" for cat in result.categories)

    def test_regex_analysis_passive_aggressive(self):
        """Test detection of passive-aggressive language."""
        result = aria_service.analyze_message(
            "I guess if you actually cared about the kids..."
        )

        assert result.toxicity_score > 0.2
        assert any(cat.value == "passive_aggressive" for cat in result.categories)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
