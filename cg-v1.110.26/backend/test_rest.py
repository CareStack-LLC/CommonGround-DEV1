import requests
from app.core.config import settings
import json

def test():
    print(f"URL: {settings.SUPABASE_URL}")
    print(f"KEY START: {settings.SUPABASE_ANON_KEY[:10]}...")
    
    headers = {
        "apikey": settings.SUPABASE_ANON_KEY,
        "Authorization": f"Bearer {settings.SUPABASE_ANON_KEY}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "email": "mya@email.com",
        "password": "power123"
    }
    
    url = f"{settings.SUPABASE_URL}/auth/v1/token?grant_type=password"
    print(f"Requesting: {url}")
    
    res = requests.post(url, headers=headers, json=payload)
    print(f"STATUS: {res.status_code}")
    print(f"RESPONSE: {res.text}")

test()
