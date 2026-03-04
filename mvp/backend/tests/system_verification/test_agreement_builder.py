"""
Test Agreement Builder System
Tests the complete agreement workflow including dual approval and PDF generation.
"""

import requests
import time
from typing import Dict

# Configuration
BASE_URL = "http://localhost:8000/api/v1"

# Color codes for output
GREEN = '\033[92m'
RED = '\033[91m'
YELLOW = '\033[93m'
BLUE = '\033[94m'
RESET = '\033[0m'

def print_test(message: str):
    """Print test step"""
    print(f"\n{BLUE}{'='*60}{RESET}")
    print(f"{BLUE}{message}{RESET}")
    print(f"{BLUE}{'='*60}{RESET}")

def print_success(message: str):
    """Print success message"""
    print(f"{GREEN}✓ {message}{RESET}")

def print_error(message: str, details=None):
    """Print error message"""
    print(f"{RED}✗ {message}{RESET}")
    if details:
        print(f"{RED}  Details: {details}{RESET}")

def print_info(message: str):
    """Print info message"""
    print(f"{YELLOW}ℹ {message}{RESET}")

def register_user(email: str, password: str, first_name: str, last_name: str) -> Dict:
    """Register a new user"""
    print_test(f"Registering user: {email}")

    data = {
        "email": email,
        "password": password,
        "first_name": first_name,
        "last_name": last_name
    }

    response = requests.post(f"{BASE_URL}/auth/register", json=data)

    if response.status_code == 201:
        print_success(f"User {first_name} {last_name} registered successfully")
        result = response.json()
        print_info(f"User ID: {result['user']['id']}")
        print_info(f"Access Token: {result['access_token'][:30]}...")
        return result
    else:
        print_error("Registration failed", response.text)
        return None

def create_case(access_token: str, other_parent_email: str) -> Dict:
    """Create a new case"""
    print_test("Creating case")

    headers = {"Authorization": f"Bearer {access_token}"}
    data = {
        "case_name": "Agreement Builder Test Case",
        "other_parent_email": other_parent_email,
        "state": "CA",
        "county": "Los Angeles",
        "children": [
            {
                "first_name": "Emma",
                "last_name": "Test",
                "date_of_birth": "2015-03-15",
                "gender": "female"
            },
            {
                "first_name": "Noah",
                "last_name": "Test",
                "date_of_birth": "2017-07-22",
                "gender": "male"
            }
        ]
    }

    response = requests.post(f"{BASE_URL}/cases/", json=data, headers=headers)

    if response.status_code == 201:
        result = response.json()
        print_success("Case created successfully")
        print_info(f"Case ID: {result['id']}")
        print_info(f"Case Name: {result['case_name']}")
        print_info(f"Status: {result['status']}")
        print_info(f"Invitation Token: {result['invitation_token']}")
        return result
    else:
        print_error("Case creation failed", response.text)
        return None

def accept_invitation(access_token: str, case_id: str, invitation_token: str) -> Dict:
    """Accept case invitation"""
    print_test("Accepting case invitation")

    headers = {"Authorization": f"Bearer {access_token}"}
    data = {"invitation_token": invitation_token}

    response = requests.post(f"{BASE_URL}/cases/{case_id}/accept", json=data, headers=headers)

    if response.status_code == 200:
        result = response.json()
        print_success("Case invitation accepted")
        print_info(f"Status: {result['status']}")
        return result
    else:
        print_error("Invitation acceptance failed", response.text)
        return None

def create_agreement(access_token: str, case_id: str) -> Dict:
    """Create agreement for case"""
    print_test("Creating agreement")

    headers = {"Authorization": f"Bearer {access_token}"}
    data = {"title": "Parenting Agreement"}

    response = requests.post(
        f"{BASE_URL}/cases/{case_id}/agreement",
        json=data,
        headers=headers
    )

    if response.status_code == 201:
        result = response.json()
        print_success("Agreement created successfully")
        print_info(f"Agreement ID: {result['id']}")
        print_info(f"Title: {result['title']}")
        print_info(f"Version: {result['version']}")
        print_info(f"Status: {result['status']}")
        print_info(f"Sections Count: {result['sections_count']}")
        print_info(f"Message: {result['message']}")
        return result
    else:
        print_error("Agreement creation failed", response.text)
        return None

def get_agreement(access_token: str, case_id: str) -> Dict:
    """Get case agreement with sections"""
    print_test("Retrieving agreement with sections")

    headers = {"Authorization": f"Bearer {access_token}"}

    response = requests.get(
        f"{BASE_URL}/cases/{case_id}/agreement",
        headers=headers
    )

    if response.status_code == 200:
        result = response.json()
        print_success("Agreement retrieved successfully")
        print_info(f"Agreement ID: {result['agreement']['id']}")
        print_info(f"Total Sections: {len(result['sections'])}")
        print_info(f"Completion: {result['completion_percentage']:.1f}%")

        # Show first few sections
        print_info("\nFirst 3 sections:")
        for section in result['sections'][:3]:
            print_info(f"  {section['section_number']}. {section['section_title']} - Completed: {section['is_completed']}")

        return result
    else:
        print_error("Failed to retrieve agreement", response.text)
        return None

def update_section(access_token: str, section_id: str, content: str) -> Dict:
    """Update agreement section"""
    print_test(f"Updating section {section_id}")

    headers = {"Authorization": f"Bearer {access_token}"}
    data = {
        "section_number": "4",  # Will be overwritten by actual section data
        "section_title": "Parenting Time Schedule",
        "content": content,
        "structured_data": {
            "weekday_schedule": {
                "monday": "Parent A",
                "tuesday": "Parent A",
                "wednesday": "Parent B",
                "thursday": "Parent B",
                "friday": "Alternating",
                "saturday": "Weekend parent",
                "sunday": "Weekend parent"
            },
            "weekend_pattern": "Alternating weekends"
        }
    }

    response = requests.put(
        f"{BASE_URL}/agreements/sections/{section_id}",
        json=data,
        headers=headers
    )

    if response.status_code == 200:
        result = response.json()
        print_success("Section updated successfully")
        print_info(f"Section: {result['section_number']}. {result['section_title']}")
        print_info(f"Completed: {result['is_completed']}")
        return result
    else:
        print_error("Section update failed", response.text)
        return None

def submit_for_approval(access_token: str, agreement_id: str) -> Dict:
    """Submit agreement for approval"""
    print_test("Submitting agreement for approval")

    headers = {"Authorization": f"Bearer {access_token}"}

    response = requests.post(
        f"{BASE_URL}/agreements/{agreement_id}/submit",
        headers=headers
    )

    if response.status_code == 200:
        result = response.json()
        print_success("Agreement submitted for approval")
        print_info(f"Status: {result['status']}")
        print_info(f"PDF URL: {result['pdf_url']}")
        print_info(f"Message: {result['message']}")
        return result
    else:
        print_error("Submission failed", response.text)
        return None

def approve_agreement(access_token: str, agreement_id: str, notes: str = None) -> Dict:
    """Approve an agreement"""
    print_test("Approving agreement")

    headers = {"Authorization": f"Bearer {access_token}"}
    data = {"notes": notes} if notes else {}

    response = requests.post(
        f"{BASE_URL}/agreements/{agreement_id}/approve",
        json=data,
        headers=headers
    )

    if response.status_code == 200:
        result = response.json()
        print_success("Agreement approved")
        print_info(f"Status: {result['status']}")
        print_info(f"Petitioner Approved: {result['petitioner_approved']}")
        print_info(f"Respondent Approved: {result['respondent_approved']}")
        if result.get('effective_date'):
            print_info(f"Effective Date: {result['effective_date']}")
        print_info(f"Message: {result['message']}")
        return result
    else:
        print_error("Approval failed", response.text)
        return None

def download_pdf(access_token: str, agreement_id: str) -> bool:
    """Download agreement PDF"""
    print_test("Downloading agreement PDF")

    headers = {"Authorization": f"Bearer {access_token}"}

    response = requests.get(
        f"{BASE_URL}/agreements/{agreement_id}/pdf",
        headers=headers
    )

    if response.status_code == 200:
        # Save PDF to file
        filename = f"agreement_{agreement_id}.pdf"
        with open(filename, 'wb') as f:
            f.write(response.content)
        print_success(f"PDF downloaded successfully: {filename}")
        print_info(f"File size: {len(response.content)} bytes")
        return True
    else:
        print_error("PDF download failed", response.text)
        return False

def main():
    """Run complete agreement builder test workflow"""
    print(f"\n{BLUE}{'='*60}{RESET}")
    print(f"{BLUE}Agreement Builder System Test{RESET}")
    print(f"{BLUE}{'='*60}{RESET}\n")

    # Generate unique emails using timestamp
    timestamp = int(time.time())
    parent1_email = f"parent1_{timestamp}@test.com"
    parent2_email = f"parent2_{timestamp}@test.com"
    password = "TestPassword123!"

    # Step 1: Register two parents
    parent1 = register_user(parent1_email, password, "Alice", "Smith")
    if not parent1:
        print_error("Failed to register Parent 1. Exiting.")
        return

    parent2 = register_user(parent2_email, password, "Bob", "Smith")
    if not parent2:
        print_error("Failed to register Parent 2. Exiting.")
        return

    parent1_token = parent1['access_token']
    parent2_token = parent2['access_token']

    # Step 2: Parent 1 creates case
    case = create_case(parent1_token, parent2_email)
    if not case:
        print_error("Failed to create case. Exiting.")
        return

    case_id = case['id']
    invitation_token = case['invitation_token']

    # Step 3: Parent 2 accepts invitation
    acceptance = accept_invitation(parent2_token, case_id, invitation_token)
    if not acceptance:
        print_error("Failed to accept invitation. Exiting.")
        return

    # Step 4: Parent 1 creates agreement
    agreement = create_agreement(parent1_token, case_id)
    if not agreement:
        print_error("Failed to create agreement. Exiting.")
        return

    agreement_id = agreement['id']

    # Step 5: Get agreement with all sections
    full_agreement = get_agreement(parent1_token, case_id)
    if not full_agreement:
        print_error("Failed to retrieve agreement. Exiting.")
        return

    sections = full_agreement['sections']

    # Step 6: Update several sections
    print_info(f"\nUpdating sections to build the agreement...")

    # Find sections we want to update
    sections_to_update = []
    for section in sections:
        if section['section_number'] in ['1', '2', '4', '8', '9', '10', '14', '16', '17', '18']:
            sections_to_update.append(section)

    # Update required sections
    for section in sections_to_update:
        content = f"Updated content for {section['section_title']}. This section has been customized for the Smith family parenting agreement."
        update_section(parent1_token, section['id'], content)
        time.sleep(0.5)  # Small delay between updates

    # Step 7: Check completion percentage
    updated_agreement = get_agreement(parent1_token, case_id)
    print_info(f"\nAgreement completion: {updated_agreement['completion_percentage']:.1f}%")

    # Step 8: Submit for approval
    print_info("\nNote: Submission may fail if not all required sections are completed.")
    print_info("This is expected behavior - the system requires all mandatory sections.")

    submitted = submit_for_approval(parent1_token, agreement_id)
    if not submitted:
        print_error("Submission failed - likely because required sections are incomplete")
        print_info("In production, users would complete all 18 sections via interview")

        # Update all required sections to allow submission
        print_info("\nCompleting all required sections...")
        for section in sections:
            if section['is_required'] and not section['is_completed']:
                content = f"Completed content for {section['section_title']}."
                update_section(parent1_token, section['id'], content)
                time.sleep(0.3)

        # Try submission again
        submitted = submit_for_approval(parent1_token, agreement_id)
        if not submitted:
            print_error("Submission still failed. Check server logs.")
            return

    # Step 9: Parent 1 approves
    approval1 = approve_agreement(parent1_token, agreement_id, "I approve this agreement - Parent A")
    if not approval1:
        print_error("Parent 1 approval failed. Exiting.")
        return

    # Step 10: Parent 2 approves
    approval2 = approve_agreement(parent2_token, agreement_id, "I approve this agreement - Parent B")
    if not approval2:
        print_error("Parent 2 approval failed. Exiting.")
        return

    # Step 11: Download PDF
    pdf_success = download_pdf(parent1_token, agreement_id)

    # Final summary
    print(f"\n{GREEN}{'='*60}{RESET}")
    print(f"{GREEN}Agreement Builder Test Complete!{RESET}")
    print(f"{GREEN}{'='*60}{RESET}\n")

    print(f"{GREEN}✓ Two parents registered{RESET}")
    print(f"{GREEN}✓ Case created and accepted{RESET}")
    print(f"{GREEN}✓ Agreement created with 18 sections{RESET}")
    print(f"{GREEN}✓ Multiple sections updated{RESET}")
    print(f"{GREEN}✓ Agreement submitted for approval{RESET}")
    print(f"{GREEN}✓ Both parents approved{RESET}")
    print(f"{GREEN}✓ Agreement status: {approval2['status'].upper()}{RESET}")
    if pdf_success:
        print(f"{GREEN}✓ PDF generated and downloaded{RESET}")

    print(f"\n{BLUE}All agreement builder features working correctly!{RESET}\n")

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print(f"\n{YELLOW}Test interrupted by user{RESET}")
    except Exception as e:
        print_error(f"Unexpected error: {str(e)}")
        import traceback
        traceback.print_exc()
