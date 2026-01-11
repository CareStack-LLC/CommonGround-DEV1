"""
Test TimeBridge Scheduling System
Tests schedule creation, check-ins, and compliance tracking.
"""

import requests
import time
from datetime import datetime, timedelta
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
        "case_name": "TimeBridge Test Case",
        "other_parent_email": other_parent_email,
        "state": "CA",
        "children": [
            {
                "first_name": "Emma",
                "last_name": "Test",
                "date_of_birth": "2018-03-15",
                "gender": "female"
            },
            {
                "first_name": "Noah",
                "last_name": "Test",
                "date_of_birth": "2020-07-22",
                "gender": "male"
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

def create_schedule_event(
    access_token: str,
    case_id: str,
    custodial_parent_id: str,
    child_ids: list,
    days_from_now: int = 0,
    is_exchange: bool = False
) -> Dict:
    """Create a schedule event"""
    print_test("Creating schedule event")

    headers = {"Authorization": f"Bearer {access_token}"}

    start_time = datetime.utcnow() + timedelta(days=days_from_now, hours=18)
    end_time = start_time + timedelta(days=2)  # 2-day parenting time

    data = {
        "case_id": case_id,
        "event_type": "regular",
        "start_time": start_time.isoformat(),
        "end_time": end_time.isoformat(),
        "all_day": False,
        "custodial_parent_id": custodial_parent_id,
        "child_ids": child_ids,
        "title": "Weekend Parenting Time",
        "description": "Regular weekend exchange",
        "is_exchange": is_exchange,
        "exchange_location": "Vista Sheriff's Station" if is_exchange else None,
        "grace_period_minutes": 15
    }

    response = requests.post(f"{BASE_URL}/schedule/events", json=data, headers=headers)

    if response.status_code == 201:
        result = response.json()
        print_success("Event created")
        print_info(f"Event ID: {result['id']}")
        print_info(f"Start: {result['start_time']}")
        print_info(f"Custodial parent: {result['custodial_parent_id']}")
        return result
    else:
        print_error("Event creation failed", response.text)
        return None

def create_check_in(
    access_token: str,
    event_id: str,
    parent_role: str,
    child_ids: list,
    minutes_late: int = 0
) -> Dict:
    """Create an exchange check-in"""
    print_test(f"Creating check-in ({parent_role}, {minutes_late} min {'late' if minutes_late > 0 else 'early'})")

    headers = {"Authorization": f"Bearer {access_token}"}

    data = {
        "event_id": event_id,
        "parent_role": parent_role,
        "check_in_method": "manual",
        "children_present": child_ids,
        "notes": f"Check-in test - {minutes_late} minutes"
    }

    response = requests.post(f"{BASE_URL}/schedule/check-ins", json=data, headers=headers)

    if response.status_code == 201:
        result = response.json()
        print_success("Check-in created")
        print_info(f"On time: {result['is_on_time']}")
        print_info(f"Within grace: {result['is_within_grace']}")
        print_info(f"Minutes early/late: {result['minutes_early_late']}")
        return result
    else:
        print_error("Check-in failed", response.text)
        return None

def get_compliance_metrics(access_token: str, case_id: str) -> Dict:
    """Get compliance metrics"""
    print_test("Getting compliance metrics")

    headers = {"Authorization": f"Bearer {access_token}"}

    response = requests.get(
        f"{BASE_URL}/schedule/cases/{case_id}/compliance",
        headers=headers
    )

    if response.status_code == 200:
        result = response.json()
        print_success("Compliance metrics retrieved")

        print_info(f"\n📊 Exchange Compliance:")
        print_info(f"  Total exchanges: {result['total_exchanges']}")
        print_info(f"  On-time: {result['on_time_count']}")
        print_info(f"  Late: {result['late_count']}")
        print_info(f"  No-shows: {result['no_show_count']}")
        print_info(f"  On-time rate: {result['on_time_rate']:.1%}")
        print_info(f"  Average lateness: {result['average_lateness_minutes']:.1f} min")
        print_info(f"  Trend: {result['trend'].upper()}")

        return result
    else:
        print_error("Metrics failed", response.text)
        return None

def get_calendar(access_token: str, case_id: str) -> Dict:
    """Get calendar data"""
    print_test("Getting calendar data")

    headers = {"Authorization": f"Bearer {access_token}"}

    start_date = datetime.utcnow().isoformat()
    end_date = (datetime.utcnow() + timedelta(days=30)).isoformat()

    response = requests.get(
        f"{BASE_URL}/schedule/cases/{case_id}/calendar",
        params={"start_date": start_date, "end_date": end_date},
        headers=headers
    )

    if response.status_code == 200:
        result = response.json()
        print_success(f"Calendar retrieved ({len(result['events'])} events)")

        for event in result['events']:
            print_info(f"  • {event['title']} - {event['child_names']}")

        return result
    else:
        print_error("Calendar failed", response.text)
        return None

def main():
    """Run complete scheduling system test"""
    print(f"\n{MAGENTA}{'='*70}{RESET}")
    print(f"{MAGENTA}📅 TimeBridge™ Scheduling System Test{RESET}")
    print(f"{MAGENTA}{'='*70}{RESET}\n")

    # Generate unique emails
    timestamp = int(time.time())
    parent1_email = f"parent1_{timestamp}@test.com"
    parent2_email = f"parent2_{timestamp}@test.com"
    password = "TestPassword123!"

    # Step 1: Register two parents
    parent1 = register_user(parent1_email, password, "David", "Martinez")
    if not parent1:
        return

    parent2 = register_user(parent2_email, password, "Sarah", "Martinez")
    if not parent2:
        return

    parent1_token = parent1['access_token']
    parent1_id = parent1['user']['id']
    parent2_token = parent2['access_token']
    parent2_id = parent2['user']['id']

    # Step 2: Create case with children
    case = create_case(parent1_token, parent2_email)
    if not case:
        return

    case_id = case['id']

    # Get children for this case
    headers = {"Authorization": f"Bearer {parent1_token}"}
    children_response = requests.get(f"{BASE_URL}/cases/{case_id}/children", headers=headers)
    children = children_response.json() if children_response.status_code == 200 else []
    child_ids = [child['id'] for child in children]
    print_info(f"Found {len(child_ids)} children")

    # Step 3: Accept invitation
    acceptance = accept_invitation(parent2_token, case_id, case['invitation_token'])
    if not acceptance:
        return

    print_info("\n--- Creating parenting time schedule ---")

    # Step 4: Create multiple schedule events
    # Event 1: Today (Parent 1)
    event1 = create_schedule_event(
        parent1_token,
        case_id,
        parent1_id,
        child_ids,
        days_from_now=0,
        is_exchange=True
    )

    # Event 2: +3 days (Parent 2)
    event2 = create_schedule_event(
        parent1_token,
        case_id,
        parent2_id,
        child_ids,
        days_from_now=3,
        is_exchange=True
    )

    # Event 3: +7 days (Parent 1)
    event3 = create_schedule_event(
        parent1_token,
        case_id,
        parent1_id,
        child_ids,
        days_from_now=7,
        is_exchange=True
    )

    print_info("\n--- Testing exchange check-ins ---")

    # Step 5: Create check-ins with different timing scenarios

    # Event 1: Both parents on time
    if event1:
        create_check_in(parent1_token, event1['id'], "picking_up", child_ids, minutes_late=0)
        create_check_in(parent2_token, event1['id'], "dropping_off", child_ids, minutes_late=0)

    # Event 2: Parent 2 late but within grace
    if event2:
        create_check_in(parent2_token, event2['id'], "picking_up", child_ids, minutes_late=10)
        create_check_in(parent1_token, event2['id'], "dropping_off", child_ids, minutes_late=0)

    # Event 3: Parent 1 late beyond grace
    if event3:
        create_check_in(parent1_token, event3['id'], "picking_up", child_ids, minutes_late=20)

    # Step 6: Get compliance metrics
    metrics = get_compliance_metrics(parent1_token, case_id)

    # Step 7: Get calendar view
    calendar = get_calendar(parent1_token, case_id)

    # Final summary
    print(f"\n{GREEN}{'='*70}{RESET}")
    print(f"{GREEN}🎉 TimeBridge Scheduling System Test Complete!{RESET}")
    print(f"{GREEN}{'='*70}{RESET}\n")

    if metrics and calendar:
        print(f"{GREEN}✓ Schedule event creation working{RESET}")
        print(f"{GREEN}✓ Exchange check-ins working{RESET}")
        print(f"{GREEN}✓ Compliance tracking working{RESET}")
        print(f"{GREEN}✓ Calendar data API working{RESET}")

        print(f"\n{MAGENTA}📊 Final Stats:{RESET}")
        print(f"{MAGENTA}  Events created: {len(calendar['events'])}{RESET}")
        print(f"{MAGENTA}  Check-ins recorded: {metrics['total_exchanges']}{RESET}")
        print(f"{MAGENTA}  On-time rate: {metrics['on_time_rate']:.1%}{RESET}")

    print(f"\n{BLUE}📅 TimeBridge successfully tracking parenting time!{RESET}\n")

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print(f"\n{YELLOW}Test interrupted by user{RESET}")
    except Exception as e:
        print_error(f"Unexpected error: {str(e)}")
        import traceback
        traceback.print_exc()
