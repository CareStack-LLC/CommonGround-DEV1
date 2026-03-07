import asyncio
from app.core.config import settings
from supabase import create_client

async def check():
    url = settings.SUPABASE_URL
    service_key = settings.SUPABASE_SERVICE_KEY
    anon_key = settings.SUPABASE_ANON_KEY
    
    admin_client = create_client(url, service_key)
    anon_client = create_client(url, anon_key)
    
    try:
        print("Testing Anon Client...")
        res = anon_client.auth.sign_in_with_password({"email": "mya@email.com", "password": "power123"})
        print("Anon Client SUCCESS")
    except Exception as e:
        print(f"Anon Client ERROR: {e}")
        
    try:
        print("Testing Admin Client...")
        res = admin_client.auth.sign_in_with_password({"email": "mya@email.com", "password": "power123"})
        print("Admin Client SUCCESS")
    except Exception as e:
        print(f"Admin Client ERROR: {e}")

asyncio.run(check())
