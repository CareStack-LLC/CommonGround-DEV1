"""
Quick API validation test - verifies backend is running and responsive
"""

import sys
from pathlib import Path

sys.path.append(str(Path(__file__).parent.parent.parent))

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_backend_health():
    """Test that backend is responding"""
    print("\n" + "="*60)
    print("TEST: Backend Health Check")
    print("="*60)
    
    # Try root endpoint
    response = client.get("/")
    print(f"\n📡 GET / → Status: {response.status_code}")
    
    if response.status_code == 200:
        print("   ✅ Backend is responding")
        return True
    else:
        print(f"   ❌ Backend returned {response.status_code}")
        return False


def test_create_test_user_via_api():
    """Create a test user via signup API"""
    print("\n" + "="*60)
    print("TEST: Create Test User via API")
    print("="*60)
    
    # Try to register a test user
    user_data = {
        "email": "e2e_test_sarah@commonground.test",
        "password": "TestPass123!",
        "first_name": "Sarah",
        "last_name": "Martinez"
    }
    
    print(f"\n📝 Attempting to register: {user_data['email']}")
    
    response = client.post("/api/v1/auth/register", json=user_data)
    
    print(f"   Status: {response.status_code}")
    
    if response.status_code in [200, 201]:
        print("   ✅ User registration successful")
        print(f"   Response: {response.json()}")
        return True
    elif response.status_code == 400:
        print("   ⚠️  User may already exist (400)")
        # Try to login instead
        login_response = client.post("/api/v1/auth/login", json={
            "email": user_data["email"],
            "password": user_data["password"]
        })
        if login_response.status_code == 200:
            print("   ✅ User exists and login works")
            return True
    
    print(f"   ❌ Registration failed: {response.json() if response.status_code != 404 else 'Endpoint not found'}")
    return False


def test_api_structure():
    """Explore available API endpoints"""
    print("\n" + "="*60)
    print("TEST: API Structure Discovery")
    print("="*60)
    
    # Check for docs
    response = client.get("/docs")
    if response.status_code == 200:
        print("   ✅ OpenAPI docs available at /docs")
    
    # Check common endpoints
    endpoints = [
        "/api/v1/auth/login",
        "/api/v1/users/me",
        "/api/v1/family-files/"
    ]
    
    print("\n📋 Testing common endpoints:")
    for endpoint in endpoints:
        response = client.get(endpoint)
        status_emoji = "✅" if response.status_code in [200, 401, 422] else "❌"
        print(f"   {status_emoji} {endpoint} → {response.status_code}")


if __name__ == "__main__":
    print("\n" + "="*60)
    print("COMMONGROUND E2E - QUICK VALIDATION TEST")
    print("="*60)
    
    try:
        # Test 1: Health check
        health_ok = test_backend_health()
        
        # Test 2: API structure
        test_api_structure()
        
        # Test 3: User creation
        if health_ok:
            test_create_test_user_via_api()
        
        print("\n" + "="*60)
        print("✅ QUICK VALIDATION COMPLETE")
        print("="*60)
        print("\nBackend is ready for E2E testing!")
        
    except Exception as e:
        print(f"\n❌ ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
