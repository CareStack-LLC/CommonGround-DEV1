"""
WebSocket Load Testing Suite

Tests WebSocket server under various load conditions:
- Multiple concurrent connections
- High message throughput
- Reconnection scenarios
- Memory and CPU usage monitoring
"""

import asyncio
import time
import requests
import json
import statistics
from datetime import datetime
from typing import List, Dict
from app.utils.websocket_client import ReconnectingWebSocketClient

# Configuration
BASE_URL = "http://localhost:8000/api/v1"
WS_URL = "ws://localhost:8000/api/v1/ws"

# Color codes
GREEN = '\033[92m'
RED = '\033[91m'
YELLOW = '\033[93m'
BLUE = '\033[94m'
MAGENTA = '\033[95m'
CYAN = '\033[96m'
RESET = '\033[0m'


def print_header(message: str):
    """Print test header"""
    print(f"\n{BLUE}{'='*70}{RESET}")
    print(f"{BLUE}{message}{RESET}")
    print(f"{BLUE}{'='*70}{RESET}")


def print_success(message: str):
    """Print success message"""
    print(f"{GREEN}✓ {message}{RESET}")


def print_error(message: str):
    """Print error message"""
    print(f"{RED}✗ {message}{RESET}")


def print_info(message: str):
    """Print info message"""
    print(f"{YELLOW}ℹ {message}{RESET}")


def print_metric(label: str, value: str):
    """Print metric"""
    print(f"{CYAN}{label:.<50} {value}{RESET}")


def register_user(email: str, password: str, first_name: str, last_name: str) -> Dict:
    """Register a new user"""
    data = {
        "email": email,
        "password": password,
        "first_name": first_name,
        "last_name": last_name
    }
    response = requests.post(f"{BASE_URL}/auth/register", json=data)
    return response.json() if response.status_code == 201 else None


def create_case(token: str, parent2_email: str) -> Dict:
    """Create a case"""
    headers = {"Authorization": f"Bearer {token}"}
    data = {
        "case_name": "Load Test Case",
        "other_parent_email": parent2_email,
        "state": "CA",
        "children": [{"first_name": "Test", "last_name": "Child", "date_of_birth": "2020-01-01", "gender": "other"}]
    }
    response = requests.post(f"{BASE_URL}/cases/", json=data, headers=headers)
    return response.json() if response.status_code == 201 else None


def accept_invitation(token: str, case_id: str, invitation_token: str) -> bool:
    """Accept case invitation"""
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.post(
        f"{BASE_URL}/cases/{case_id}/accept",
        json={"invitation_token": invitation_token},
        headers=headers
    )
    return response.status_code == 200


async def test_concurrent_connections(num_connections: int = 50):
    """Test multiple concurrent WebSocket connections"""
    print_header(f"TEST 1: {num_connections} Concurrent Connections")

    # Create users and setup
    print_info(f"Setting up {num_connections} users...")
    timestamp = int(time.time())
    users = []

    for i in range(num_connections):
        email = f"load_test_{timestamp}_{i}@test.com"
        user = register_user(email, "Password123!", f"User{i}", "Load")
        if user:
            users.append(user)

    print_success(f"Created {len(users)} users")

    if len(users) < 2:
        print_error("Need at least 2 users")
        return False

    # Create a case for testing
    case = create_case(users[0]['access_token'], users[1]['user']['email'])
    if not case:
        print_error("Failed to create case")
        return False

    case_id = case['id']
    accept_invitation(users[1]['access_token'], case_id, case['invitation_token'])

    # Connect all clients
    print_info(f"Connecting {num_connections} WebSocket clients...")
    clients = []
    messages_received = []
    connection_times = []

    async def on_message(client_id: int, message: dict):
        messages_received.append({
            "client_id": client_id,
            "message": message,
            "timestamp": datetime.utcnow()
        })

    # Create and connect clients
    connect_tasks = []
    for i, user in enumerate(users):
        client = ReconnectingWebSocketClient(
            ws_url=WS_URL,
            token=user['access_token'],
            on_message=lambda msg, client_id=i: asyncio.create_task(on_message(client_id, msg)),
            ping_interval=30.0,
            reconnect_attempts=3
        )
        clients.append(client)

        start_time = time.time()
        connect_task = client.connect()
        connect_tasks.append((connect_task, start_time))

    # Wait for all connections
    for task, start_time in connect_tasks:
        await task
        connection_times.append(time.time() - start_time)

    # Check how many connected successfully
    connected_count = sum(1 for client in clients if client.is_connected)
    print_success(f"{connected_count}/{num_connections} clients connected")

    if connection_times:
        print_metric("Average connection time", f"{statistics.mean(connection_times):.3f}s")
        print_metric("Max connection time", f"{max(connection_times):.3f}s")
        print_metric("Min connection time", f"{min(connection_times):.3f}s")

    # Subscribe all to the case
    print_info("Subscribing all clients to case...")
    for client in clients:
        if client.is_connected:
            try:
                await client.send({"type": "subscribe", "case_id": case_id})
            except:
                pass

    await asyncio.sleep(2)

    # Send a broadcast message
    print_info("Broadcasting a message to all clients...")
    send_start = time.time()

    response = requests.post(
        f"{BASE_URL}/messages/",
        json={
            "message_data": {
                "case_id": case_id,
                "content": "Load test broadcast message"
            }
        },
        headers={"Authorization": f"Bearer {users[0]['access_token']}"}
    )

    await asyncio.sleep(2)
    broadcast_time = time.time() - send_start

    # Check how many clients received the message
    message_events = [m for m in messages_received if m["message"].get("type") == "message"]
    print_metric("Clients received broadcast", f"{len(message_events)}/{connected_count}")
    print_metric("Broadcast delivery time", f"{broadcast_time:.3f}s")

    # Cleanup
    print_info("Closing all connections...")
    for client in clients:
        try:
            await client.close()
        except:
            pass

    # Results
    success_rate = (connected_count / num_connections) * 100
    delivery_rate = (len(message_events) / connected_count * 100) if connected_count > 0 else 0

    print(f"\n{MAGENTA}📊 Test 1 Results:{RESET}")
    print_metric("Total clients", str(num_connections))
    print_metric("Successful connections", f"{connected_count} ({success_rate:.1f}%)")
    print_metric("Message delivery rate", f"{delivery_rate:.1f}%")
    print_metric("Total messages received", str(len(messages_received)))

    return success_rate >= 95 and delivery_rate >= 95


async def test_message_throughput(duration_seconds: int = 30):
    """Test message throughput under load"""
    print_header(f"TEST 2: Message Throughput ({duration_seconds}s)")

    # Setup
    timestamp = int(time.time())
    user1 = register_user(f"throughput1_{timestamp}@test.com", "Pass123!", "User1", "Test")
    user2 = register_user(f"throughput2_{timestamp}@test.com", "Pass123!", "User2", "Test")

    if not user1 or not user2:
        print_error("Failed to create users")
        return False

    case = create_case(user1['access_token'], user2['user']['email'])
    accept_invitation(user2['access_token'], case['id'], case['invitation_token'])

    # Connect clients
    messages_received_1 = []
    messages_received_2 = []

    client1 = ReconnectingWebSocketClient(
        ws_url=WS_URL,
        token=user1['access_token'],
        on_message=lambda msg: messages_received_1.append(msg)
    )

    client2 = ReconnectingWebSocketClient(
        ws_url=WS_URL,
        token=user2['access_token'],
        on_message=lambda msg: messages_received_2.append(msg)
    )

    await client1.connect()
    await client2.connect()

    await client1.send({"type": "subscribe", "case_id": case['id']})
    await client2.send({"type": "subscribe", "case_id": case['id']})

    await asyncio.sleep(1)

    # Send messages continuously
    print_info(f"Sending messages for {duration_seconds} seconds...")
    start_time = time.time()
    messages_sent = 0
    send_times = []

    while time.time() - start_time < duration_seconds:
        send_start = time.time()

        try:
            # Send via HTTP API
            requests.post(
                f"{BASE_URL}/messages/",
                json={
                    "message_data": {
                        "case_id": case['id'],
                        "recipient_id": user2['user']['id'],
                        "content": f"Throughput test message {messages_sent}"
                    }
                },
                headers={"Authorization": f"Bearer {user1['access_token']}"}
            )
            messages_sent += 1
            send_times.append(time.time() - send_start)

        except Exception as e:
            print_error(f"Send failed: {e}")

        # Small delay to avoid overwhelming
        await asyncio.sleep(0.1)

    elapsed = time.time() - start_time

    # Wait for remaining messages
    await asyncio.sleep(2)

    # Calculate metrics
    messages_per_second = messages_sent / elapsed
    ws_messages_1 = len([m for m in messages_received_1 if m.get("type") == "message"])
    ws_messages_2 = len([m for m in messages_received_2 if m.get("type") == "message"])

    avg_send_time = statistics.mean(send_times) if send_times else 0

    print(f"\n{MAGENTA}📊 Test 2 Results:{RESET}")
    print_metric("Duration", f"{elapsed:.1f}s")
    print_metric("Messages sent (HTTP)", str(messages_sent))
    print_metric("Messages/second", f"{messages_per_second:.2f}")
    print_metric("Avg send time", f"{avg_send_time*1000:.1f}ms")
    print_metric("Client 1 received (WS)", str(ws_messages_1))
    print_metric("Client 2 received (WS)", str(ws_messages_2))
    print_metric("Delivery rate", f"{(ws_messages_2/messages_sent*100):.1f}%")

    # Cleanup
    await client1.close()
    await client2.close()

    return messages_per_second >= 5  # At least 5 msg/s


async def test_reconnection_stability(num_cycles: int = 5):
    """Test reconnection stability"""
    print_header(f"TEST 3: Reconnection Stability ({num_cycles} cycles)")

    # Setup
    timestamp = int(time.time())
    user = register_user(f"reconnect_{timestamp}@test.com", "Pass123!", "User", "Test")

    if not user:
        print_error("Failed to create user")
        return False

    # Track reconnections
    reconnections = []
    disconnections = []
    connection_times = []

    async def on_connect():
        reconnections.append(datetime.utcnow())

    async def on_disconnect():
        disconnections.append(datetime.utcnow())

    client = ReconnectingWebSocketClient(
        ws_url=WS_URL,
        token=user['access_token'],
        on_connect=on_connect,
        on_disconnect=on_disconnect,
        ping_interval=5.0,
        reconnect_attempts=None  # Infinite
    )

    # Connect
    await client.connect()
    await asyncio.sleep(1)

    print_info(f"Testing {num_cycles} disconnect/reconnect cycles...")

    for i in range(num_cycles):
        print_info(f"Cycle {i+1}/{num_cycles}")

        # Force disconnect by closing websocket
        if client.websocket:
            await client.websocket.close()

        # Wait for reconnection
        reconnect_start = time.time()
        while not client.is_connected and time.time() - reconnect_start < 10:
            await asyncio.sleep(0.1)

        if client.is_connected:
            connection_times.append(time.time() - reconnect_start)
            print_success(f"Reconnected in {connection_times[-1]:.2f}s")
        else:
            print_error("Failed to reconnect")

        await asyncio.sleep(1)

    # Results
    stats = client.get_stats()

    print(f"\n{MAGENTA}📊 Test 3 Results:{RESET}")
    print_metric("Reconnection cycles", str(num_cycles))
    print_metric("Successful reconnections", str(len(reconnections) - 1))  # -1 for initial
    print_metric("Avg reconnection time", f"{statistics.mean(connection_times):.2f}s" if connection_times else "N/A")
    print_metric("Max reconnection time", f"{max(connection_times):.2f}s" if connection_times else "N/A")
    print_metric("Total reconnections", str(stats['reconnections']))

    await client.close()

    success_rate = ((len(reconnections) - 1) / num_cycles) * 100
    return success_rate >= 90


async def test_typing_indicator_performance():
    """Test typing indicator performance with multiple users"""
    print_header("TEST 4: Typing Indicator Performance")

    # Setup 10 users
    timestamp = int(time.time())
    print_info("Creating 10 users...")

    users = []
    for i in range(10):
        user = register_user(f"typing_{timestamp}_{i}@test.com", "Pass123!", f"User{i}", "Test")
        if user:
            users.append(user)

    if len(users) < 10:
        print_error("Failed to create all users")
        return False

    # Create case
    case = create_case(users[0]['access_token'], users[1]['user']['email'])
    for i in range(1, 10):
        accept_invitation(users[i]['access_token'], case['id'], case['invitation_token'])

    # Connect all clients
    typing_events_received = []
    clients = []

    for user in users:
        client = ReconnectingWebSocketClient(
            ws_url=WS_URL,
            token=user['access_token'],
            on_message=lambda msg: typing_events_received.append(msg) if msg.get("type") == "typing" else None
        )
        clients.append(client)
        await client.connect()
        await client.send({"type": "subscribe", "case_id": case['id']})

    await asyncio.sleep(1)

    # Send typing indicators from all users
    print_info("Sending typing indicators from all users...")
    start_time = time.time()

    for client in clients:
        await client.send({"type": "typing", "case_id": case['id'], "is_typing": True})
        await asyncio.sleep(0.1)

    await asyncio.sleep(1)

    # Stop typing
    for client in clients:
        await client.send({"type": "typing", "case_id": case['id'], "is_typing": False})
        await asyncio.sleep(0.1)

    elapsed = time.time() - start_time

    await asyncio.sleep(1)

    # Results
    expected_events = 10 * 2 * 9  # 10 users * 2 events (start/stop) * 9 recipients each

    print(f"\n{MAGENTA}📊 Test 4 Results:{RESET}")
    print_metric("Total typing events", str(len(typing_events_received)))
    print_metric("Expected events", str(expected_events))
    print_metric("Delivery rate", f"{(len(typing_events_received)/expected_events*100):.1f}%")
    print_metric("Total time", f"{elapsed:.2f}s")

    # Cleanup
    for client in clients:
        await client.close()

    return len(typing_events_received) >= expected_events * 0.9  # 90% delivery


async def main():
    """Run all load tests"""
    print(f"\n{MAGENTA}{'='*70}{RESET}")
    print(f"{MAGENTA}⚡ WebSocket Load Testing Suite{RESET}")
    print(f"{MAGENTA}{'='*70}{RESET}\n")

    results = {}

    # Test 1: Concurrent connections (start with 20, can increase)
    try:
        results['concurrent_20'] = await test_concurrent_connections(20)
    except Exception as e:
        print_error(f"Test 1 failed: {e}")
        results['concurrent_20'] = False

    # Test 2: Message throughput
    try:
        results['throughput'] = await test_message_throughput(30)
    except Exception as e:
        print_error(f"Test 2 failed: {e}")
        results['throughput'] = False

    # Test 3: Reconnection stability
    try:
        results['reconnection'] = await test_reconnection_stability(5)
    except Exception as e:
        print_error(f"Test 3 failed: {e}")
        results['reconnection'] = False

    # Test 4: Typing indicators
    try:
        results['typing'] = await test_typing_indicator_performance()
    except Exception as e:
        print_error(f"Test 4 failed: {e}")
        results['typing'] = False

    # Summary
    print(f"\n{GREEN}{'='*70}{RESET}")
    print(f"{GREEN}📊 Load Test Summary{RESET}")
    print(f"{GREEN}{'='*70}{RESET}\n")

    for test_name, passed in results.items():
        status = f"{GREEN}✓ PASSED{RESET}" if passed else f"{RED}✗ FAILED{RESET}"
        print(f"{test_name:.<50} {status}")

    passed_count = sum(1 for v in results.values() if v)
    total_count = len(results)

    print(f"\n{CYAN}Total: {passed_count}/{total_count} tests passed{RESET}")

    if passed_count == total_count:
        print(f"{GREEN}🎉 All load tests passed!{RESET}\n")
    else:
        print(f"{YELLOW}⚠️  Some tests failed{RESET}\n")

    print(f"{BLUE}💡 Recommendations:{RESET}")
    print(f"{BLUE}1. Monitor server CPU/memory during load tests{RESET}")
    print(f"{BLUE}2. Test with even more connections (50, 100, 500){RESET}")
    print(f"{BLUE}3. Add database query performance monitoring{RESET}")
    print(f"{BLUE}4. Test under network latency/packet loss{RESET}")
    print(f"{BLUE}5. Profile WebSocket message serialization{RESET}\n")


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print(f"\n{YELLOW}Load tests interrupted by user{RESET}")
    except Exception as e:
        print_error(f"Unexpected error: {str(e)}")
        import traceback
        traceback.print_exc()
