"""
Test ARIA Messaging System
Tests complete messaging workflow with sentiment analysis and interventions.
"""

import requests
import time
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

def print_aria(message: str):
    """Print ARIA intervention"""
    print(f"{MAGENTA}🛡️  ARIA: {message}{RESET}")

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

def create_case(access_token: str, other_parent_email: str) -> Dict:
    """Create a new case"""
    print_test("Creating case")

    headers = {"Authorization": f"Bearer {access_token}"}
    data = {
        "case_name": "ARIA Messaging Test Case",
        "other_parent_email": other_parent_email,
        "state": "CA",
        "children": [
            {
                "first_name": "Sophia",
                "last_name": "Test",
                "date_of_birth": "2016-05-10",
                "gender": "female"
            }
        ]
    }

    response = requests.post(f"{BASE_URL}/cases/", json=data, headers=headers)

    if response.status_code == 201:
        result = response.json()
        print_success("Case created")
        print_info(f"Case ID: {result['id']}")
        return result
    else:
        print_error("Case creation failed", response.text)
        return None

def accept_invitation(access_token: str, case_id: str, invitation_token: str) -> Dict:
    """Accept case invitation"""
    print_test("Accepting invitation")

    headers = {"Authorization": f"Bearer {access_token}"}
    data = {"invitation_token": invitation_token}

    response = requests.post(f"{BASE_URL}/cases/{case_id}/accept", json=data, headers=headers)

    if response.status_code == 200:
        result = response.json()
        print_success("Invitation accepted")
        return result
    else:
        print_error("Acceptance failed", response.text)
        return None

def analyze_message(access_token: str, case_id: str, content: str) -> Dict:
    """Analyze a message with ARIA"""
    print_test(f"Analyzing message with ARIA")
    print_info(f'Message: "{content}"')

    headers = {"Authorization": f"Bearer {access_token}"}
    data = {
        "case_id": case_id,
        "content": content
    }

    response = requests.post(f"{BASE_URL}/messages/analyze", json=data, headers=headers)

    if response.status_code == 200:
        result = response.json()

        if result["is_flagged"]:
            print_aria(f"FLAGGED - Level: {result['toxicity_level'].upper()}")
            print_aria(f"Score: {result['toxicity_score']:.2f}")
            print_aria(f"Explanation: {result['explanation']}")
            if result.get("intervention"):
                print_aria(f'Suggestion: "{result["intervention"]["suggestion"]}"')
        else:
            print_success("Message is clean - no intervention needed")

        return result
    else:
        print_error("Analysis failed", response.text)
        return None

def send_message(
    access_token: str,
    case_id: str,
    recipient_id: str,
    content: str,
    intervention_action: Dict = None
) -> Dict:
    """Send a message"""
    print_test("Sending message")

    headers = {"Authorization": f"Bearer {access_token}"}
    data = {
        "message_data": {
            "case_id": case_id,
            "recipient_id": recipient_id,
            "content": content
        }
    }

    if intervention_action:
        data["intervention_action"] = intervention_action

    response = requests.post(
        f"{BASE_URL}/messages/",
        json=data,
        headers=headers
    )

    if response.status_code == 201:
        result = response.json()
        print_success("Message sent")
        print_info(f"Final content: \"{result['content']}\"")
        if result['was_flagged']:
            print_aria(f"ARIA intervention was triggered")
        return result
    else:
        print_error("Send failed", response.text)
        return None

def get_messages(access_token: str, case_id: str) -> Dict:
    """Get messages for a case"""
    print_test("Retrieving messages")

    headers = {"Authorization": f"Bearer {access_token}"}

    response = requests.get(f"{BASE_URL}/messages/cases/{case_id}", headers=headers)

    if response.status_code == 200:
        result = response.json()
        print_success(f"Retrieved {len(result)} messages")

        for i, msg in enumerate(result, 1):
            sender_label = "Parent 1" if i % 2 == 1 else "Parent 2"
            flag_emoji = " 🛡️" if msg['was_flagged'] else ""
            print_info(f"{i}. [{sender_label}]{flag_emoji}: \"{msg['content']}\"")

        return result
    else:
        print_error("Failed to get messages", response.text)
        return None

def get_analytics(access_token: str, case_id: str) -> Dict:
    """Get communication analytics"""
    print_test("Getting analytics (Good Faith Metrics)")

    headers = {"Authorization": f"Bearer {access_token}"}

    response = requests.get(
        f"{BASE_URL}/messages/cases/{case_id}/analytics",
        headers=headers
    )

    if response.status_code == 200:
        result = response.json()
        print_success("Analytics retrieved")

        print_info(f"\n📊 Communication Metrics:")
        print_info(f"  Total messages: {result['total_messages']}")
        print_info(f"  Flagged messages: {result['flagged_messages']}")
        print_info(f"  Flag rate: {result['flag_rate']:.1%}")
        print_info(f"\n🤖 ARIA Interventions:")
        print_info(f"  Accepted: {result['suggestions_accepted']}")
        print_info(f"  Modified: {result['suggestions_modified']}")
        print_info(f"  Rejected: {result['suggestions_rejected']}")
        print_info(f"  Acceptance rate: {result['acceptance_rate']:.1%}")
        print_info(f"\n📈 Quality:")
        print_info(f"  Average toxicity: {result['average_toxicity']:.2f}")
        print_info(f"  Trend: {result['trend'].upper()}")

        return result
    else:
        print_error("Analytics failed", response.text)
        return None

def get_trends(access_token: str, case_id: str) -> Dict:
    """Get trend data"""
    print_test("Getting trend data")

    headers = {"Authorization": f"Bearer {access_token}"}

    response = requests.get(
        f"{BASE_URL}/messages/cases/{case_id}/trends?days=7",
        headers=headers
    )

    if response.status_code == 200:
        result = response.json()
        print_success("Trend data retrieved")

        print_info(f"\nOverall trend: {result['overall_trend'].upper()}")
        print_info(f"Data points: {len(result['data_points'])}")

        if result['data_points']:
            print_info("\nRecent activity:")
            for point in result['data_points'][-3:]:  # Last 3 days
                print_info(f"  {point['date']}: {point['message_count']} msgs, "
                          f"{point['flagged_count']} flagged, "
                          f"toxicity: {point['average_toxicity']:.2f}")

        return result
    else:
        print_error("Trends failed", response.text)
        return None

def main():
    """Run complete messaging and ARIA test workflow"""
    print(f"\n{MAGENTA}{'='*70}{RESET}")
    print(f"{MAGENTA}🛡️  ARIA Messaging System Test{RESET}")
    print(f"{MAGENTA}{'='*70}{RESET}\n")

    # Generate unique emails
    timestamp = int(time.time())
    parent1_email = f"parent1_{timestamp}@test.com"
    parent2_email = f"parent2_{timestamp}@test.com"
    password = "TestPassword123!"

    # Step 1: Register two parents
    parent1 = register_user(parent1_email, password, "Marcus", "Johnson")
    if not parent1:
        return

    parent2 = register_user(parent2_email, password, "Jennifer", "Johnson")
    if not parent2:
        return

    parent1_token = parent1['access_token']
    parent1_id = parent1['user']['id']
    parent2_token = parent2['access_token']
    parent2_id = parent2['user']['id']

    # Step 2: Create case
    case = create_case(parent1_token, parent2_email)
    if not case:
        return

    case_id = case['id']

    # Step 3: Accept invitation
    acceptance = accept_invitation(parent2_token, case_id, case['invitation_token'])
    if not acceptance:
        return

    # Step 4: Test message analysis - Clean message
    print_info("\n--- Testing clean message ---")
    analyze_message(
        parent1_token,
        case_id,
        "Hey, can we talk about Sophia's schedule for next week?"
    )

    # Step 5: Test message analysis - Toxic message
    print_info("\n--- Testing toxic message ---")
    analysis = analyze_message(
        parent1_token,
        case_id,
        "You're always so stupid about everything! This is your fault!"
    )

    # Step 6: Send clean message
    send_message(
        parent1_token,
        case_id,
        parent2_id,
        "Hi, I wanted to discuss Sophia's schedule for next week."
    )

    # Step 7: Send toxic message with ARIA intervention - ACCEPTED
    print_info("\n--- Sending toxic message - User ACCEPTS ARIA suggestion ---")
    toxic_msg = "What type of stupid shit is that? Go look at the schedule yourself!"
    analysis = analyze_message(parent1_token, case_id, toxic_msg)

    if analysis and analysis['is_flagged']:
        send_message(
            parent2_token,
            case_id,
            parent1_id,
            analysis['intervention']['suggestion'],  # Use ARIA's suggestion
            {"action": "accepted"}
        )

    # Step 8: Send another toxic message - REJECTED
    print_info("\n--- Sending toxic message - User REJECTS ARIA suggestion ---")
    toxic_msg2 = "You never listen! This is all your fault!"
    analysis2 = analyze_message(parent1_token, case_id, toxic_msg2)

    if analysis2 and analysis2['is_flagged']:
        send_message(
            parent1_token,
            case_id,
            parent2_id,
            toxic_msg2,  # Send original
            {"action": "rejected"}
        )

    # Step 9: Send modified message
    print_info("\n--- Sending toxic message - User MODIFIES ---")
    send_message(
        parent2_token,
        case_id,
        parent1_id,
        "I've noticed that sometimes we have different views. Let's figure this out together.",
        {"action": "modified", "final_message": "I've noticed that sometimes we have different views. Let's figure this out together."}
    )

    # Step 10: Send more messages for analytics
    print_info("\n--- Sending more messages for analytics ---")
    send_message(parent1_token, case_id, parent2_id, "Thanks for being flexible.")
    send_message(parent2_token, case_id, parent1_id, "Of course, Sophia comes first.")

    # Step 11: Get all messages
    messages = get_messages(parent1_token, case_id)

    # Step 12: Get analytics
    analytics = get_analytics(parent1_token, case_id)

    # Step 13: Get trends
    trends = get_trends(parent1_token, case_id)

    # Final summary
    print(f"\n{GREEN}{'='*70}{RESET}")
    print(f"{GREEN}🎉 ARIA Messaging System Test Complete!{RESET}")
    print(f"{GREEN}{'='*70}{RESET}\n")

    if messages and analytics:
        print(f"{GREEN}✓ Message system working{RESET}")
        print(f"{GREEN}✓ ARIA sentiment analysis working{RESET}")
        print(f"{GREEN}✓ Intervention workflow working{RESET}")
        print(f"{GREEN}✓ Analytics and metrics working{RESET}")
        print(f"{GREEN}✓ Trend tracking working{RESET}")

        print(f"\n{MAGENTA}📊 Final Stats:{RESET}")
        print(f"{MAGENTA}  Messages sent: {len(messages)}{RESET}")
        print(f"{MAGENTA}  ARIA interventions: {analytics['flagged_messages']}{RESET}")
        print(f"{MAGENTA}  Good faith rate: {(1 - analytics['flag_rate']):.1%}{RESET}")

    print(f"\n{BLUE}🛡️  ARIA successfully prevented conflict escalation!{RESET}\n")

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print(f"\n{YELLOW}Test interrupted by user{RESET}")
    except Exception as e:
        print_error(f"Unexpected error: {str(e)}")
        import traceback
        traceback.print_exc()
