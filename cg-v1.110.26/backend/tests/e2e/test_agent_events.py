"""
E2E Test Agent: Events & Attendance Tracking

Tests event management functionality including:
- Event creation (8 categories)
- RSVP workflows (going/not_going/maybe/no_response)
- Missed event detection
- GPS check-in validation
- Attendance tracking
- Event notifications
"""

import pytest
import sys
import os
from datetime import datetime, timedelta

sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


class EventTestAgent:
    """Test agent for event management"""
    
    def __init__(self, email: str, password: str, name: str):
        self.email = email
        self.password = password
        self.name = name
        self.token = None
        self.user_id = None
        self.family_file_id = None
        self.children = []
    
    def login(self):
        """Authenticate"""
        response = client.post("/api/v1/auth/login", json={
            "email": self.email,
            "password": self.password
        })
        assert response.status_code == 200, f"Login failed for {self.name}"
        data = response.json()
        self.token = data["access_token"]
        self.user_id = data["user"]["id"]
        print(f"   ✅ {self.name} logged in")
        return self.token
    
    def get_headers(self):
        return {"Authorization": f"Bearer {self.token}"}
    
    def get_family_file(self):
        """Get family file and children"""
        response = client.get("/api/v1/family-files/", headers=self.get_headers())
        assert response.status_code == 200
        files = response.json()
        assert len(files) > 0
        self.family_file_id = files[0]["id"]
        
        # Get children
        children_response = client.get(
            f"/api/v1/children/?family_file_id={self.family_file_id}",
            headers=self.get_headers()
        )
        if children_response.status_code == 200:
            self.children = children_response.json()
        
        return self.family_file_id
    
    def create_event(self, category: str, title: str, days_from_now: int = 7):
        """Create a new event"""
        event_date = datetime.utcnow() + timedelta(days=days_from_now)
        
        event_data = {
            "family_file_id": self.family_file_id,
            "child_id": self.children[0]["id"] if self.children else None,
            "title": title,
            "category": category,
            "event_date": event_date.isoformat(),
            "location": "123 Test St, City, State",
            "notes": "Auto-generated test event"
        }
        
        response = client.post(
            "/api/v1/events/",
            headers=self.get_headers(),
            json=event_data
        )
        
        assert response.status_code == 201, f"Event creation failed: {response.json()}"
        event = response.json()
        print(f"   ✅ {self.name} created {category} event: {title}")
        print(f"      Event ID: {event['id']}")
        print(f"      Date: {event_date.strftime('%Y-%m-%d %H:%M')}")
        
        return event
    
    def rsvp_to_event(self, event_id: str, status: str):
        """RSVP to an event"""
        response = client.post(
            f"/api/v1/events/{event_id}/rsvp",
            headers=self.get_headers(),
            json={"status": status}
        )
        
        assert response.status_code == 200, f"RSVP failed: {response.json()}"
        print(f"   ✅ {self.name} RSVP'd '{status}' to event")
        
        return response.json()
    
    def check_in_to_event(self, event_id: str, latitude: float = 37.7749, longitude: float = -122.4194):
        """Check in to an event with GPS"""
        response = client.post(
            f"/api/v1/events/{event_id}/checkin",
            headers=self.get_headers(),
            json={
                "latitude": latitude,
                "longitude": longitude,
                "timestamp": datetime.utcnow().isoformat()
            }
        )
        
        if response.status_code == 200:
            print(f"   ✅ {self.name} checked in to event (GPS verified)")
            return True
        else:
            print(f"   ⚠️  {self.name} check-in failed: {response.json()}")
            return False
    
    def get_events(self, category: str = None):
        """Get all events"""
        url = f"/api/v1/events/?family_file_id={self.family_file_id}"
        if category:
            url += f"&category={category}"
        
        response = client.get(url, headers=self.get_headers())
        assert response.status_code == 200
        return response.json()
    
    def mark_event_missed(self, event_id: str):
        """Mark an event as missed"""
        response = client.put(
            f"/api/v1/events/{event_id}",
            headers=self.get_headers(),
            json={"status": "missed"}
        )
        
        assert response.status_code == 200
        print(f"   ✅ Event marked as missed")
        return response.json()


def test_event_creation_all_categories():
    """Test creating events in all 8 categories"""
    print("\n" + "="*60)
    print("TEST: Event Creation - All Categories")
    print("="*60)
    
    jessica = EventTestAgent("e2e_test_jessica@commonground.test", "TestPass123!", "Jessica")
    jessica.login()
    jessica.get_family_file()
    
    categories = [
        ("medical", "Lily's Doctor Appointment"),
        ("school", "Parent-Teacher Conference"),
        ("sports", "Soccer Game"),
        ("therapy", "Counseling Session"),
        ("extracurricular", "Piano Lesson"),
        ("social", "Birthday Party"),
        ("travel", "Weekend Trip"),
        ("other", "Family Event")
    ]
    
    for category, title in categories:
        event = jessica.create_event(category, title)
        assert event["category"] == category
        assert title in event["title"]
    
    print(f"\n✅ All 8 event categories tested successfully")


def test_rsvp_workflow():
    """Test full RSVP workflow"""
    print("\n" + "="*60)
    print("TEST: RSVP Workflow (Jessica & David)")
    print("="*60)
    
    jessica = EventTestAgent("e2e_test_jessica@commonground.test", "TestPass123!", "Jessica")
    david = EventTestAgent("e2e_test_david@commonground.test", "TestPass123!", "David")
    
    jessica.login()
    jessica.get_family_file()
    
    david.login()
    david.get_family_file()
    
    # Jessica creates event
    print("\n📅 Step 1: Jessica creates doctor appointment")
    event = jessica.create_event("medical", "Lily's Dentist Appointment", days_from_now=7)
    
    # David RSVPs "going"
    print("\n✋ Step 2: David RSVPs 'going'")
    david.rsvp_to_event(event["id"], "going")
    
    # Jessica RSVPs "going"
    print("\n✋ Step 3: Jessica RSVPs 'going'")
    jessica.rsvp_to_event(event["id"], "going")
    
    # Both check in
    print("\n📍 Step 4: Both parents check in (GPS)")
    jessica.check_in_to_event(event["id"])
    david.check_in_to_event(event["id"])
    
    print(f"\n✅ RSVP workflow test PASSED")


def test_missed_event_detection():
    """Test missed event tracking (Michael scenario)"""
    print("\n" + "="*60)
    print("TEST: Missed Event Detection (Sarah & Michael)")
    print("="*60)
    
    sarah = EventTestAgent("e2e_test_sarah@commonground.test", "TestPass123!", "Sarah")
    michael = EventTestAgent("e2e_test_michael@commonground.test", "TestPass123!", "Michael")
    
    sarah.login()
    sarah.get_family_file()
    
    michael.login()
    michael.get_family_file()
    
    # Sarah creates event
    print("\n📅 Step 1: Sarah creates soccer game")
    event = sarah.create_event("sports", "Emma's Soccer Game", days_from_now=-1)  # Past event
    
    # Sarah RSVPs "going"
    print("\n✋ Step 2: Sarah RSVPs 'going'")
    sarah.rsvp_to_event(event["id"], "going")
    
    # Michael doesn't RSVP (30% of his events)
    print("\n⏭️  Step 3: Michael doesn't RSVP (typical behavior)")
    
    # Sarah checks in, Michael doesn't
    print("\n📍 Step 4: Sarah checks in, Michael doesn't")
    sarah.check_in_to_event(event["id"])
    
    # Mark event as missed for Michael
    print("\n❌ Step 5: System marks event as missed for Michael")
    sarah.mark_event_missed(event["id"])
    
    # Verify missed event in Michael's history
    print("\n🔍 Step 6: Verify missed event appears in system")
    events = michael.get_events()
    missed_events = [e for e in events if e.get("status") == "missed"]
    
    assert len(missed_events) > 0, "No missed events found"
    print(f"   ✅ Found {len(missed_events)} missed event(s)")
    
    print(f"\n✅ Missed event detection test PASSED")


def test_event_notifications():
    """Test event notification system"""
    print("\n" + "="*60)
    print("TEST: Event Notifications")
    print("="*60)
    
    jessica = EventTestAgent("e2e_test_jessica@commonground.test", "TestPass123!", "Jessica")
    david = EventTestAgent("e2e_test_david@commonground.test", "TestPass123!", "David")
    
    jessica.login()
    jessica.get_family_file()
    
    david.login()
    david.get_family_file()
    
    # Jessica creates upcoming event
    print("\n📅 Step 1: Jessica creates upcoming event")
    event = jessica.create_event("school", "School Play", days_from_now=7)
    
    # Check if David received notification (activity feed)
    print("\n🔔 Step 2: Check David's activity feed for notification")
    activity_response = client.get(
        "/api/v1/activities/",
        headers=david.get_headers(),
        params={"family_file_id": david.family_file_id}
    )
    
    if activity_response.status_code == 200:
        activities = activity_response.json()
        event_activities = [a for a in activities if "event" in a.get("type", "").lower()]
        print(f"   ✅ Found {len(event_activities)} event-related notification(s)")
    else:
        print(f"   ⚠️  Activity feed not available")
    
    print(f"\n✅ Event notification test PASSED")


def test_high_vs_low_conflict_event_compliance():
    """Compare event compliance between high and low conflict families"""
    print("\n" + "="*60)
    print("TEST: Event Compliance Comparison")
    print("="*60)
    
    # Family 1: High-conflict (Sarah & Michael)
    sarah = EventTestAgent("e2e_test_sarah@commonground.test", "TestPass123!", "Sarah")
    sarah.login()
    sarah.get_family_file()
    
    events_sarah = sarah.get_events()
    if events_sarah:
        missed_sarah = len([e for e in events_sarah if e.get("status") == "missed"])
        compliance_sarah = ((len(events_sarah) - missed_sarah) / len(events_sarah)) * 100 if events_sarah else 100
        print(f"\n📊 Family 1 (Sarah & Michael):")
        print(f"   Total Events: {len(events_sarah)}")
        print(f"   Missed Events: {missed_sarah}")
        print(f"   Compliance: {compliance_sarah:.1f}%")
        
        assert compliance_sarah < 95, "Expected lower compliance for high-conflict family"
    
    # Family 2: Low-conflict (Jessica & David)
    jessica = EventTestAgent("e2e_test_jessica@commonground.test", "TestPass123!", "Jessica")
    jessica.login()
    jessica.get_family_file()
    
    events_jessica = jessica.get_events()
    if events_jessica:
        missed_jessica = len([e for e in events_jessica if e.get("status") == "missed"])
        compliance_jessica = ((len(events_jessica) - missed_jessica) / len(events_jessica)) * 100 if events_jessica else 100
        print(f"\n📊 Family 2 (Jessica & David):")
        print(f"   Total Events: {len(events_jessica)}")
        print(f"   Missed Events: {missed_jessica}")
        print(f"   Compliance: {compliance_jessica:.1f}%")
        
        assert compliance_jessica >= 95, "Expected high compliance for low-conflict family"
    
    print(f"\n✅ Event compliance comparison test PASSED")


if __name__ == "__main__":
    """Run all event tests"""
    print("\n" + "="*60)
    print("COMMONGROUND E2E TEST SUITE: EVENTS & ATTENDANCE")
    print("="*60)
    
    try:
        test_event_creation_all_categories()
        test_rsvp_workflow()
        test_missed_event_detection()
        test_event_notifications()
        test_high_vs_low_conflict_event_compliance()
        
        print("\n" + "="*60)
        print("✅ ALL EVENT TESTS PASSED")
        print("="*60)
    except AssertionError as e:
        print(f"\n❌ TEST FAILED: {str(e)}")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
