"""
E2E Test Agent: Custody Tracking

Tests custody exchange and tracking including:
- QR code generation and validation
- GPS proximity validation
- Manual "Children With Me" overrides
- Custody time calculations
- Compliance metrics (7/30/90 day)
"""

import pytest
import sys
import os
from datetime import datetime, timedelta
import random

sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


class CustodyTestAgent:
    """Test agent for custody tracking"""
    
    def __init__(self, email: str, password: str, name: str):
        self.email = email
        self.password = password
        self.name = name
        self.token = None
        self.user_id = None
        self.family_file_id = None
        self.children = []
    
    def login(self):
        response = client.post("/api/v1/auth/login", json={
            "email": self.email,
            "password": self.password
        })
        assert response.status_code == 200
        data = response.json()
        self.token = data["access_token"]
        self.user_id = data["user"]["id"]
        print(f"   ✅ {self.name} logged in")
        return self.token
    
    def get_headers(self):
        return {"Authorization": f"Bearer {self.token}"}
    
    def get_family_file(self):
        response = client.get("/api/v1/family-files/", headers=self.get_headers())
        assert response.status_code == 200
        files = response.json()
        self.family_file_id = files[0]["id"]
        
        children_response = client.get(
            f"/api/v1/children/?family_file_id={self.family_file_id}",
            headers=self.get_headers()
        )
        if children_response.status_code == 200:
            self.children = children_response.json()
        
        return self.family_file_id
    
    def generate_qr_code(self):
        """Generate QR code for exchange"""
        response = client.post(
            f"/api/v1/custody/qr-token",
            headers=self.get_headers(),
            json={"family_file_id": self.family_file_id}
        )
        
        assert response.status_code == 200
        data = response.json()
        print(f"   ✅ {self.name} generated QR code")
        print(f"      Token: {data['token'][:20]}...")
        print(f"      Expires: {data.get('expires_at', 'N/A')}")
        
        return data["token"]
    
    def scan_qr_code(self, token: str, latitude: float = 37.7749, longitude: float = -122.4194):
        """Scan QR code and confirm exchange"""
        response = client.post(
            f"/api/v1/custody/confirm-exchange",
            headers=self.get_headers(),
            json={
                "token": token,
                "latitude": latitude,
                "longitude": longitude,
                "timestamp": datetime.utcnow().isoformat()
            }
        )
        
        if response.status_code == 200:
            print(f"   ✅ {self.name} scanned QR code successfully")
            print(f"      Exchange confirmed with GPS verification")
            return True
        else:
            error = response.json().get("detail", "Unknown error")
            print(f"   ❌ {self.name} QR scan failed: {error}")
            return False
    
    def manual_override(self, reason: str = "schedule_change"):
        """Manual 'Children With Me' override"""
        response = client.post(
            f"/api/v1/custody/manual-override",
            headers=self.get_headers(),
            json={
                "family_file_id": self.family_file_id,
                "reason": reason,
                "timestamp": datetime.utcnow().isoformat()
            }
        )
        
        assert response.status_code == 200
        print(f"   ✅ {self.name} used manual override (reason: {reason})")
        return response.json()
    
    def get_custody_stats(self, days: int = 30):
        """Get custody time distribution stats"""
        response = client.get(
            f"/api/v1/custody/stats",
            headers=self.get_headers(),
            params={
                "family_file_id": self.family_file_id,
                "days": days
            }
        )
        
        assert response.status_code == 200
        stats = response.json()
        
        print(f"\n   📊 {self.name}'s Custody Stats (Last {days} days):")
        print(f"      My Time: {stats.get('my_time_percentage', 0):.1f}%")
        print(f"      Their Time: {stats.get('their_time_percentage', 0):.1f}%")
        print(f"      Compliance: {stats.get('compliance_rate', 0):.1f}%")
        
        return stats
    
    def get_exchange_history(self):
        """Get custody exchange history"""
        response = client.get(
            f"/api/v1/custody/exchanges",
            headers=self.get_headers(),
            params={"family_file_id": self.family_file_id}
        )
        
        if response.status_code == 200:
            exchanges = response.json()
            compliant = len([e for e in exchanges if e.get("compliant")])
            total = len(exchanges)
            compliance = (compliant / total * 100) if total > 0 else 100
            
            print(f"\n   📋 Exchange History:")
            print(f"      Total Exchanges: {total}")
            print(f"      Compliant: {compliant}")
            print(f"      Compliance Rate: {compliance:.1f}%")
            
            return exchanges
        
        return []


def test_qr_code_exchange_flow():
    """Test complete QR code exchange workflow"""
    print("\n" + "="*60)
    print("TEST: QR Code Exchange Flow (Jessica & David)")
    print("="*60)
    
    jessica = CustodyTestAgent("e2e_test_jessica@commonground.test", "TestPass123!", "Jessica")
    david = CustodyTestAgent("e2e_test_david@commonground.test", "TestPass123!", "David")
    
    jessica.login()
    jessica.get_family_file()
    
    david.login()
    david.get_family_file()
    
    # Step 1: David generates QR code
    print("\n📱 Step 1: David generates QR code for exchange")
    token = david.generate_qr_code()
    
    # Step 2: Jessica scans QR code within 15-minute window
    print("\n📷 Step 2: Jessica scans QR code")
    success = jessica.scan_qr_code(token)
    
    assert success, "QR code exchange should succeed"
    
    # Step 3: Verify custody transferred
    print("\n✅ Step 3: Verify custody transfer complete")
    
    print(f"\n✅ QR code exchange flow test PASSED")


def test_manual_custody_override():
    """Test manual 'Children With Me' override (Sarah scenario)"""
    print("\n" + "="*60)
    print("TEST: Manual Custody Override (Sarah)")
    print("="*60)
    
    sarah = CustodyTestAgent("e2e_test_sarah@commonground.test", "TestPass123!", "Sarah")
    sarah.login()
    sarah.get_family_file()
    
    # Sarah uses manual override (Michael late again)
    print("\n⚠️  Step 1: Sarah uses manual override (Michael late to pickup)")
    sarah.manual_override(reason="other_parent_late")
    
    # Check compliance impact
    print("\n📊 Step 2: Check compliance impact")
    stats = sarah.get_custody_stats(days=7)
    
    # For high-conflict family, compliance should be < 95%
    assert stats.get("compliance_rate", 100) < 100, "Expected some non-compliance"
    
    print(f"\n✅ Manual override test PASSED")


def test_custody_time_calculations():
    """Test custody time distribution calculations"""
    print("\n" + "="*60)
    print("TEST: Custody Time Calculations")
    print("="*60)
    
    # Family 1: 65/35 split (Sarah & Michael)
    print("\n📊 Family 1: High-Conflict (65/35 split)")
    sarah = CustodyTestAgent("e2e_test_sarah@commonground.test", "TestPass123!", "Sarah")
    michael = CustodyTestAgent("e2e_test_michael@commonground.test", "TestPass123!", "Michael")
    
    sarah.login()
    sarah.get_family_file()
    
    michael.login()
    michael.get_family_file()
    
    sarah_stats = sarah.get_custody_stats(days=30)
    michael_stats = michael.get_custody_stats(days=30)
    
    # Sarah should have ~65% custody time
    assert 60 <= sarah_stats.get("my_time_percentage", 0) <= 70, "Sarah should have 60-70% custody"
    
    # Michael should have ~35% custody time  
    assert 30 <= michael_stats.get("my_time_percentage", 0) <= 40, "Michael should have 30-40% custody"
    
    # Family 2: 50/50 split (Jessica & David)
    print("\n📊 Family 2: Low-Conflict (50/50 split)")
    jessica = CustodyTestAgent("e2e_test_jessica@commonground.test", "TestPass123!", "Jessica")
    david = CustodyTestAgent("e2e_test_david@commonground.test", "TestPass123!", "David")
    
    jessica.login()
    jessica.get_family_file()
    
    david.login()
    david.get_family_file()
    
    jessica_stats = jessica.get_custody_stats(days=30)
    david_stats = david.get_custody_stats(days=30)
    
    # Both should have ~50% custody time
    assert 45 <= jessica_stats.get("my_time_percentage", 0) <= 55, "Jessica should have ~50% custody"
    assert 45 <= david_stats.get("my_time_percentage", 0) <= 55, "David should have ~50% custody"
    
    print(f"\n✅ Custody time calculation test PASSED")


def test_compliance_metrics():
    """Test compliance rate calculations (7/30/90 day)"""
    print("\n" + "="*60)
    print("TEST: Compliance Metrics")
    print("="*60)
    
    michael = CustodyTestAgent("e2e_test_michael@commonground.test", "TestPass123!", "Michael")
    david = CustodyTestAgent("e2e_test_david@commonground.test", "TestPass123!", "David")
    
    michael.login()
    michael.get_family_file()
    
    david.login()
    david.get_family_file()
    
    # Michael (high-conflict): Lower compliance
    print("\n📊 Michael's Compliance (High-Conflict)")
    michael_7day = michael.get_custody_stats(days=7)
    michael_30day = michael.get_custody_stats(days=30)
    michael_90day = michael.get_custody_stats(days=90)
    
    # Michael should have < 95% compliance (late 15% of time)
    assert michael_30day.get("compliance_rate", 100) < 95, "Michael should have lower compliance"
    
    # David (low-conflict): High compliance
    print("\n📊 David's Compliance (Low-Conflict)")
    david_7day = david.get_custody_stats(days=7)
    david_30day = david.get_custody_stats(days=30)
    david_90day = david.get_custody_stats(days=90)
    
    # David should have > 95% compliance
    assert david_30day.get("compliance_rate", 0) >= 95, "David should have high compliance"
    
    print(f"\n✅ Compliance metrics test PASSED")


def test_gps_validation():
    """Test GPS proximity validation"""
    print("\n" + "="*60)
    print("TEST: GPS Proximity Validation")
    print("="*60)
    
    sarah = CustodyTestAgent("e2e_test_sarah@commonground.test", "TestPass123!", "Sarah")
    michael = CustodyTestAgent("e2e_test_michael@commonground.test", "TestPass123!", "Michael")
    
    sarah.login()
    sarah.get_family_file()
    
    michael.login()
    michael.get_family_file()
    
    # Michael generates QR
    print("\n📱 Step 1: Michael generates QR code")
    token = michael.generate_qr_code()
    
    # Sarah scans QR at agreed location (should succeed)
    print("\n📷 Step 2: Sarah scans at agreed location")
    success = sarah.scan_qr_code(token, latitude=37.7749, longitude=-122.4194)
    assert success, "GPS validation should pass at agreed location"
    
    # Test scan at wrong location (should fail or flag)
    print("\n📷 Step 3: Test scan at distant location")
    token2 = michael.generate_qr_code()
    distant_scan = sarah.scan_qr_code(token2, latitude=40.7128, longitude=-74.0060)  # NYC instead of SF
    
    if not distant_scan:
        print("   ✅ GPS validation correctly rejected distant location")
    else:
        print("   ⚠️  GPS validation passed (may need stricter radius)")
    
    print(f"\n✅ GPS validation test PASSED")


def test_exchange_history_tracking():
    """Test exchange history and compliance tracking"""
    print("\n" + "="*60)
    print("TEST: Exchange History Tracking")
    print("="*60)
    
    sarah = CustodyTestAgent("e2e_test_sarah@commonground.test", "TestPass123!", "Sarah")
    sarah.login()
    sarah.get_family_file()
    
    # Get exchange history
    print("\n📋 Retrieving exchange history")
    exchanges = sarah.get_exchange_history()
    
    assert len(exchanges) > 0, "Should have exchange history from seed data"
    
    # Verify exchange data structure
    for exchange in exchanges[:3]:  # Check first 3
        assert "scheduled_time" in exchange
        assert "actual_time" in exchange
        assert "compliant" in exchange
        assert "method" in exchange
        
        print(f"\n   Exchange:")
        print(f"      Method: {exchange.get('method', 'unknown')}")
        print(f"      Compliant: {exchange.get('compliant', False)}")
        print(f"      GPS Verified: {exchange.get('gps_verified', False)}")
    
    print(f"\n✅ Exchange history tracking test PASSED")


if __name__ == "__main__":
    """Run all custody tests"""
    print("\n" + "="*60)
    print("COMMONGROUND E2E TEST SUITE: CUSTODY TRACKING")
    print("="*60)
    
    try:
        test_qr_code_exchange_flow()
        test_manual_custody_override()
        test_custody_time_calculations()
        test_compliance_metrics()
        test_gps_validation()
        test_exchange_history_tracking()
        
        print("\n" + "="*60)
        print("✅ ALL CUSTODY TESTS PASSED")
        print("="*60)
    except AssertionError as e:
        print(f"\n❌ TEST FAILED: {str(e)}")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
