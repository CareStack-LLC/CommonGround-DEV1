"""
Test WebSocket Real-Time Messaging
Tests WebSocket connections, subscriptions, and real-time message delivery.
"""

import asyncio
import websockets
import json
import requests
import time
from typing import Dict

# Configuration
BASE_URL = "http://localhost:8000/api/v1"
WS_URL = "ws://localhost:8000/api/v1/ws"

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


def print_ws_message(prefix: str, message: dict):
    """Print WebSocket message"""
    print(f"{MAGENTA}{prefix}{RESET}")
    print(f"{MAGENTA}{json.dumps(message, indent=2)}{RESET}")


def register_user(email: str, password: str, first_name: str, last_name: str) -> Dict:
    """Register a new user"""
    data = {
        "email": email,
        "password": password,
        "first_name": first_name,
        "last_name": last_name
    }

    response = requests.post(f"{BASE_URL}/auth/register", json=data)

    if response.status_code == 201:
        print_success(f"User {first_name} {last_name} registered")
        return response.json()
    else:
        print_error("Registration failed", response.text)
        return None


def create_case(token: str, parent2_email: str) -> Dict:
    """Create a case and invite other parent"""
    headers = {"Authorization": f"Bearer {token}"}
    data = {
        "case_name": "WebSocket Test Case",
        "other_parent_email": parent2_email,
        "state": "CA",
        "children": [
            {
                "first_name": "Alice",
                "last_name": "Test",
                "date_of_birth": "2018-03-15",
                "gender": "female"
            }
        ]
    }

    response = requests.post(f"{BASE_URL}/cases/", json=data, headers=headers)

    if response.status_code == 201:
        result = response.json()
        print_success(f"Case created: {result['id']}")
        return result
    else:
        print_error("Case creation failed", response.text)
        return None


def accept_invitation(token: str, case_id: str, invitation_token: str) -> bool:
    """Accept case invitation"""
    headers = {"Authorization": f"Bearer {token}"}
    data = {"invitation_token": invitation_token}

    response = requests.post(
        f"{BASE_URL}/cases/{case_id}/accept",
        json=data,
        headers=headers
    )

    if response.status_code == 200:
        print_success("Invitation accepted")
        return True
    else:
        print_error("Invitation acceptance failed", response.text)
        return False


async def websocket_client(user_name: str, token: str, case_id: str, messages_received: list):
    """
    WebSocket client that connects and listens for messages.

    Args:
        user_name: Name for logging
        token: JWT token for authentication
        case_id: Case ID to subscribe to
        messages_received: Shared list to track received messages
    """
    uri = f"{WS_URL}?token={token}"

    try:
        async with websockets.connect(uri) as websocket:
            print_success(f"{user_name} connected to WebSocket")

            # Wait for connection confirmation
            response = await websocket.recv()
            data = json.loads(response)
            print_ws_message(f"[{user_name}] Received:", data)

            if data.get("type") != "status":
                print_error(f"{user_name}: Expected status message")
                return

            # Subscribe to case
            subscribe_msg = {
                "type": "subscribe",
                "case_id": case_id
            }
            await websocket.send(json.dumps(subscribe_msg))
            print_info(f"{user_name} sent subscribe request")

            # Wait for subscription confirmation
            response = await websocket.recv()
            data = json.loads(response)
            print_ws_message(f"[{user_name}] Received:", data)

            if data.get("type") != "status":
                print_error(f"{user_name}: Expected subscription confirmation")
                return

            print_success(f"{user_name} subscribed to case")

            # Listen for messages
            while True:
                try:
                    response = await asyncio.wait_for(websocket.recv(), timeout=15.0)
                    data = json.loads(response)
                    print_ws_message(f"[{user_name}] Received:", data)

                    messages_received.append({
                        "user": user_name,
                        "message": data
                    })

                except asyncio.TimeoutError:
                    # No message in 15 seconds, that's fine
                    break

    except Exception as e:
        print_error(f"{user_name} WebSocket error", str(e))


async def send_typing_indicator(token: str, case_id: str, is_typing: bool):
    """Send a typing indicator via WebSocket"""
    uri = f"{WS_URL}?token={token}"

    try:
        async with websockets.connect(uri) as websocket:
            # Wait for connection
            await websocket.recv()

            # Subscribe first
            await websocket.send(json.dumps({
                "type": "subscribe",
                "case_id": case_id
            }))
            await websocket.recv()

            # Send typing indicator
            await websocket.send(json.dumps({
                "type": "typing",
                "case_id": case_id,
                "is_typing": is_typing
            }))

            print_success(f"Sent typing indicator: {is_typing}")

    except Exception as e:
        print_error("Failed to send typing indicator", str(e))


def send_message_via_http(token: str, case_id: str, recipient_id: str, content: str) -> Dict:
    """Send a message via HTTP API"""
    headers = {"Authorization": f"Bearer {token}"}
    data = {
        "message_data": {
            "case_id": case_id,
            "recipient_id": recipient_id,
            "content": content
        }
    }

    response = requests.post(f"{BASE_URL}/messages/", json=data, headers=headers)

    if response.status_code == 201:
        result = response.json()
        print_success(f"Message sent via HTTP: {result['id']}")
        return result
    else:
        print_error("Message send failed", response.text)
        return None


async def test_real_time_messaging(
    parent1_token: str,
    parent1_id: str,
    parent2_token: str,
    parent2_id: str,
    case_id: str
):
    """Test real-time message delivery via WebSocket"""
    print_test("TEST: Real-Time Message Delivery")

    messages_received = []

    # Start WebSocket clients for both parents
    print_info("Starting WebSocket clients for both parents...")

    # Create tasks for both WebSocket connections
    parent1_task = asyncio.create_task(
        websocket_client("Parent 1", parent1_token, case_id, messages_received)
    )
    parent2_task = asyncio.create_task(
        websocket_client("Parent 2", parent2_token, case_id, messages_received)
    )

    # Wait a bit for connections to establish
    await asyncio.sleep(2)

    # Send a message from parent1 to parent2 via HTTP
    print_info("\nSending message from Parent 1 to Parent 2 via HTTP...")
    send_message_via_http(
        parent1_token,
        case_id,
        parent2_id,
        "Hi! This is a test message sent via HTTP that should appear in real-time via WebSocket."
    )

    # Wait for WebSocket broadcasts
    await asyncio.sleep(2)

    # Send another message from parent2 to parent1
    print_info("\nSending message from Parent 2 to Parent 1 via HTTP...")
    send_message_via_http(
        parent2_token,
        case_id,
        parent1_id,
        "Got it! I received your message in real-time. Replying back!"
    )

    # Wait for broadcasts
    await asyncio.sleep(2)

    # Wait for WebSocket clients to finish (with timeout)
    await asyncio.wait([parent1_task, parent2_task], timeout=5)

    # Cancel tasks if still running
    if not parent1_task.done():
        parent1_task.cancel()
    if not parent2_task.done():
        parent2_task.cancel()

    # Verify messages were received
    print_test("VERIFICATION: Message Delivery")

    message_count = len([m for m in messages_received if m["message"].get("type") == "message"])
    print_info(f"Total messages received via WebSocket: {message_count}")

    if message_count >= 2:
        print_success("✓ Real-time message delivery working!")
        return True
    else:
        print_error("✗ Expected at least 2 messages")
        return False


async def test_typing_indicators(
    parent1_token: str,
    parent2_token: str,
    case_id: str
):
    """Test typing indicators"""
    print_test("TEST: Typing Indicators")

    messages_received = []

    # Start WebSocket for parent2 (listener)
    print_info("Starting WebSocket client for Parent 2 (listener)...")
    parent2_task = asyncio.create_task(
        websocket_client("Parent 2", parent2_token, case_id, messages_received)
    )

    # Wait for connection
    await asyncio.sleep(2)

    # Parent 1 starts typing
    print_info("Parent 1 starts typing...")
    await send_typing_indicator(parent1_token, case_id, True)

    await asyncio.sleep(1)

    # Parent 1 stops typing
    print_info("Parent 1 stops typing...")
    await send_typing_indicator(parent1_token, case_id, False)

    # Wait for messages
    await asyncio.sleep(2)

    # Cancel listener task
    if not parent2_task.done():
        parent2_task.cancel()

    # Verify typing indicators were received
    typing_events = [m for m in messages_received if m["message"].get("type") == "typing"]
    print_info(f"Typing events received: {len(typing_events)}")

    if len(typing_events) >= 1:
        print_success("✓ Typing indicators working!")
        return True
    else:
        print_error("✗ No typing indicators received")
        return False


def main():
    """Run complete WebSocket test suite"""
    print(f"\n{MAGENTA}{'='*70}{RESET}")
    print(f"{MAGENTA}🔌 WebSocket Real-Time Messaging Test Suite{RESET}")
    print(f"{MAGENTA}{'='*70}{RESET}\n")

    # Generate unique emails
    timestamp = int(time.time())
    parent1_email = f"ws_parent1_{timestamp}@test.com"
    parent2_email = f"ws_parent2_{timestamp}@test.com"
    password = "TestPassword123!"

    # Step 1: Register two parents
    print_test("STEP 1: Register Two Parents")
    parent1 = register_user(parent1_email, password, "John", "Smith")
    if not parent1:
        return

    parent2 = register_user(parent2_email, password, "Jane", "Smith")
    if not parent2:
        return

    parent1_token = parent1['access_token']
    parent1_id = parent1['user']['id']
    parent2_token = parent2['access_token']
    parent2_id = parent2['user']['id']

    print_success(f"\n✓ Both parents registered")

    # Step 2: Create case and accept invitation
    print_test("STEP 2: Create Case")
    case = create_case(parent1_token, parent2_email)
    if not case:
        return

    case_id = case['id']
    invitation_token = case['invitation_token']

    print_info("Accepting invitation...")
    if not accept_invitation(parent2_token, case_id, invitation_token):
        return

    # Step 3: Run async tests
    print_test("STEP 3: Running WebSocket Tests")

    loop = asyncio.get_event_loop()

    # Test 1: Real-time messaging
    test1_passed = loop.run_until_complete(
        test_real_time_messaging(
            parent1_token, parent1_id,
            parent2_token, parent2_id,
            case_id
        )
    )

    # Test 2: Typing indicators
    test2_passed = loop.run_until_complete(
        test_typing_indicators(
            parent1_token,
            parent2_token,
            case_id
        )
    )

    # Final summary
    print(f"\n{GREEN}{'='*70}{RESET}")
    print(f"{GREEN}🎉 WebSocket Test Suite Complete!{RESET}")
    print(f"{GREEN}{'='*70}{RESET}\n")

    print(f"{MAGENTA}📊 Test Results:{RESET}")
    print(f"{GREEN if test1_passed else RED}{'✓' if test1_passed else '✗'} Real-time message delivery{RESET}")
    print(f"{GREEN if test2_passed else RED}{'✓' if test2_passed else '✗'} Typing indicators{RESET}")

    if test1_passed and test2_passed:
        print(f"\n{GREEN}✅ All tests passed!{RESET}")
    else:
        print(f"\n{YELLOW}⚠️  Some tests failed{RESET}")

    print(f"\n{BLUE}💡 Next Steps:{RESET}")
    print(f"{BLUE}1. Test with a WebSocket client tool (like wscat){RESET}")
    print(f"{BLUE}2. Build frontend WebSocket integration{RESET}")
    print(f"{BLUE}3. Add reconnection logic for production{RESET}")
    print(f"{BLUE}4. Monitor WebSocket connection metrics{RESET}\n")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print(f"\n{YELLOW}Test interrupted by user{RESET}")
    except Exception as e:
        print_error(f"Unexpected error: {str(e)}")
        import traceback
        traceback.print_exc()
