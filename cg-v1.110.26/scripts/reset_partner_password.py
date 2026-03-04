import os
import sys
import asyncio
from supabase import create_client, Client

# Add backend directory to path to import config if needed, 
# but for this script we'll try to rely on env vars directly
sys.path.append(os.path.join(os.path.dirname(__file__), '../backend'))

async def reset_password():
    url: str = os.environ.get("SUPABASE_URL")
    key: str = os.environ.get("SUPABASE_SERVICE_KEY")
    
    if not url or not key:
        print("Error: SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in environment")
        return

    print(f"Connecting to Supabase at {url}...")
    supabase: Client = create_client(url, key)

    email = "ff-admin@foreverforward.org"
    new_password = "Demo2026!"

    print(f"Attempting to reset password for {email}...")

    try:
        # Use the admin auth api to update the user
        # Note: supabase-py v2+ uses auth.admin
        attributes = {"password": new_password, "user_metadata": {"first_name": "Forever Forward", "last_name": "Admin"}}
        
        # First, try to get the user by email to confirm existence
        # The python client might not have a direct 'get_user_by_email' in all versions
        # so we'll try to update directly.
        
        # update_user_by_id requires ID, so let's list/search first if possible
        # Or simpler: Is there a create_user that returns existing? 
        # For simplicity in this environment, let's try to update by email if supported, 
        # or list users to find ID.
        
        # List users to find the ID
        response = supabase.auth.admin.list_users()
        user_id = None
        for user in response:
            if user.email == email:
                user_id = user.id
                break
        
        if not user_id:
            print(f"User {email} not found. Creating user...")
            # Create user
            response = supabase.auth.admin.create_user({
                "email": email,
                "password": new_password,
                "email_confirm": True,
                "user_metadata": {"first_name": "Forever Forward", "last_name": "Admin"}
            })
            print(f"User created with ID: {response.user.id}")
        else:
            print(f"User found with ID: {user_id}. Updating password...")
            response = supabase.auth.admin.update_user_by_id(
                user_id,
                attributes
            )
            print("Password updated successfully.")

    except Exception as e:
        print(f"An error occurred: {str(e)}")

if __name__ == "__main__":
    asyncio.run(reset_password())
