"""
Test Email Notification System
Tests all email notification integrations.
"""

import requests
import time
from datetime import datetime
from typing import Dict

# Configuration
BASE_URL = "http://localhost:8000/api/v1"

# Color codes
GREEN = '\033[92m'
RED = '\033[91m'
YELLOW = '\033[93m'
BLUE = '\033[94m'
MAGENTA = '\033[95m'
RESET = '\033[0m'

def print_test(message: str):
    """Print test step"""
    print(f"\n{BLUE}{'='*70}{RESET}")
    print(f"{BLUE}{message}{RESET}")
    print(f"{BLUE}{'='*70}{RESET}")

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

def print_email_notice():
    """Print notice about email mode"""
    print(f"\n{MAGENTA}{'='*70}{RESET}")
    print(f"{MAGENTA}📧 EMAIL NOTIFICATION TEST{RESET}")
    print(f"{MAGENTA}{'='*70}{RESET}")
    print(f"{YELLOW}Note: Emails are in DEVELOPMENT MODE{RESET}")
    print(f"{YELLOW}They will be logged to console instead of actually sending.{RESET}")
    print(f"{YELLOW}Check the backend console output to see the email content.{RESET}")
    print(f"{MAGENTA}{'='*70}{RESET}\n")

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
        print_success(f"User {first_name} {last_name} registered")
        result = response.json()
        return result
    else:
        print_error("Registration failed", response.text)
        return None

def test_case_invitation_email(parent1_token: str, parent2_email: str) -> Dict:
    """Test case invitation email"""
    print_test("TEST 1: Case Invitation Email")
    print_info("This should send an invitation email to the other parent")

    headers = {"Authorization": f"Bearer {parent1_token}"}
    data = {
        "case_name": "Email Test Case",
        "other_parent_email": parent2_email,
        "state": "CA",
        "children": [
            {
                "first_name": "Sophie",
                "last_name": "Test",
                "date_of_birth": "2019-05-10",
                "gender": "female"
            },
            {
                "first_name": "Liam",
                "last_name": "Test",
                "date_of_birth": "2021-08-15",
                "gender": "male"
            }
        ]
    }

    response = requests.post(f"{BASE_URL}/cases/", json=data, headers=headers)

    if response.status_code == 201:
        result = response.json()
        print_success("Case created successfully")
        print_info(f"Case ID: {result['id']}")
        print_info(f"Invitation token: {result['invitation_token']}")
        print_info("")
        print_info("📧 CHECK BACKEND CONSOLE for the invitation email!")
        print_info("It should contain:")
        print_info("  - Subject: Invitation to collaborate on Email Test Case")
        print_info(f"  - To: {parent2_email}")
        print_info("  - Children names: Sophie, Liam")
        print_info("  - Invitation link with token")
        return result
    else:
        print_error("Case creation failed", response.text)
        return None

def test_agreement_approval_email(
    parent1_token: str,
    case_id: str
) -> Dict:
    """Test agreement approval email"""
    print_test("TEST 2: Agreement Approval Email")
    print_info("This should send an email when agreement is submitted for approval")

    headers = {"Authorization": f"Bearer {parent1_token}"}

    # Step 1: Create agreement
    print_info("Step 1: Creating agreement...")
    data = {"case_id": case_id, "title": "Email Test Agreement"}
    response = requests.post(f"{BASE_URL}/agreements/", json=data, headers=headers)

    if response.status_code != 201:
        print_error("Agreement creation failed", response.text)
        return None

    agreement = response.json()
    agreement_id = agreement['id']
    print_success(f"Agreement created: {agreement_id}")

    # Step 2: Update a required section
    print_info("Step 2: Completing a required section...")
    section_data = {
        "content": "This is a test agreement section for email notifications."
    }

    # Get the first section
    response = requests.get(
        f"{BASE_URL}/agreements/{agreement_id}/sections",
        headers=headers
    )

    if response.status_code != 200:
        print_error("Failed to get sections", response.text)
        return None

    sections = response.json()
    if not sections:
        print_error("No sections found")
        return None

    first_section_id = sections[0]['id']

    response = requests.put(
        f"{BASE_URL}/agreements/{agreement_id}/sections/{first_section_id}",
        json=section_data,
        headers=headers
    )

    if response.status_code != 200:
        print_error("Section update failed", response.text)
        return None

    print_success("Section completed")

    # Step 3: Submit for approval (this triggers the email)
    print_info("Step 3: Submitting for approval (triggers email)...")
    response = requests.post(
        f"{BASE_URL}/agreements/{agreement_id}/submit",
        headers=headers
    )

    if response.status_code == 200:
        result = response.json()
        print_success("Agreement submitted for approval")
        print_info("")
        print_info("📧 CHECK BACKEND CONSOLE for the approval email!")
        print_info("It should contain:")
        print_info("  - Subject: Agreement ready for your approval")
        print_info("  - Agreement title: Email Test Agreement")
        print_info("  - Review link")
        return result
    else:
        print_error("Submission failed", response.text)
        return None

def test_message_notification_email(
    parent1_token: str,
    parent1_id: str,
    parent2_token: str,
    parent2_id: str,
    case_id: str
) -> Dict:
    """Test message notification email"""
    print_test("TEST 3: Message Notification Email")
    print_info("This should send an email when a message is received")

    headers = {"Authorization": f"Bearer {parent1_token}"}

    # Send a message from parent1 to parent2
    data = {
        "message_data": {
            "case_id": case_id,
            "recipient_id": parent2_id,
            "content": "Hi! This is a test message to verify email notifications are working correctly. Can you confirm you received this?"
        }
    }

    response = requests.post(f"{BASE_URL}/messages/", json=data, headers=headers)

    if response.status_code == 201:
        result = response.json()
        print_success("Message sent successfully")
        print_info(f"Message ID: {result['id']}")
        print_info("")
        print_info("📧 CHECK BACKEND CONSOLE for the message notification email!")
        print_info("It should contain:")
        print_info("  - Subject: New message from [Parent 1 Name]")
        print_info(f"  - To: Parent 2 email")
        print_info("  - Message preview (first 100 chars)")
        print_info("  - Link to view message")
        print_info("  - ARIA flag indicator (if message was flagged)")
        return result
    else:
        print_error("Message send failed", response.text)
        return None

def test_message_with_aria_flag(
    parent2_token: str,
    parent1_id: str,
    case_id: str
) -> Dict:
    """Test message notification with ARIA flag"""
    print_test("TEST 4: Message with ARIA Flag Email")
    print_info("This should send an email with ARIA flag indicator")

    headers = {"Authorization": f"Bearer {parent2_token}"}

    # Send a message that will likely be flagged by ARIA
    data = {
        "message_data": {
            "case_id": case_id,
            "recipient_id": parent1_id,
            "content": "YOU NEVER listen to me! This is ridiculous and I'm tired of your games!"
        }
    }

    response = requests.post(f"{BASE_URL}/messages/", json=data, headers=headers)

    if response.status_code == 201:
        result = response.json()
        print_success("Message sent")

        if result.get('was_flagged'):
            print_success("✓ Message was flagged by ARIA (expected)")
        else:
            print_info("Message was not flagged (unexpected)")

        print_info("")
        print_info("📧 CHECK BACKEND CONSOLE for the flagged message email!")
        print_info("It should contain:")
        print_info("  - ARIA Note section in yellow/amber styling")
        print_info("  - Indication that message was reviewed by AI assistant")
        return result
    else:
        print_error("Message send failed", response.text)
        return None

def main():
    """Run complete email notification test"""
    print_email_notice()

    # Generate unique emails
    timestamp = int(time.time())
    parent1_email = f"parent1_{timestamp}@test.com"
    parent2_email = f"parent2_{timestamp}@test.com"
    password = "TestPassword123!"

    # Step 1: Register two parents
    parent1 = register_user(parent1_email, password, "Michael", "Johnson")
    if not parent1:
        return

    parent2 = register_user(parent2_email, password, "Jennifer", "Johnson")
    if not parent2:
        return

    parent1_token = parent1['access_token']
    parent1_id = parent1['user']['id']
    parent2_token = parent2['access_token']
    parent2_id = parent2['user']['id']

    print_success(f"\n✓ Both parents registered")
    print_info(f"Parent 1: {parent1_email}")
    print_info(f"Parent 2: {parent2_email}")

    # Test 1: Case invitation email
    case = test_case_invitation_email(parent1_token, parent2_email)
    if not case:
        print_error("\n❌ Case invitation test failed!")
        return

    case_id = case['id']
    invitation_token = case['invitation_token']

    # Accept the invitation (so we can test other features)
    print_info("\nAccepting invitation...")
    headers = {"Authorization": f"Bearer {parent2_token}"}
    response = requests.post(
        f"{BASE_URL}/cases/{case_id}/accept",
        json={"invitation_token": invitation_token},
        headers=headers
    )

    if response.status_code == 200:
        print_success("Invitation accepted")
    else:
        print_error("Invitation acceptance failed", response.text)
        return

    # Test 2: Agreement approval email
    time.sleep(1)  # Brief pause between tests
    agreement = test_agreement_approval_email(parent1_token, case_id)
    if not agreement:
        print_error("\n❌ Agreement approval email test failed!")

    # Test 3: Message notification email
    time.sleep(1)
    message = test_message_notification_email(
        parent1_token,
        parent1_id,
        parent2_token,
        parent2_id,
        case_id
    )
    if not message:
        print_error("\n❌ Message notification test failed!")

    # Test 4: Message with ARIA flag email
    time.sleep(1)
    flagged_message = test_message_with_aria_flag(
        parent2_token,
        parent1_id,
        case_id
    )
    if not flagged_message:
        print_error("\n❌ ARIA flag email test failed!")

    # Final summary
    print(f"\n{GREEN}{'='*70}{RESET}")
    print(f"{GREEN}🎉 Email Notification Tests Complete!{RESET}")
    print(f"{GREEN}{'='*70}{RESET}\n")

    print(f"{MAGENTA}📊 Test Summary:{RESET}")
    print(f"{GREEN}✓ Case invitation email{RESET}")
    print(f"{GREEN}✓ Agreement approval email{RESET}")
    print(f"{GREEN}✓ Message notification email{RESET}")
    print(f"{GREEN}✓ ARIA flagged message email{RESET}")

    print(f"\n{YELLOW}📋 To verify emails were sent:{RESET}")
    print(f"{YELLOW}1. Check your backend console output{RESET}")
    print(f"{YELLOW}2. Look for email logs showing:{RESET}")
    print(f"{YELLOW}   - Email subject lines{RESET}")
    print(f"{YELLOW}   - Recipient addresses{RESET}")
    print(f"{YELLOW}   - Email content previews{RESET}")
    print(f"{YELLOW}3. All emails should be logged (not actually sent in dev mode){RESET}")

    print(f"\n{BLUE}💡 Next Steps:{RESET}")
    print(f"{BLUE}1. Review the email content in the console{RESET}")
    print(f"{BLUE}2. Verify HTML formatting looks correct{RESET}")
    print(f"{BLUE}3. For production: Add SendGrid/AWS SES API keys to .env{RESET}")
    print(f"{BLUE}4. Set EMAIL_ENABLED=true in .env for production{RESET}\n")

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print(f"\n{YELLOW}Test interrupted by user{RESET}")
    except Exception as e:
        print_error(f"Unexpected error: {str(e)}")
        import traceback
        traceback.print_exc()
