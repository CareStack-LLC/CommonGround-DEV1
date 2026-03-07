import os
import psycopg2

try:
    # URL with the project ref
    url_with_ref = "postgresql://postgres.mtcdoewgywxrlsogtmzi:XBmAIdMR9TTnZHqV@aws-1-us-east-1.pooler.supabase.com:6543/postgres"
    conn = psycopg2.connect(url_with_ref)
    print("SUCCESS with project ref in username")
    conn.close()
except Exception as e:
    print(f"ERROR with project ref: {e}")

try:
    # URL without the project ref
    url_without_ref = "postgresql://postgres:XBmAIdMR9TTnZHqV@aws-1-us-east-1.pooler.supabase.com:6543/postgres"
    conn = psycopg2.connect(url_without_ref)
    print("SUCCESS without project ref in username")
    conn.close()
except Exception as e:
    print(f"ERROR without project ref: {e}")
