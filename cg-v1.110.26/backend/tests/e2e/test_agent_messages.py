"""
E2E Test Agent: Messages & ARIA System

Tests messaging functionality including:
- Message sending between co-parents
- ARIA analysis and toxicity scoring
- Message rewrite suggestions
- Intervention logging
- Toxicity blocking for severe messages
"""

import pytest
import sys
import os
from datetime import datetime

sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from fastapi.testclient import TestClient
from app.main import app
from app.core.database import SessionLocal

client = TestClient(app)


class MessageTestAgent:
    """Test agent simulating co-parent messaging persona"""
    
    def __init__(self, email: str, password: str, name: str):
        self.email = email
        self.password = password
        self.name = name
        self.token = None
        self.user_id = None
        self.family_file_id = None
    
    def login(self):
        """Authenticate and get access token"""
        response = client.post("/api/v1/auth/login", json={
            "email": self.email,
            "password": self.password
        })
        assert response.status_code == 200, f"Login failed for {self.name}: {response.json()}"
        data = response.json()
        self.token = data["access_token"]
        self.user_id = data["user"]["id"]
        print(f"   ✅ {self.name} logged in successfully")
        return self.token
    
    def get_headers(self):
        """Get authorization headers"""
        return {"Authorization": f"Bearer {self.token}"}
    
    def get_family_file(self):
        """Get user's family file"""
        response = client.get("/api/v1/family-files/", headers=self.get_headers())
        assert response.status_code == 200
        files = response.json()
        assert len(files) > 0, f"No family files found for {self.name}"
        self.family_file_id = files[0]["id"]
        return self.family_file_id
    
    def send_message(self, recipient_id: str, content: str, expect_aria: bool = False):
        """
        Send a message to co-parent
        
        Args:
            recipient_id: Recipient user ID
            content: Message content
            expect_aria: Whether ARIA should flag this message
        """
        # First, analyze message with ARIA
        aria_response = client.post(
            "/api/v1/messages/analyze",
            headers=self.get_headers(),
            json={"content": content}
        )
        
        assert aria_response.status_code == 200, f"ARIA analysis failed: {aria_response.json()}"
        aria_data = aria_response.json()
        
        print(f"   📊 ARIA Analysis for {self.name}:")
        print(f"      Toxicity: {aria_data.get('toxicity_level', 'unknown')}")
        print(f"      Score: {aria_data.get('toxicity_score', 0.0):.2f}")
        print(f"      Flagged: {aria_data.get('flagged', False)}")
        
        if expect_aria:
            assert aria_data["flagged"] == True, "Expected ARIA to flag message"
            assert "rewrite" in aria_data, "Expected ARIA to provide rewrite"
            rewritten_content = aria_data["rewrite"]
            print(f"      ✏️  Rewrite suggested: {rewritten_content[:60]}...")
        else:
            assert aria_data["flagged"] == False, "Did not expect ARIA to flag message"
            rewritten_content = content
        
        # Send the message (using rewrite if flagged)
        message_response = client.post(
            "/api/v1/messages/",
            headers=self.get_headers(),
            json={
                "family_file_id": self.family_file_id,
                "recipient_id": recipient_id,
                "subject": "Test Message",
                "content": rewritten_content,
                "original_content": content if expect_aria else None,
                "toxicity_score": aria_data.get("toxicity_score", 0.0),
                "aria_flagged": aria_data.get("flagged", False)
            }
        )
        
        assert message_response.status_code == 201, f"Message send failed: {message_response.json()}"
        message_data = message_response.json()
        print(f"   ✅ {self.name} sent message (ID: {message_data['id']})")
        
        return message_data
    
    def get_messages(self):
        """Get all messages for this user"""
        response = client.get(
            f"/api/v1/messages/?family_file_id={self.family_file_id}",
            headers=self.get_headers()
        )
        assert response.status_code == 200
        messages = response.json()
        return messages
    
    def verify_message_received(self, sender_name: str, expected_content_snippet: str):
        """Verify a message was received"""
        messages = self.get_messages()
        found = False
        for msg in messages:
            if expected_content_snippet.lower() in msg["content"].lower():
                found = True
                print(f"   ✅ {self.name} received message from {sender_name}")
                break
        
        assert found, f"{self.name} did not receive expected message from {sender_name}"
        return True


def test_high_conflict_messaging():
    """Test messaging between high-conflict co-parents (Sarah & Michael)"""
    print("\n" + "="*60)
    print("TEST: High-Conflict Messaging (Sarah & Michael)")
    print("="*60)
    
    # Initialize agents
    sarah = MessageTestAgent("e2e_test_sarah@commonground.test", "TestPass123!", "Sarah")
    michael = MessageTestAgent("e2e_test_michael@commonground.test", "TestPass123!", "Michael")
    
    # Login both
    sarah.login()
    michael.login()
    
    # Get family files
    sarah.get_family_file()
    michael.get_family_file()
    
    # Test 1: Sarah sends hostile message (should be flagged)
    print("\n📤 Test 1: Sarah sends hostile message about late pickup")
    hostile_message = "I can't believe you were late AGAIN. You clearly don't care about our kids' schedule. This is unacceptable!"
    sarah.send_message(
        recipient_id=michael.user_id,
        content=hostile_message,
        expect_aria=True
    )
    
    # Test 2: Michael receives rewritten message
    print("\n📥 Test 2: Michael receives rewritten professional message")
    michael.verify_message_received("Sarah", "pickup was delayed")
    
    # Test 3: Michael sends defensive message (should be flagged)
    print("\n📤 Test 3: Michael sends defensive response")
    defensive_message = "Stop micromanaging everything! I'm their father too. You always think you know better."
    michael.send_message(
        recipient_id=sarah.user_id,
        content=defensive_message,
        expect_aria=True
    )
    
    # Test 4: Sarah receives rewritten message
    print("\n📥 Test 4: Sarah receives constructive response")
    sarah.verify_message_received("Michael", "discuss parenting decisions")
    
    print("\n✅ High-conflict messaging tests PASSED")


def test_low_conflict_messaging():
    """Test messaging between low-conflict co-parents (Jessica & David)"""
    print("\n" + "="*60)
    print("TEST: Low-Conflict Messaging (Jessica & David)")
    print("="*60)
    
    # Initialize agents
    jessica = MessageTestAgent("e2e_test_jessica@commonground.test", "TestPass123!", "Jessica")
    david = MessageTestAgent("e2e_test_david@commonground.test", "TestPass123!", "David")
    
    # Login both
    jessica.login()
    david.login()
    
    # Get family files
    jessica.get_family_file()
    david.get_family_file()
    
    # Test 1: Jessica sends professional update (should NOT be flagged)
    print("\n📤 Test 1: Jessica sends professional update")
    professional_message = "Lily did great on her spelling test today! She got 100%. Just wanted to share the good news."
    jessica.send_message(
        recipient_id=david.user_id,
        content=professional_message,
        expect_aria=False
    )
    
    # Test 2: David receives original message (no rewrite)
    print("\n📥 Test 2: David receives original message")
    david.verify_message_received("Jessica", "spelling test")
    
    # Test 3: David sends appreciative response (should NOT be flagged)
    print("\n📤 Test 3: David sends appreciative response")
    response_message = "That's wonderful! Thanks for letting me know. I'll celebrate with her this weekend."
    david.send_message(
        recipient_id=jessica.user_id,
        content=response_message,
        expect_aria=False
    )
    
    # Test 4: Jessica receives original response
    print("\n📥 Test 4: Jessica receives positive response")
    jessica.verify_message_received("David", "celebrate")
    
    print("\n✅ Low-conflict messaging tests PASSED")


def test_aria_toxicity_levels():
    """Test ARIA toxicity scoring across different levels"""
    print("\n" + "="*60)
    print("TEST: ARIA Toxicity Level Detection")
    print("="*60)
    
    sarah = MessageTestAgent("e2e_test_sarah@commonground.test", "TestPass123!", "Sarah")
    sarah.login()
    sarah.get_family_file()
    
    michaels_id = MessageTestAgent("e2e_test_michael@commonground.test", "TestPass123!", "Michael")
    michaels_id.login()
    
    test_messages = [
        ("none", "Quick reminder: pickup is at 6 PM tomorrow.", 0.0, 0.2),
        ("low", "I'm a bit concerned about the schedule changes.", 0.2, 0.4),
        ("medium", "This is really frustrating. You never follow the schedule.", 0.4, 0.7),
        ("high", "I'm sick of your excuses. This is unacceptable!", 0.7, 0.9),
        ("severe", "You're a terrible parent and the kids know it!", 0.9, 1.0),
    ]
    
    for level, content, min_score, max_score in test_messages:
        print(f"\n🧪 Testing {level.upper()} toxicity: '{content[:50]}...'")
        
        response = client.post(
            "/api/v1/messages/analyze",
            headers=sarah.get_headers(),
            json={"content": content}
        )
        
        assert response.status_code == 200
        data = response.json()
        score = data.get("toxicity_score", 0.0)
        
        print(f"   Score: {score:.2f} (expected {min_score:.2f}-{max_score:.2f})")
        assert min_score <= score <= max_score, f"Toxicity score {score} not in expected range"
        
        if level in ["high", "severe"]:
            assert data["flagged"] == True, f"Expected {level} message to be flagged"
            assert "rewrite" in data, f"Expected rewrite for {level} message"
        
    print("\n✅ ARIA toxicity level tests PASSED")


def test_aria_blocks_severe_toxicity():
    """Test that ARIA blocks extremely toxic messages"""
    print("\n" + "="*60)
    print("TEST: ARIA Blocks Severe Toxicity")
    print("="*60)
    
    sarah = MessageTestAgent("e2e_test_sarah@commonground.test", "TestPass123!", "Sarah")
    sarah.login()
    sarah.get_family_file()
    
    michael = MessageTestAgent("e2e_test_michael@commonground.test", "TestPass123!", "Michael")
    michael.login()
    
    # Attempt to send severely toxic message
    extremely_toxic = "You're worthless and the kids deserve better. I hate you and I hope you suffer."
    
    aria_response = client.post(
        "/api/v1/messages/analyze",
        headers=sarah.get_headers(),
        json={"content": extremely_toxic}
    )
    
    assert aria_response.status_code == 200
    data = aria_response.json()
    
    print(f"   Toxicity Score: {data.get('toxicity_score', 0.0):.2f}")
    assert data["toxicity_score"] > 0.85, "Expected very high toxicity score"
    assert data["flagged"] == True, "Expected message to be flagged"
    assert data.get("block_send", False) == True, "Expected message to be blocked"
    
    print("   ✅ Severely toxic message correctly blocked")
    print("\n✅ Severe toxicity blocking test PASSED")


if __name__ == "__main__":
    """Run all message tests"""
    print("\n" + "="*60)
    print("COMMONGROUND E2E TEST SUITE: MESSAGES & ARIA")
    print("="*60)
    
    try:
        test_high_conflict_messaging()
        test_low_conflict_messaging()
        test_aria_toxicity_levels()
        test_aria_blocks_severe_toxicity()
        
        print("\n" + "="*60)
        print("✅ ALL MESSAGE TESTS PASSED")
        print("="*60)
    except AssertionError as e:
        print(f"\n❌ TEST FAILED: {str(e)}")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ ERROR: {str(e)}")
        sys.exit(1)
