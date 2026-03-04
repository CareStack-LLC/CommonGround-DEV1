
import asyncio
import sys
import os
import uuid
from datetime import datetime, timedelta
from sqlalchemy import text

# Add backend directory to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../../')))

from app.core.database import get_db_context
from app.services.custody_exchange import CustodyExchangeService

async def verify_exchange_history():
    async with get_db_context() as db:
        print("Setting up test data via Raw SQL...")
        
        # IDs
        case_id = str(uuid.uuid4())
        user_id = str(uuid.uuid4()) # We'll create a dummy user ID, checking if we need a real user row
        # Real user row is needed if constraints exist.
        # Let's try to fetch a real user ID first.
        result = await db.execute(text("SELECT id FROM users LIMIT 1"))
        user_row = result.fetchone()
        if user_row:
            user_id = user_row[0]
            print(f"Using existing user {user_id}")
        else:
            # Create a user if none exists (might fail if we don't satisfy all constraints)
            # but usually there is at least one user.
            print("No users found! Cannot proceed safely without knowing user schema.")
            return

        exchange_id = str(uuid.uuid4())
        past_inst_id = str(uuid.uuid4())
        future_inst_id = str(uuid.uuid4())
        participant_id = str(uuid.uuid4())

        # 1. Insert Case (minimal fields)
        try:
            # We don't populate schedule_events so it doesn't matter if table missing
            await db.execute(text("""
                INSERT INTO cases (id, case_name, state, status, created_at, updated_at, require_joint_approval, allow_modifications, aria_enabled, aria_provider, activation_status)
                VALUES (:id, :name, :state, 'active', NOW(), NOW(), true, true, true, 'claude', 'pending')
            """), {"id": case_id, "name": "Raw SQL Test Case", "state": "CA"})
        except Exception as e:
            print(f"Error inserting case: {e}")
            await db.rollback()
            return

        # 2. Insert Participant
        try:
            await db.execute(text("""
                INSERT INTO case_participants (id, case_id, user_id, role, parent_type, is_active, created_at, updated_at, can_view_financials, can_view_messages, can_modify_agreement, can_invite_legal_access)
                VALUES (:id, :case_id, :user_id, 'petitioner', 'parent_a', true, NOW(), NOW(), true, true, true, true)
            """), {"id": participant_id, "case_id": case_id, "user_id": user_id})
        except Exception as e:
            print(f"Error inserting participant (maybe duplicate): {e}")
            await db.rollback()

        # 3. Insert Exchange
        try:
            await db.execute(text("""
                INSERT INTO custody_exchanges (
                    id, case_id, created_by, exchange_type, title, scheduled_time, status, created_at, updated_at, 
                    child_ids, pickup_child_ids, dropoff_child_ids, duration_minutes, is_recurring, notes_visible_to_coparent
                )
                VALUES (
                    :id, :case_id, :user_id, 'pickup', 'Raw Test Exchange', NOW(), 'active', NOW(), NOW(), 
                    '[]', '[]', '[]', 30, false, true
                )
            """), {"id": exchange_id, "case_id": case_id, "user_id": user_id})
        except Exception as e:
            print(f"Error inserting exchange: {e}")
            await db.rollback()
            return

        # 4. Insert Instances
        past_date = datetime.utcnow() - timedelta(days=5)
        future_date = datetime.utcnow() + timedelta(days=5)
        
        try:
            await db.execute(text("""
                INSERT INTO custody_exchange_instances (
                    id, exchange_id, scheduled_time, status, created_at, updated_at, from_parent_checked_in, to_parent_checked_in, auto_closed
                )
                VALUES (:id, :exch_id, :time, 'completed', NOW(), NOW(), false, false, false)
            """), {"id": past_inst_id, "exch_id": exchange_id, "time": past_date})

            await db.execute(text("""
                INSERT INTO custody_exchange_instances (
                    id, exchange_id, scheduled_time, status, created_at, updated_at, from_parent_checked_in, to_parent_checked_in, auto_closed
                )
                VALUES (:id, :exch_id, :time, 'scheduled', NOW(), NOW(), false, false, false)
            """), {"id": future_inst_id, "exch_id": exchange_id, "time": future_date})
            
            await db.commit()
        except Exception as e:
            print(f"Error inserting instances: {e}")
            await db.rollback()
            return
            
        print("Test data setup complete via SQL.")

        # 5. Test Service
        print(f"Testing get_instances_in_range for user {user_id}...")
        
        now = datetime.utcnow()
        start_date = now - timedelta(days=30)
        end_date = now + timedelta(days=30)

        # We start a NEW transaction block for the read
        # ORM usage inside get_instances_in_range
        try:
            instances = await CustodyExchangeService.get_instances_in_range(
                db=db,
                case_id=case_id,
                viewer_id=user_id,
                start_date=start_date,
                end_date=end_date
            )

            print(f"Found {len(instances)} instances.")
            
            found_past = False
            found_future = False

            for inst in instances:
                print(f"- {inst.scheduled_time} ({inst.status})")
                if inst.id == past_inst_id:
                    found_past = True
                if inst.id == future_inst_id:
                    found_future = True

            if found_past and found_future:
                print("✅ SUCCESS: Both past and future instances returned.")
            else:
                print("❌ FAILURE: Missing instances.")
        except Exception as e:
            print(f"Error during service call: {e}")
            import traceback
            traceback.print_exc()
        finally:
            # Cleanup
            print("Cleaning up...")
            try:
                await db.execute(text("DELETE FROM custody_exchange_instances WHERE exchange_id = :id"), {"id": exchange_id})
                await db.execute(text("DELETE FROM custody_exchanges WHERE id = :id"), {"id": exchange_id})
                await db.execute(text("DELETE FROM case_participants WHERE case_id = :id"), {"id": case_id})
                await db.execute(text("DELETE FROM cases WHERE id = :id"), {"id": case_id})
                await db.commit()
            except Exception as e:
                print(f"Error cleaning up: {e}")

if __name__ == "__main__":
    asyncio.run(verify_exchange_history())
