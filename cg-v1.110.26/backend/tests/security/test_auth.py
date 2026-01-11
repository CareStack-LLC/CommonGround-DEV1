#!/usr/bin/env python3
"""
Simple script to test authentication endpoints.
"""

import requests
import json

BASE_URL = "http://localhost:8000/api/v1"

def test_register():
    """Test user registration."""
    print("\n=== Testing Registration ===")
    data = {
        "email": "testuser999@gmail.com",
        "password": "TestPassword123!",
        "first_name": "Test",
        "last_name": "User",
        "phone": "+15551234567"
    }

    response = requests.post(f"{BASE_URL}/auth/register", json=data)
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")

    if response.status_code == 201:
        return response.json()
    return None

def test_login(email, password):
    """Test user login."""
    print("\n=== Testing Login ===")
    data = {
        "email": email,
        "password": password
    }

    response = requests.post(f"{BASE_URL}/auth/login", json=data)
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")

    if response.status_code == 200:
        return response.json()
    return None

def test_get_me(access_token):
    """Test getting current user."""
    print("\n=== Testing Get Current User ===")
    headers = {"Authorization": f"Bearer {access_token}"}

    response = requests.get(f"{BASE_URL}/auth/me", headers=headers)
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")

    return response.status_code == 200

def test_refresh_token(refresh_token):
    """Test token refresh."""
    print("\n=== Testing Token Refresh ===")
    data = {"refresh_token": refresh_token}

    response = requests.post(f"{BASE_URL}/auth/refresh", json=data)
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")

    if response.status_code == 200:
        return response.json()
    return None

def test_logout(access_token):
    """Test logout."""
    print("\n=== Testing Logout ===")
    headers = {"Authorization": f"Bearer {access_token}"}

    response = requests.post(f"{BASE_URL}/auth/logout", headers=headers)
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")

    return response.status_code == 200

def main():
    """Run all tests."""
    print("🧪 Testing CommonGround Authentication API")
    print("=" * 50)

    # Test registration
    register_response = test_register()
    if not register_response:
        print("\n❌ Registration failed. Check the server logs.")
        return

    access_token = register_response["access_token"]
    refresh_token = register_response["refresh_token"]
    email = register_response["user"]["email"]

    print(f"\n✅ Registration successful!")
    print(f"Email: {email}")
    print(f"Access Token: {access_token[:50]}...")

    # Test get current user
    if test_get_me(access_token):
        print("\n✅ Get current user successful!")
    else:
        print("\n❌ Get current user failed")

    # Test token refresh
    refresh_response = test_refresh_token(refresh_token)
    if refresh_response:
        print("\n✅ Token refresh successful!")
        new_access_token = refresh_response["access_token"]
    else:
        print("\n❌ Token refresh failed")
        new_access_token = access_token

    # Test logout
    if test_logout(new_access_token):
        print("\n✅ Logout successful!")
    else:
        print("\n❌ Logout failed")

    # Test login with existing credentials
    login_response = test_login(email, "TestPassword123!")
    if login_response:
        print("\n✅ Login successful!")
    else:
        print("\n❌ Login failed")

    print("\n" + "=" * 50)
    print("🎉 All tests completed!")

if __name__ == "__main__":
    main()
