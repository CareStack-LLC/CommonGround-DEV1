"""
CommonGround E2E Test Data Seeding Script

Generates realistic test data for E2E testing:
- 4 parent users (Sarah, Michael, Jessica, David)
- 2 family files with children
- Sample messages (with ARIA interventions)
- Events (with RSVPs and missed events)
- Custody exchanges
- Agreements
- Payment obligations
"""

import sys
import os
import asyncio
from datetime import datetime, timedelta
from pathlib import Path
import random

# Add parent directory to path for imports
sys.path.append(str(Path(__file__).parent.parent))

from app.core.database import AsyncSessionLocal, get_db_context
from app.models.user import User
from app.models.family_file import FamilyFile
from app.models.child import Child
from app.models.message import Message
from app.models.event import Event, EventRSVP
from app.models.custody import CustodyExchange, CustodyTimeBlock
from app.models.agreement import Agreement, AgreementSection
from app.models.clearfund import Obligation, LedgerEntry
from app.utils.security import get_password_hash
import argparse
from sqlalchemy import select, delete


# Test user credentials
TEST_PASSWORD = "TestPass123!"
TEST_EMAIL_SUFFIX = "@commonground.test"

# Persona definitions
PERSONAS = {
    "sarah": {
        "email": "e2e_test_sarah@commonground.test",
        "first_name": "Sarah",
        "last_name": "Martinez",
        "role": "parent"
    },
    "michael": {
        "email": "e2e_test_michael@commonground.test",
        "first_name": "Michael",
        "last_name": "Rodriguez",
        "role": "parent"
    },
    "jessica": {
        "email": "e2e_test_jessica@commonground.test",
        "first_name": "Jessica",
        "last_name": "Chen",
        "role": "parent"
    },
    "david": {
        "email": "e2e_test_david@commonground.test",
        "first_name": "David",
        "last_name": "Thompson",
        "role": "parent"
    }
}


def clean_test_data(db: Session):
    """Remove all existing E2E test data"""
    print("🧹 Cleaning existing E2E test data...")
    
    # Get all test users
    test_users = db.query(User).filter(
        User.email.like("%@commonground.test")
    ).all()
    
    if not test_users:
        print("   No test data found.")
        return
    
    user_ids = [user.id for user in test_users]
    
    # Delete related data (cascade should handle most)
    print(f"   Found {len(test_users)} test users. Deleting...")
    
    for user in test_users:
        db.delete(user)
    
    db.commit()
    print("   ✅ Test data cleaned successfully")


def create_users(db: Session) -> dict:
    """Create test user accounts"""
    print("\n👥 Creating test user accounts...")
    
    users = {}
    for key, persona in PERSONAS.items():
        # Check if user exists
        existing = db.query(User).filter(User.email == persona["email"]).first()
        if existing:
            users[key] = existing
            print(f"   ⚠️  User {persona['email']} already exists, using existing")
            continue
        
        user = User(
            email=persona["email"],
            hashed_password=get_password_hash(persona["password"]),
            first_name=persona["first_name"],
            last_name=persona["last_name"],
            role=persona["role"],
            is_active=True,
            created_at=datetime.utcnow()
        )
        db.add(user)
        db.flush()
        users[key] = user
        print(f"   ✅ Created {persona['first_name']} {persona['last_name']}")
    
    db.commit()
    return users


def create_family_files(db: Session, users: dict) -> list:
    """Create family files with children"""
    print("\n👨‍👩‍👧‍👦 Creating family files...")
    
    families = []
    
    # Family 1: Sarah & Michael (High-Conflict)
    family1 = FamilyFile(
        parent_1_id=users["sarah"].id,
        parent_2_id=users["michael"].id,
        case_number="E2E-TEST-001",
        status="active",
        created_at=datetime.utcnow() - timedelta(days=180),
        custody_split_percentage=65  # Sarah 65%, Michael 35%
    )
    db.add(family1)
    db.flush()
    
    # Children for Family 1
    child1_1 = Child(
        family_file_id=family1.id,
        first_name="Emma",
        last_name="Rodriguez",
        date_of_birth=datetime.utcnow() - timedelta(days=365*8),  # 8 years old
        grade="3rd",
        created_at=datetime.utcnow() - timedelta(days=180)
    )
    child1_2 = Child(
        family_file_id=family1.id,
        first_name="Lucas",
        last_name="Rodriguez",
        date_of_birth=datetime.utcnow() - timedelta(days=365*5),  # 5 years old
        grade="Kindergarten",
        created_at=datetime.utcnow() - timedelta(days=180)
    )
    db.add_all([child1_1, child1_2])
    
    families.append({
        "file": family1,
        "parent1": users["sarah"],
        "parent2": users["michael"],
        "children": [child1_1, child1_2],
        "conflict_level": "high"
    })
    print(f"   ✅ Created Family 1: Sarah & Michael (High-Conflict, 2 children)")
    
    # Family 2: Jessica & David (Low-Conflict)
    family2 = FamilyFile(
        parent_1_id=users["jessica"].id,
        parent_2_id=users["david"].id,
        case_number="E2E-TEST-002",
        status="active",
        created_at=datetime.utcnow() - timedelta(days=365),
        custody_split_percentage=50  # 50/50 split
    )
    db.add(family2)
    db.flush()
    
    # Children for Family 2
    child2_1 = Child(
        family_file_id=family2.id,
        first_name="Lily",
        last_name="Thompson",
        date_of_birth=datetime.utcnow() - timedelta(days=365*7),  # 7 years old
        grade="2nd",
        created_at=datetime.utcnow() - timedelta(days=365)
    )
    child2_2 = Child(
        family_file_id=family2.id,
        first_name="Noah",
        last_name="Thompson",
        date_of_birth=datetime.utcnow() - timedelta(days=365*4),  # 4 years old
        grade="Preschool",
        created_at=datetime.utcnow() - timedelta(days=365)
    )
    child2_3 = Child(
        family_file_id=family2.id,
        first_name="Sophie",
        last_name="Thompson",
        date_of_birth=datetime.utcnow() - timedelta(days=365*9),  # 9 years old
        grade="4th",
        created_at=datetime.utcnow() - timedelta(days=365)
    )
    db.add_all([child2_1, child2_2, child2_3])
    
    families.append({
        "file": family2,
        "parent1": users["jessica"],
        "parent2": users["david"],
        "children": [child2_1, child2_2, child2_3],
        "conflict_level": "low"
    })
    print(f"   ✅ Created Family 2: Jessica & David (Low-Conflict, 3 children)")
    
    db.commit()
    return families


def create_messages(db: Session, families: list):
    """Create sample messages with ARIA intervention examples"""
    print("\n💬 Creating sample messages...")
    
    message_count = 0
    
    for family_data in families:
        family = family_data["file"]
        parent1 = family_data["parent1"]
        parent2 = family_data["parent2"]
        conflict = family_data["conflict_level"]
        
        num_messages = 50 if conflict == "high" else 30
        
        for i in range(num_messages):
            days_ago = random.randint(1, 30)
            sender = parent1 if random.random() > 0.5 else parent2
            recipient = parent2 if sender == parent1 else parent1
            
            # Determine if ARIA intervened based on conflict level
            aria_intervened = random.random() < (0.6 if conflict == "high" else 0.05)
            
            if aria_intervened:
                toxicity = random.choice(["medium", "high", "severe"])
                original = get_sample_hostile_message(sender.first_name, toxicity)
                final = get_sample_rewritten_message(original, toxicity)
            else:
                toxicity = "none"
                original = get_sample_neutral_message(sender.first_name)
                final = original
            
            message = Message(
                family_file_id=family.id,
                sender_id=sender.id,
                recipient_id=recipient.id,
                subject=f"Re: {random.choice(['Schedule', 'Kids', 'Pickup', 'Event', 'Update'])}",
                content=final,
                original_content=original if aria_intervened else None,
                toxicity_score=get_toxicity_score(toxicity),
                aria_flagged=aria_intervened,
                created_at=datetime.utcnow() - timedelta(days=days_ago, hours=random.randint(8, 20)),
                read_at=datetime.utcnow() - timedelta(days=days_ago-1) if random.random() > 0.2 else None
            )
            db.add(message)
            message_count += 1
    
    db.commit()
    print(f"   ✅ Created {message_count} messages with ARIA examples")


def create_events(db: Session, families: list):
    """Create sample events with RSVPs and missed events"""
    print("\n📅 Creating sample events...")
    
    event_categories = ["medical", "school", "sports", "therapy", "extracurricular", "social", "travel"]
    event_count = 0
    
    for family_data in families:
        family = family_data["file"]
        parent1 = family_data["parent1"]
        parent2 = family_data["parent2"]
        children = family_data["children"]
        conflict = family_data["conflict_level"]
        
        num_events = 15
        
        for i in range(num_events):
            child = random.choice(children)
            category = random.choice(event_categories)
            days_offset = random.randint(-14, 14)  # Past and future events
            event_time = datetime.utcnow() + timedelta(days=days_offset, hours=random.randint(9, 17))
            
            event = Event(
                family_file_id=family.id,
                child_id=child.id,
                creator_id=parent1.id,
                title=get_sample_event_title(category, child.first_name),
                category=category,
                event_date=event_time,
                location=f"{random.randint(100, 9999)} Main St, City, State",
                notes=f"Please arrive 10 minutes early.",
                created_at=datetime.utcnow() - timedelta(days=abs(days_offset)+7)
            )
            db.add(event)
            db.flush()
            
            # Create RSVPs
            if conflict == "high":
                # Michael often doesn't respond or misses events
                parent1_rsvp = "going"
                parent2_rsvp = random.choice(["going", "not_going", "maybe", "no_response"])
                if parent2_rsvp == "going" and days_offset < 0:
                    # 30% chance Michael missed it
                    if random.random() < 0.3:
                        event.status = "missed"
            else:
                # Jessica & David both respond and attend
                parent1_rsvp = "going"
                parent2_rsvp = "going"
            
            rsvp1 = EventRSVP(
                event_id=event.id,
                user_id=parent1.id,
                status=parent1_rsvp,
                created_at=event.created_at + timedelta(hours=2)
            )
            rsvp2 = EventRSVP(
                event_id=event.id,
                user_id=parent2.id,
                status=parent2_rsvp,
                created_at=event.created_at + timedelta(hours=random.randint(3, 24)) if parent2_rsvp != "no_response" else None
            )
            db.add_all([rsvp1, rsvp2])
            event_count += 1
    
    db.commit()
    print(f"   ✅ Created {event_count} events with RSVPs")


def create_custody_exchanges(db: Session, families: list):
    """Create custody exchange history"""
    print("\n🔄 Creating custody exchange history...")
    
    exchange_count = 0
    
    for family_data in families:
        family = family_data["file"]
        parent1 = family_data["parent1"]
        parent2 = family_data["parent2"]
        conflict = family_data["conflict_level"]
        
        # Create 8 exchanges over last 30 days
        for i in range(8):
            days_ago = i * 4  # Every 4 days
            exchange_time = datetime.utcnow() - timedelta(days=days_ago, hours=18)  # 6 PM
            
            from_parent = parent1 if i % 2 == 0 else parent2
            to_parent = parent2 if i % 2 == 0 else parent1
            
            # Determine if exchange was compliant
            if conflict == "high":
                # Michael is late 15% of the time
                compliant = random.random() > 0.15 if from_parent.first_name == "Michael" or to_parent.first_name == "Michael" else True
            else:
                compliant = random.random() > 0.01  # 99% compliant
            
            method = random.choice(["qr_code", "qr_code", "manual"]) if compliant else "manual"
            confirmation_time = exchange_time + (timedelta(minutes=random.randint(0, 10)) if compliant else timedelta(minutes=random.randint(16, 45)))
            
            exchange = CustodyExchange(
                family_file_id=family.id,
                from_parent_id=from_parent.id,
                to_parent_id=to_parent.id,
                scheduled_time=exchange_time,
                actual_time=confirmation_time,
                method=method,
                compliant=compliant,
                gps_verified=method == "qr_code",
                created_at=exchange_time - timedelta(hours=1)
            )
            db.add(exchange)
            exchange_count += 1
    
    db.commit()
    print(f"   ✅ Created {exchange_count} custody exchanges")


def create_agreements(db: Session, families: list):
    """Create sample agreements"""
    print("\n📝 Creating sample agreements...")
    
    agreement_count = 0
    
    for family_data in families:
        family = family_data["file"]
        parent1 = family_data["parent1"]
        parent2 = family_data["parent2"]
        conflict = family_data["conflict_level"]
        
        agreement = Agreement(
            family_file_id=family.id,
            title="Co-Parenting Agreement",
            status="approved" if conflict == "low" else "pending_approval",
            created_by_id=parent1.id,
            created_at=datetime.utcnow() - timedelta(days=60)
        )
        db.add(agreement)
        db.flush()
        
        # Create 7 sections
        section_titles = [
            "Custody Schedule",
            "Decision Making",
            "Communication Protocol",
            "Financial Responsibilities",
            "Healthcare",
            "Education",
            "Dispute Resolution"
        ]
        
        for idx, title in enumerate(section_titles):
            section = AgreementSection(
                agreement_id=agreement.id,
                section_number=idx + 1,
                title=title,
                content=f"Sample content for {title} section. This would contain detailed terms agreed upon by both parents.",
                approved_by_parent1=True,
                approved_by_parent2=conflict == "low",  # David approves immediately, Michael delays
                created_at=agreement.created_at,
                updated_at=agreement.created_at + timedelta(days=random.randint(1, 10))
            )
            db.add(section)
        
        agreement_count += 1
    
    db.commit()
    print(f"   ✅ Created {agreement_count} agreements with 7 sections each")


def create_obligations(db: Session, families: list):
    """Create payment obligations"""
    print("\n💰 Creating payment obligations...")
    
    obligation_count = 0
    
    for family_data in families:
        family = family_data["file"]
        parent1 = family_data["parent1"]
        parent2 = family_data["parent2"]
        
        # Create child support obligation
        obligation = Obligation(
            family_file_id=family.id,
            payer_id=parent2.id,  # Non-custodial parent pays
            payee_id=parent1.id,
            amount=800.00,
            description="Monthly Child Support",
            due_date=datetime.utcnow().replace(day=1) + timedelta(days=32),  # Next month
            status="paid",
            created_at=datetime.utcnow() - timedelta(days=90)
        )
        db.add(obligation)
        db.flush()
        
        # Create ledger entry for payment
        ledger = LedgerEntry(
            obligation_id=obligation.id,
            family_file_id=family.id,
            from_user_id=parent2.id,
            to_user_id=parent1.id,
            amount=800.00,
            transaction_type="payment",
            created_at=datetime.utcnow() - timedelta(days=random.randint(1, 5))
        )
        db.add(ledger)
        obligation_count += 1
    
    db.commit()
    print(f"   ✅ Created {obligation_count} payment obligations")


# Helper functions for sample data
def get_sample_hostile_message(sender_name: str, toxicity: str) -> str:
    """Get sample hostile messages for ARIA testing"""
    if toxicity == "severe":
        return f"I can't believe you were late AGAIN. You clearly don't care about our kids. This is unacceptable and I'm documenting everything for court."
    elif toxicity == "high":
        return f"Stop micromanaging everything! I'm their parent too. You always think you know better."
    else:  # medium
        return f"This is really frustrating. You never follow the schedule we agreed on."


def get_sample_rewritten_message(original: str, toxicity: str) -> str:
    """Get ARIA-rewritten constructive messages"""
    if "late" in original.lower():
        return "I noticed the pickup was delayed today. Can we discuss ways to ensure timely exchanges going forward? I want to make sure the kids' routine stays consistent."
    elif "micromanaging" in original.lower():
        return "I'd appreciate if we could discuss parenting decisions together. I want to be equally involved in important choices for the kids."
    else:
        return "I've noticed some schedule inconsistencies. Can we review our agreement together to make sure we're on the same page?"


def get_sample_neutral_message(sender_name: str) -> str:
    """Get sample neutral messages"""
    templates = [
        f"Emma did great on her math test today! Wanted to share the good news.",
        f"Quick reminder: soccer practice is at 4 PM tomorrow.",
        f"The kids had a wonderful weekend. Thanks for being flexible with the schedule.",
        f"Noah asked about the summer camp schedule. Should we discuss options?",
        f"Just confirming pickup is still at 6 PM on Friday."
    ]
    return random.choice(templates)


def get_sample_event_title(category: str, child_name: str) -> str:
    """Generate sample event titles"""
    titles = {
        "medical": f"{child_name}'s Doctor Appointment",
        "school": f"{child_name}'s Parent-Teacher Conference",
        "sports": f"{child_name}'s Soccer Game",
        "therapy": f"{child_name}'s Counseling Session",
        "extracurricular": f"{child_name}'s Piano Lesson",
        "social": f"{child_name}'s Birthday Party",
        "travel": f"Family Trip with {child_name}"
    }
    return titles.get(category, f"{child_name}'s Event")


def get_toxicity_score(level: str) -> float:
    """Get toxicity score based on level"""
    scores = {
        "none": 0.05,
        "low": 0.25,
        "medium": 0.55,
        "high": 0.75,
        "severe": 0.92
    }
    return scores.get(level, 0.0)


def main():
    """Main execution function"""
    parser = argparse.ArgumentParser(description="Seed E2E test data for CommonGround")
    parser.add_argument("--clean", action="store_true", help="Clean existing test data first")
    args = parser.parse_args()
    
    print("=" * 60)
    print("CommonGround E2E Test Data Seeding")
    print("=" * 60)
    
    db = SessionLocal()
    
    try:
        if args.clean:
            clean_test_data(db)
        
        # Create test data
        users = create_users(db)
        families = create_family_files(db, users)
        create_messages(db, families)
        create_events(db, families)
        create_custody_exchanges(db, families)
        create_agreements(db, families)
        create_obligations(db, families)
        
        print("\n" + "=" * 60)
        print("✅ E2E Test Data Seeding Complete!")
        print("=" * 60)
        print("\nTest Credentials:")
        print("-" * 60)
        for key, persona in PERSONAS.items():
            print(f"{persona['first_name']:10} | {persona['email']:35} | {persona['password']}")
        print("=" * 60)
        
    except Exception as e:
        print(f"\n❌ Error during seeding: {str(e)}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
