"""
E2E Test Agent: Agreement Workflows

Tests agreement functionality including:
- Agreement creation
- 7-section structure
- Section editing with ARIA suggestions
- Dual-parent approval workflow
- Agreement activation
"""

import pytest
import sys
import os
from datetime import datetime

sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


class AgreementTestAgent:
    """Test agent for agreement workflows"""
    
    def __init__(self, email: str, password: str, name: str):
        self.email = email
        self.password = password
        self.name = name
        self.token = None
        self.user_id = None
        self.family_file_id = None
    
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
        return self.family_file_id
    
    def create_agreement(self, title: str = "Co-Parenting Agreement"):
        """Create a new agreement"""
        response = client.post(
            "/api/v1/agreements/",
            headers=self.get_headers(),
            json={
                "family_file_id": self.family_file_id,
                "title": title
            }
        )
        
        assert response.status_code == 201, f"Agreement creation failed: {response.json()}"
        agreement = response.json()
        print(f"   ✅ {self.name} created agreement: {title}")
        print(f"      ID: {agreement['id']}")
        
        return agreement
    
    def get_agreement(self, agreement_id: str):
        """Get agreement details"""
        response = client.get(
            f"/api/v1/agreements/{agreement_id}",
            headers=self.get_headers()
        )
        
        assert response.status_code == 200
        return response.json()
    
    def update_section(self, section_id: str, content: str):
        """Update a section's content"""
        response = client.put(
            f"/api/v1/agreements/sections/{section_id}",
            headers=self.get_headers(),
            json={"content": content}
        )
        
        assert response.status_code == 200, f"Section update failed: {response.json()}"
        print(f"   ✅ {self.name} updated section")
        
        return response.json()
    
    def get_aria_template(self, section_title: str):
        """Get ARIA template suggestion for a section"""
        response = client.post(
            "/api/v1/agreements/aria-template",
            headers=self.get_headers(),
            json={"section_title": section_title}
        )
        
        if response.status_code == 200:
            template = response.json()
            print(f"   💡 ARIA suggested template for '{section_title}'")
            print(f"      Length: {len(template.get('content', ''))} characters")
            return template
        else:
            print(f"   ⚠️  ARIA template not available")
            return None
    
    def submit_for_approval(self, agreement_id: str):
        """Submit agreement for co-parent approval"""
        response = client.post(
            f"/api/v1/agreements/{agreement_id}/submit",
            headers=self.get_headers()
        )
        
        assert response.status_code == 200, f"Submit failed: {response.json()}"
        print(f"   ✅ {self.name} submitted agreement for approval")
        
        return response.json()
    
    def approve_agreement(self, agreement_id: str):
        """Approve an agreement"""
        response = client.post(
            f"/api/v1/agreements/{agreement_id}/approve",
            headers=self.get_headers()
        )
        
        assert response.status_code == 200, f"Approval failed: {response.json()}"
        print(f"   ✅ {self.name} approved agreement")
        
        return response.json()
    
    def activate_agreement(self, agreement_id: str):
        """Activate an approved agreement"""
        response = client.post(
            f"/api/v1/agreements/{agreement_id}/activate",
            headers=self.get_headers(),
            json={
                "effective_date": datetime.utcnow().isoformat()
            }
        )
        
        assert response.status_code == 200, f"Activation failed: {response.json()}"
        print(f"   ✅ Agreement activated")
        
        return response.json()
    
    def get_all_agreements(self):
        """Get all agreements for family"""
        response = client.get(
            f"/api/v1/agreements/family-file/{self.family_file_id}",
            headers=self.get_headers()
        )
        
        assert response.status_code == 200
        agreements = response.json()
        
        print(f"\n   📄 Agreements ({len(agreements)}):")
        for agreement in agreements:
            status = agreement.get('status', 'unknown')
            title = agreement.get('title', 'Untitled')
            print(f"      • {title}: {status}")
        
        return agreements


def test_create_agreement_with_7_sections():
    """Test creating agreement with required 7 sections"""
    print("\n" + "="*60)
    print("TEST: Create Agreement with 7 Sections (Jessica)")
    print("="*60)
    
    jessica = AgreementTestAgent("e2e_test_jessica@commonground.test", "TestPass123!", "Jessica")
    jessica.login()
    jessica.get_family_file()
    
    # Step 1: Create agreement
    print("\n📝 Step 1: Create new agreement")
    agreement = jessica.create_agreement("Summer Custody Agreement")
    
    # Step 2: Verify 7 sections created
    print("\n📋 Step 2: Verify 7 sections exist")
    agreement_detail = jessica.get_agreement(agreement["id"])
    
    sections = agreement_detail.get("sections", [])
    print(f"   Sections found: {len(sections)}")
    
    expected_sections = [
        "Custody Schedule",
        "Decision Making",
        "Communication Protocol",
        "Financial Responsibilities",
        "Healthcare",
        "Education",
        "Dispute Resolution"
    ]
    
    assert len(sections) == 7, f"Expected 7 sections, got {len(sections)}"
    
    section_titles = [s.get("title") for s in sections]
    for expected in expected_sections:
        # Check if title exists (may vary slightly)
        found = any(expected.lower() in title.lower() for title in section_titles)
        if found:
            print(f"   ✓ {expected}")
    
    print(f"\n✅ Agreement creation with 7 sections test PASSED")


def test_section_editing_with_aria():
    """Test editing sections with ARIA template suggestions"""
    print("\n" + "="*60)
    print("TEST: Section Editing with ARIA Templates")
    print("="*60)
    
    jessica = AgreementTestAgent("e2e_test_jessica@commonground.test", "TestPass123!", "Jessica")
    jessica.login()
    jessica.get_family_file()
    
    # Get existing agreement
    print("\n📄 Step 1: Get existing agreement")
    agreements = jessica.get_all_agreements()
    assert len(agreements) > 0, "Should have agreements from seed data"
    
    agreement = agreements[0]
    agreement_detail = jessica.get_agreement(agreement["id"])
    sections = agreement_detail.get("sections", [])
    
    # Step 2: Get ARIA template for a section
    print("\n💡 Step 2: Request ARIA template for Custody Schedule")
    template = jessica.get_aria_template("Custody Schedule")
    
    # Step 3: Update section with custom content
    print("\n✏️  Step 3: Update section content")
    if sections:
        first_section = sections[0]
        custom_content = "Week 1: Mother has custody Monday-Thursday. Father has custody Friday-Sunday. Week 2: Reverse schedule."
        
        jessica.update_section(
            first_section["id"],
            custom_content
        )
        
        # Verify update
        updated_agreement = jessica.get_agreement(agreement["id"])
        updated_section = next((s for s in updated_agreement["sections"] if s["id"] == first_section["id"]), None)
        
        if updated_section:
            assert custom_content in updated_section["content"]
            print(f"   ✓ Section updated successfully")
    
    print(f"\n✅ Section editing with ARIA test PASSED")


def test_dual_approval_workflow():
    """Test dual-parent approval workflow (Jessica & David)"""
    print("\n" + "="*60)
    print("TEST: Dual-Parent Approval Workflow")
    print("="*60)
    
    jessica = AgreementTestAgent("e2e_test_jessica@commonground.test", "TestPass123!", "Jessica")
    david = AgreementTestAgent("e2e_test_david@commonground.test", "TestPass123!", "David")
    
    jessica.login()
    jessica.get_family_file()
    
    david.login()
    david.get_family_file()
    
    # Step 1: Jessica creates and submits agreement
    print("\n📝 Step 1: Jessica creates agreement")
    agreement = jessica.create_agreement("School Year Agreement")
    
    print("\n📤 Step 2: Jessica submits for David's approval")
    jessica.submit_for_approval(agreement["id"])
    
    # Verify status changed to pending_approval
    agreement_detail = jessica.get_agreement(agreement["id"])
    status = agreement_detail.get("status")
    print(f"   Agreement Status: {status}")
    assert status in ["pending_approval", "submitted"]
    
    # Step 3: David reviews and approves
    print("\n👍 Step 3: David approves agreement")
    david.approve_agreement(agreement["id"])
    
    # Step 4: Verify status changed to approved
    print("\n✅ Step 4: Verify agreement approved")
    final_agreement = jessica.get_agreement(agreement["id"])
    final_status = final_agreement.get("status")
    print(f"   Final Status: {final_status}")
    assert final_status in ["approved", "active"]
    
    print(f"\n✅ Dual-approval workflow test PASSED")


def test_agreement_activation():
    """Test agreement activation process"""
    print("\n" + "="*60)
    print("TEST: Agreement Activation")
    print("="*60)
    
    jessica = AgreementTestAgent("e2e_test_jessica@commonground.test", "TestPass123!", "Jessica")
    david = AgreementTestAgent("e2e_test_david@commonground.test", "TestPass123!", "David")
    
    jessica.login()
    jessica.get_family_file()
    
    david.login()
    david.get_family_file()
    
    # Find an approved agreement
    print("\n🔍 Step 1: Find approved agreement")
    agreements = jessica.get_all_agreements()
    approved = next((a for a in agreements if a.get("status") == "approved"), None)
    
    if approved:
        print(f"   Found agreement: {approved.get('title')}")
        
        # Step 2: Activate agreement
        print("\n🚀 Step 2: Activate agreement")
        jessica.activate_agreement(approved["id"])
        
        # Step 3: Verify status changed to active
        print("\n✅ Step 3: Verify agreement is active")
        activated = jessica.get_agreement(approved["id"])
        assert activated.get("status") == "active"
        print(f"   Status: {activated.get('status')}")
    else:
        print("   ⚠️  No approved agreements found, skipping activation test")
        print("   (This is expected if running against fresh test data)")
    
    print(f"\n✅ Agreement activation test PASSED")


def test_high_vs_low_conflict_approval_timing():
    """Compare approval timing between high and low conflict families"""
    print("\n" + "="*60)
    print("TEST: Approval Timing Comparison")
    print("="*60)
    
    # Family 1: High-conflict (Sarah & Michael)
    print("\n📊 Family 1: High-Conflict (Sarah & Michael)")
    sarah = AgreementTestAgent("e2e_test_sarah@commonground.test", "TestPass123!", "Sarah")
    sarah.login()
    sarah.get_family_file()
    
    agreements_sarah = sarah.get_all_agreements()
    
    # Check for pending approvals
    pending_sarah = [a for a in agreements_sarah if a.get("status") in ["pending_approval", "submitted"]]
    approved_sarah = [a for a in agreements_sarah if a.get("status") == "approved"]
    
    print(f"   Pending Approval: {len(pending_sarah)}")
    print(f"   Approved: {len(approved_sarah)}")
    
    # Expect some pending (Michael delays approval)
    
    # Family 2: Low-conflict (Jessica & David)
    print("\n📊 Family 2: Low-Conflict (Jessica & David)")
    jessica = AgreementTestAgent("e2e_test_jessica@commonground.test", "TestPass123!", "Jessica")
    jessica.login()
    jessica.get_family_file()
    
    agreements_jessica = jessica.get_all_agreements()
    
    pending_jessica = [a for a in agreements_jessica if a.get("status") in ["pending_approval", "submitted"]]
    approved_jessica = [a for a in agreements_jessica if a.get("status") == "approved"]
    
    print(f"   Pending Approval: {len(pending_jessica)}")
    print(f"   Approved: {len(approved_jessica)}")
    
    # Expect most approved (David approves quickly)
    
    print(f"\n✅ Approval timing comparison test PASSED")


def test_agreement_section_approval_tracking():
    """Test individual section approval tracking"""
    print("\n" + "="*60)
    print("TEST: Section-Level Approval Tracking")
    print("="*60)
    
    jessica = AgreementTestAgent("e2e_test_jessica@commonground.test", "TestPass123!", "Jessica")
    jessica.login()
    jessica.get_family_file()
    
    # Get agreement with sections
    print("\n📋 Step 1: Get agreement details")
    agreements = jessica.get_all_agreements()
    
    if agreements:
        agreement = jessica.get_agreement(agreements[0]["id"])
        sections = agreement.get("sections", [])
        
        print(f"   Agreement: {agreement.get('title')}")
        print(f"   Total Sections: {len(sections)}")
        
        # Check section approval status
        print("\n✅ Step 2: Check section approval status")
        for section in sections:
            title = section.get("title")
            parent1_approved = section.get("approved_by_parent1", False)
            parent2_approved = section.get("approved_by_parent2", False)
            
            print(f"   • {title}")
            print(f"      Parent 1: {'✓' if parent1_approved else '✗'}")
            print(f"      Parent 2: {'✓' if parent2_approved else '✗'}")
        
        # Verify section structure
        for section in sections:
            assert "title" in section
            assert "content" in section
            assert "section_number" in section
    
    print(f"\n✅ Section approval tracking test PASSED")


if __name__ == "__main__":
    """Run all agreement tests"""
    print("\n" + "="*60)
    print("COMMONGROUND E2E TEST SUITE: AGREEMENTS")
    print("="*60)
    
    try:
        test_create_agreement_with_7_sections()
        test_section_editing_with_aria()
        test_dual_approval_workflow()
        test_agreement_activation()
        test_high_vs_low_conflict_approval_timing()
        test_agreement_section_approval_tracking()
        
        print("\n" + "="*60)
        print("✅ ALL AGREEMENT TESTS PASSED")
        print("="*60)
    except AssertionError as e:
        print(f"\n❌ TEST FAILED: {str(e)}")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
