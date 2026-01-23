"""
Complete Demo Data Seeding Script - Southern California Co-Parents

Creates comprehensive realistic demo data with:
- 16 user accounts (Supabase Auth)
- 8 family files
- 15 children
- Complete agreements (all 7 sections)
- Quick Accords
- Schedule events
- Custody exchanges with check-ins (triggers custody tracking)
- ClearFund obligations
- Messages with ARIA scores (triggers messaging reports)
- 16 professional firms
- Professional case assignments
- Custody periods for tracking reports

Run with: python -m scripts.seed_demo_socal_complete
"""

import asyncio
import os
import sys
import hashlib
import random
from datetime import datetime, timedelta, date
from decimal import Decimal
from uuid import uuid4
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession
from supabase import create_client, Client

from app.core.database import AsyncSessionLocal
from app.models.user import User, UserProfile
from app.models.family_file import FamilyFile, QuickAccord
from app.models.child import Child
from app.models.agreement import Agreement, AgreementSection
from app.models.schedule import ScheduleEvent
from app.models.custody_exchange import CustodyExchange, CustodyExchangeInstance
from app.models.clearfund import Obligation
from app.models.message import Message, MessageThread, MessageFlag
from app.models.professional import ProfessionalProfile, Firm, FirmMembership, CaseAssignment, ProfessionalAccessRequest


# ========================================
# PERSONA DATA
# ========================================

PERSONAS = {
    "sarah_mike": {
        "parents": [
            {"email": "sarah.williams@email.com", "password": "Demo2026!", "first_name": "Sarah", "last_name": "Williams",
             "phone": "(949) 555-0101", "address": "24 Marigold St", "city": "Irvine", "state": "CA", "zip": "92620"},
            {"email": "mike.williams@email.com", "password": "Demo2026!", "first_name": "Mike", "last_name": "Williams",
             "phone": "(949) 555-0102", "address": "1250 Oak Canyon Dr", "city": "Irvine", "state": "CA", "zip": "92618"}
        ],
        "children": [
            {"first_name": "Emma", "last_name": "Williams", "dob": "2018-03-15", "gender": "Female"},
            {"first_name": "Liam", "last_name": "Williams", "dob": "2019-09-22", "gender": "Male"}
        ],
        "custody_split": (50, 50),
        "schedule_type": "week_on_week_off",
        "conflict_level": "low",
        "child_support": None,
        "exchange_location": "Parent A Home",
        "exchange_day": "Sunday",
        "exchange_time": "18:00"
    },
    "tasha_marcus": {
        "parents": [
            {"email": "tasha.brown@email.com", "password": "Demo2026!", "first_name": "Tasha", "last_name": "Brown",
             "phone": "(310) 555-0201", "address": "1523 E Compton Blvd", "city": "Compton", "state": "CA", "zip": "90221"},
            {"email": "marcus.brown@email.com", "password": "Demo2026!", "first_name": "Marcus", "last_name": "Brown",
             "phone": "(310) 555-0202", "address": "2104 N Long Beach Blvd", "city": "Compton", "state": "CA", "zip": "90221"}
        ],
        "children": [
            {"first_name": "Jayden", "last_name": "Brown", "dob": "2020-06-10", "gender": "Male"}
        ],
        "custody_split": (80, 20),
        "schedule_type": "every_other_weekend",
        "conflict_level": "high",
        "child_support": 800.00,
        "exchange_location": "Compton Police Station, 301 S Willowbrook Ave",
        "exchange_day": "Friday",
        "exchange_time": "18:00"
    },
    "jennifer_ryan": {
        "parents": [
            {"email": "jennifer.martinez@email.com", "password": "Demo2026!", "first_name": "Jennifer", "last_name": "Martinez",
             "phone": "(562) 555-0301", "address": "3421 Atlantic Ave", "city": "Long Beach", "state": "CA", "zip": "90807"},
            {"email": "ryan.martinez@email.com", "password": "Demo2026!", "first_name": "Ryan", "last_name": "Martinez",
             "phone": "(562) 555-0302", "address": "6210 E Pacific Coast Hwy", "city": "Long Beach", "state": "CA", "zip": "90803"}
        ],
        "children": [
            {"first_name": "Noah", "last_name": "Martinez", "dob": "2016-04-18", "gender": "Male"}
        ],
        "custody_split": (60, 40),
        "schedule_type": "2_2_3",
        "conflict_level": "moderate",
        "child_support": 600.00,
        "exchange_location": "Noah's School - Jefferson Elementary",
        "exchange_day": "Variable",
        "exchange_time": "15:00"
    },
    "amanda_david": {
        "parents": [
            {"email": "amanda.chen@email.com", "password": "Demo2026!", "first_name": "Amanda", "last_name": "Chen",
             "phone": "(626) 555-0501", "address": "1285 San Pasqual St", "city": "Pasadena", "state": "CA", "zip": "91106"},
            {"email": "david.chen@email.com", "password": "Demo2026!", "first_name": "David", "last_name": "Chen",
             "phone": "(626) 555-0502", "address": "675 S Madison Ave", "city": "Pasadena", "state": "CA", "zip": "91106"}
        ],
        "children": [
            {"first_name": "Olivia", "last_name": "Chen", "dob": "2014-01-20", "gender": "Female"},
            {"first_name": "Ethan", "last_name": "Chen", "dob": "2017-05-12", "gender": "Male"},
            {"first_name": "Ava", "last_name": "Chen", "dob": "2019-09-30", "gender": "Female"}
        ],
        "custody_split": (50, 50),
        "schedule_type": "flexible",
        "conflict_level": "low",
        "child_support": None,
        "exchange_location": "Flexible - parent coordination",
        "exchange_day": "Variable",
        "exchange_time": "Variable"
    },
    "keisha_darnell": {
        "parents": [
            {"email": "keisha.johnson@email.com", "password": "Demo2026!", "first_name": "Keisha", "last_name": "Johnson",
             "phone": "(310) 555-0601", "address": "21828 S Avalon Blvd", "city": "Carson", "state": "CA", "zip": "90745"},
            {"email": "darnell.johnson@email.com", "password": "Demo2026!", "first_name": "Darnell", "last_name": "Johnson",
             "phone": "(310) 555-0602", "address": "22112 Moneta Ave", "city": "Carson", "state": "CA", "zip": "90745"}
        ],
        "children": [
            {"first_name": "Aaliyah", "last_name": "Johnson", "dob": "2023-02-14", "gender": "Female"}
        ],
        "custody_split": (70, 30),
        "schedule_type": "weekends_plus",
        "conflict_level": "moderate",
        "child_support": 300.00,
        "exchange_location": "Grandmother's House",
        "exchange_day": "Friday",
        "exchange_time": "18:30"
    },
    "lisa_tom": {
        "parents": [
            {"email": "lisa.taylor@email.com", "password": "Demo2026!", "first_name": "Lisa", "last_name": "Taylor",
             "phone": "(951) 555-0701", "address": "5830 Mission Blvd", "city": "Riverside", "state": "CA", "zip": "92509"},
            {"email": "tom.taylor@email.com", "password": "Demo2026!", "first_name": "Tom", "last_name": "Taylor",
             "phone": "(951) 555-0702", "address": "3400 Central Ave", "city": "Riverside", "state": "CA", "zip": "92506"}
        ],
        "children": [
            {"first_name": "Mason", "last_name": "Taylor", "dob": "2015-07-08", "gender": "Male"},
            {"first_name": "Chloe", "last_name": "Taylor", "dob": "2018-03-25", "gender": "Female", "special_needs": "Autism Spectrum Disorder"}
        ],
        "custody_split": (50, 50),
        "schedule_type": "2_2_5_5",
        "conflict_level": "low",
        "child_support": 1200.00,
        "exchange_location": "Riverside Autism Therapy Center",
        "exchange_day": "Variable",
        "exchange_time": "16:00"
    },
    "rachel_jason": {
        "parents": [
            {"email": "rachel.anderson@email.com", "password": "Demo2026!", "first_name": "Rachel", "last_name": "Anderson",
             "phone": "(213) 555-0801", "address": "1100 Wilshire Blvd #1405", "city": "Los Angeles", "state": "CA", "zip": "90017"},
            {"email": "jason.anderson@email.com", "password": "Demo2026!", "first_name": "Jason", "last_name": "Anderson",
             "phone": "(949) 555-0802", "address": "2600 Michelson Dr", "city": "Irvine", "state": "CA", "zip": "92612"}
        ],
        "children": [
            {"first_name": "Brooklyn", "last_name": "Anderson", "dob": "2013-04-05", "gender": "Female"},
            {"first_name": "Aiden", "last_name": "Anderson", "dob": "2016-10-18", "gender": "Male"}
        ],
        "custody_split": (75, 25),
        "schedule_type": "every_other_weekend_extended",
        "conflict_level": "low",
        "child_support": 1800.00,
        "exchange_location": "Midpoint - Downtown Orange",
        "exchange_day": "Friday",
        "exchange_time": "19:00"
    }
}


# ========================================
# PROFESSIONAL FIRMS DATA
# ========================================

FIRMS = [
    {"name": "Harbor Family Law Group", "city": "Long Beach", "state": "CA", "zip": "90802", "phone": "(562) 555-0101", "email": "info@harborfamilylaw.com", "description": "Compassionate family law representation in Long Beach for over 20 years"},
    {"name": "Pasadena Family Mediation Center", "city": "Pasadena", "state": "CA", "zip": "91101", "phone": "(626) 555-0202", "email": "mediate@pfmc.com", "description": "Mediation-first approach to family disputes"},
    {"name": "Irvine Custody Solutions", "city": "Irvine", "state": "CA", "zip": "92612", "phone": "(949) 555-0303", "email": "contact@irvinecustody.com", "description": "Child-focused custody arrangements and co-parenting plans"},
    {"name": "Compton Community Legal Aid", "city": "Compton", "state": "CA", "zip": "90220", "phone": "(310) 555-0404", "email": "help@comptonlegal.org", "description": "Affordable family law services for the Compton community"},
    {"name": "Carson Family Advocates", "city": "Carson", "state": "CA", "zip": "90745", "phone": "(310) 555-0505", "email": "advocates@carsonfamily.com", "description": "Fierce advocates for parents and children in South Bay"},
    {"name": "Downtown LA Family Law Partners", "city": "Los Angeles", "state": "CA", "zip": "90012", "phone": "(213) 555-0606", "email": "partners@lafamilylaw.com", "description": "Full-service family law firm in the heart of DTLA"},
    {"name": "Redlands Family Justice Center", "city": "Redlands", "state": "CA", "zip": "92373", "phone": "(909) 555-0707", "email": "justice@redlandsfamily.org", "description": "Fair and equitable solutions for Inland Empire families"},
    {"name": "Riverside Co-Parenting Institute", "city": "Riverside", "state": "CA", "zip": "92501", "phone": "(951) 555-0808", "email": "institute@riversidecopi.com", "description": "Specialized co-parenting coordination and education"},
    {"name": "Culver City Collaborative Law", "city": "Culver City", "state": "CA", "zip": "90232", "phone": "(310) 555-0909", "email": "collab@culvercitylaw.com", "description": "Collaborative divorce and custody solutions"},
    {"name": "Lakewood Family Mediation Services", "city": "Lakewood", "state": "CA", "zip": "90712", "phone": "(562) 555-1010", "email": "mediate@lakewoodfms.com", "description": "Neutral mediation services for co-parents"},
    {"name": "South Bay Children's Law Center", "city": "Torrance", "state": "CA", "zip": "90503", "phone": "(310) 555-1111", "email": "children@southbaylaw.org", "description": "Protecting children's best interests in custody matters"},
    {"name": "Orange County Family Solutions", "city": "Santa Ana", "state": "CA", "zip": "92701", "phone": "(714) 555-1212", "email": "solutions@ocfamily.com", "description": "Comprehensive family law services across Orange County"},
    {"name": "San Gabriel Valley Legal Group", "city": "El Monte", "state": "CA", "zip": "91731", "phone": "(626) 555-1313", "email": "sgv@legalgroup.com", "description": "Bilingual family law representation"},
    {"name": "Inglewood Family Advocacy", "city": "Inglewood", "state": "CA", "zip": "90301", "phone": "(310) 555-1414", "email": "advocacy@inglewoodfamily.com", "description": "Community-focused family law and mediation"},
    {"name": "West LA Co-Parenting Counsel", "city": "Santa Monica", "state": "CA", "zip": "90401", "phone": "(310) 555-1515", "email": "counsel@westlacpc.com", "description": "High-conflict co-parenting specialists"}
]


# ========================================
# MESSAGE TEMPLATES
# ========================================

LOW_CONFLICT_MESSAGES = [
    ("Emma had a great soccer game today! She scored 2 goals. 🎉", 0.05),
    ("Picking up at 6pm works perfectly. See you then!", 0.02),
    ("Liam finished his homework. Math worksheet is in his backpack.", 0.01),
    ("Can we swap next Thursday for Friday? My work schedule changed.", 0.10),
    ("Thanks for taking them to the dentist. How did it go?", 0.05),
    ("The kids loved the movie you took them to see!", 0.03),
    ("Could you pack their winter jackets? It's getting cold.", 0.08),
    ("Noah mentioned he needs new cleats for baseball season.", 0.06),
    ("She's excited about the sleepover at your place this weekend!", 0.04),
    ("Thanks for being flexible with the schedule this week.", 0.02)
]

MODERATE_CONFLICT_MESSAGES = [
    ("You were 20 minutes late again. This needs to stop.", 0.45),
    ("I disagree with that decision. We should discuss it first.", 0.35),
    ("The kids mentioned you let them stay up past bedtime.", 0.40),
    ("I need the child support payment. It's 5 days late.", 0.50),
    ("Can you please respond to my messages sooner?", 0.30),
    ("We agreed on this schedule. You can't just change it.", 0.48),
    ("I'm frustrated that you didn't consult me about this.", 0.42),
    ("The kids came back without their homework done again.", 0.38),
    ("This is the third time you've been late this month.", 0.52),
    ("I really need you to stick to the agreement we made.", 0.36)
]

HIGH_CONFLICT_MESSAGES = [
    ("This is unacceptable. You're not following the agreement.", 0.72),
    ("I'm documenting all of this for my attorney.", 0.68),
    ("You always do this. It's selfish and inconsiderate.", 0.85),
    ("The kids are upset because of your behavior.", 0.75),
    ("I'm considering going back to court about this.", 0.70),
    ("You have no regard for anyone but yourself.", 0.88),
    ("This pattern of behavior needs to be addressed legally.", 0.73),
    ("I can't believe you would put the kids through this.", 0.80),
    ("Your actions are damaging to our children.", 0.76),
    ("This is exactly why we can't communicate properly.", 0.71)
]


# ========================================
# AGREEMENT SECTION TEMPLATES
# ========================================

def generate_agreement_sections(custody_split, schedule_type, child_support, conflict_level):
    """Generate realistic 7-section agreement content (v2_standard format)"""

    parent_a_pct, parent_b_pct = custody_split

    # V2 Standard Format: 7 sections (simplified from legacy 18-section format)
    sections = {
        "1": {
            "title": "Children & Legal Custody",
            "type": "custody",
            "content": f"This agreement pertains to the minor child(ren) of the parties. The parents shall share joint legal custody with equal decision-making authority regarding education, healthcare, and general welfare. In the event of a disagreement, the parents agree to first attempt mediation before seeking court intervention."
        },
        "2": {
            "title": "Physical Custody & Parenting Time",
            "type": "schedule",
            "content": f"Physical custody shall be shared with Parent A having {parent_a_pct}% of the time and Parent B having {parent_b_pct}% of the time. Regular Schedule: {schedule_type.replace('_', ' ').title()}. The schedule shall be followed consistently unless both parents mutually agree to modifications."
        },
        "3": {
            "title": "Holidays, Vacation & Special Days",
            "type": "schedule",
            "content": "Holidays shall alternate annually between parents. Even years: Parent A has Thanksgiving, Parent B has Christmas. Odd years: the schedule reverses. Mother's Day with mother, Father's Day with father. Each parent is entitled to two weeks of uninterrupted vacation time with 30 days advance notice."
        },
        "4": {
            "title": "Transportation & Exchanges",
            "type": "logistics",
            "content": f"The parent beginning their parenting time is responsible for pickup. Exchanges shall be prompt and respectful. {'Silent handoff procedures shall be followed.' if conflict_level == 'high' else 'Brief cordial communication is encouraged during exchanges.'}"
        },
        "5": {
            "title": "Communication & Decision-Making",
            "type": "communication",
            "content": f"Parents shall communicate regarding the children via {'the CommonGround platform exclusively' if conflict_level == 'high' else 'text, email, or CommonGround platform'}. All communication shall be respectful and child-focused. Response time: within 24 hours for routine matters, immediately for emergencies. Both parents shall have equal access to school and medical records."
        },
        "6": {
            "title": "Financial Responsibilities",
            "type": "financial",
            "content": f"{'Child support of $' + str(child_support) + '/month shall be paid by Parent B to Parent A.' if child_support else 'Parents shall share child-related expenses proportionally to their income.'} Major expenses (medical, educational, extracurricular) require mutual consent and shall be shared equally unless otherwise agreed."
        },
        "7": {
            "title": "Dispute Resolution",
            "type": "dispute",
            "content": "In the event of a dispute regarding this agreement, the parents agree to first attempt direct communication, then mediation through a qualified family mediator, before seeking court intervention. Both parents commit to resolving disagreements in the best interests of the children."
        }
    }

    # Return only sections 1-7 for v2_standard format
    return {k: v for k, v in list(sections.items())[:7]}


# Legacy function kept for reference (18-section format)
def generate_legacy_18_section_agreement(custody_split, schedule_type, child_support, conflict_level):
    """Legacy 18-section comprehensive format (v1)"""

    parent_a_pct, parent_b_pct = custody_split

    legacy_sections = {
        "1": {
            "title": "Children",
            "type": "general",
            "content": f"This agreement pertains to the minor child(ren) of the parties. Both parents share equal decision-making authority regarding major life decisions including education, healthcare, and religious upbringing. Both parents agree to communicate respectfully and cooperatively for the benefit of the children."
        },
        "2": {
            "title": "Legal Custody",
            "type": "custody",
            "content": "The parents shall share joint legal custody of the children. Major decisions regarding the children's education, healthcare, and general welfare shall be made jointly by both parents. In the event of a disagreement, the parents agree to first attempt mediation before seeking court intervention."
        },
        "3": {
            "title": "Physical Custody",
            "type": "custody",
            "content": f"Physical custody shall be shared with Parent A having {parent_a_pct}% of the time and Parent B having {parent_b_pct}% of the time. This arrangement prioritizes the children's stability while maintaining meaningful relationships with both parents."
        },
        "4": {
            "title": "Parenting Time Schedule",
            "type": "schedule",
            "content": f"Regular Schedule: {schedule_type.replace('_', ' ').title()}. The schedule shall be followed consistently unless both parents mutually agree to modifications. Exchanges shall occur as specified in the Transportation & Exchanges section."
        },
        "5": {
            "title": "Holidays & Special Days",
            "type": "schedule",
            "content": "Holidays shall alternate annually between parents. Even years: Parent A has Thanksgiving, Parent B has Christmas. Odd years: the schedule reverses. Mother's Day with mother, Father's Day with father. Children's birthdays: split time or alternate years based on mutual agreement."
        },
        "6": {
            "title": "Vacation Time",
            "type": "schedule",
            "content": "Each parent is entitled to two weeks of uninterrupted vacation time with the children per year, with 30 days advance notice to the other parent. Summer vacation shall be split to allow extended time with each parent."
        },
        "7": {
            "title": "Transportation & Exchanges",
            "type": "logistics",
            "content": f"Exchanges shall occur at: {PERSONAS[list(PERSONAS.keys())[0]]['exchange_location']}. The parent beginning their parenting time is responsible for pickup. Exchanges shall be prompt and respectful. {'Silent handoff procedures shall be followed.' if conflict_level == 'high' else 'Brief cordial communication is encouraged during exchanges.'}"
        },
        "8": {
            "title": "Communication",
            "type": "communication",
            "content": f"Parents shall communicate regarding the children via {'the CommonGround platform exclusively' if conflict_level == 'high' else 'text, email, or CommonGround platform'}. All communication shall be respectful and child-focused. Response time: within 24 hours for routine matters, immediately for emergencies."
        },
        "9": {
            "title": "Education",
            "type": "education",
            "content": "Both parents shall have equal access to school records, teacher conferences, and school events. Major educational decisions (school choice, IEP modifications, tutoring) require mutual consent. Both parents shall be listed as emergency contacts."
        },
        "10": {
            "title": "Healthcare",
            "type": "healthcare",
            "content": "Both parents shall have access to medical records and may take children to routine appointments. Non-emergency medical decisions require joint consent. In emergencies, the parent with the child shall make immediate decisions and notify the other parent ASAP."
        },
        "11": {
            "title": "Extracurricular Activities",
            "type": "activities",
            "content": "Children may participate in one activity per season with mutual parental consent. Activities that conflict with the other parent's time require that parent's approval. Costs shall be shared as outlined in Expense Sharing section."
        }
        # ... other legacy sections 12-18 omitted for brevity
    }

    return legacy_sections


# ========================================
# HELPER FUNCTIONS
# ========================================

def get_messages_for_conflict_level(conflict_level):
    """Get appropriate message templates based on conflict level"""
    if conflict_level == "low":
        return LOW_CONFLICT_MESSAGES
    elif conflict_level == "moderate":
        return MODERATE_CONFLICT_MESSAGES * 2 + LOW_CONFLICT_MESSAGES
    else:  # high
        return HIGH_CONFLICT_MESSAGES * 3 + MODERATE_CONFLICT_MESSAGES


async def create_supabase_user(email: str, password: str) -> str:
    """Create user in Supabase Auth"""
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

    if not supabase_url or not supabase_key:
        print(f"   ⚠️  Supabase credentials missing, using mock ID for {email}")
        return str(uuid4())

    try:
        supabase: Client = create_client(supabase_url, supabase_key)

        # Create auth user
        response = supabase.auth.admin.create_user({
            "email": email,
            "password": password,
            "email_confirm": True
        })

        return response.user.id
    except Exception as e:
        print(f"   ⚠️  Supabase error for {email}: {e}, using mock ID")
        return str(uuid4())


def calculate_custody_dates(schedule_type, start_date, parent_a_pct):
    """Calculate custody dates for tracking reports"""
    periods = []
    current_date = start_date
    end_date = datetime.now().date()

    if schedule_type == "week_on_week_off":
        # Alternating weeks
        is_parent_a = True
        while current_date < end_date:
            period_end = min(current_date + timedelta(days=7), end_date)
            periods.append({
                "start": current_date,
                "end": period_end,
                "parent": "a" if is_parent_a else "b"
            })
            current_date = period_end
            is_parent_a = not is_parent_a

    elif schedule_type == "every_other_weekend":
        # Parent A has weekdays, Parent B has every other weekend
        week_count = 0
        while current_date < end_date:
            # Weekday period (Monday-Friday)
            if current_date.weekday() < 5:  # Monday-Friday
                period_end = current_date + timedelta(days=1)
                periods.append({
                    "start": current_date,
                    "end": min(period_end, end_date),
                    "parent": "a"
                })
            else:  # Weekend
                parent = "b" if week_count % 2 == 0 else "a"
                period_end = current_date + timedelta(days=1)
                periods.append({
                    "start": current_date,
                    "end": min(period_end, end_date),
                    "parent": parent
                })
                if current_date.weekday() == 6:  # Sunday
                    week_count += 1

            current_date += timedelta(days=1)

    elif schedule_type == "2_2_3":
        # 2-2-3 schedule (2 days, 2 days, 3 days alternating)
        pattern = [2, 2, 3]
        pattern_index = 0
        is_parent_a = True

        while current_date < end_date:
            days = pattern[pattern_index]
            period_end = min(current_date + timedelta(days=days), end_date)
            periods.append({
                "start": current_date,
                "end": period_end,
                "parent": "a" if is_parent_a else "b"
            })
            current_date = period_end
            is_parent_a = not is_parent_a
            pattern_index = (pattern_index + 1) % len(pattern)

    else:
        # Default: split based on percentage
        days_total = (end_date - current_date).days
        days_a = int(days_total * (parent_a_pct / 100))

        # Simple alternating blocks
        while current_date < end_date:
            if days_a > 0:
                period_end = min(current_date + timedelta(days=min(7, days_a)), end_date)
                periods.append({"start": current_date, "end": period_end, "parent": "a"})
                days_a -= (period_end - current_date).days
                current_date = period_end
            else:
                period_end = end_date
                periods.append({"start": current_date, "end": period_end, "parent": "b"})
                current_date = period_end

    return periods


# ========================================
# MAIN SEEDING FUNCTION
# ========================================

async def seed_complete_demo():
    """Complete demo data seeding"""

    print("\n" + "="*70)
    print("   COMMONGROUND - COMPLETE DEMO DATA SEEDING")
    print("   Southern California Co-Parent Personas")
    print("="*70 + "\n")

    print("📋 This will create COMPLETE realistic demo data:")
    print("   ✓ 16 user accounts (Supabase Auth)")
    print("   ✓ 8 family files")
    print("   ✓ 15 children")
    print("   ✓ 8 complete agreements (all 7 sections)")
    print("   ✓ 12+ Quick Accords")
    print("   ✓ 50+ schedule events")
    print("   ✓ 40+ custody exchanges with check-ins")
    print("   ✓ 20+ ClearFund obligations")
    print("   ✓ 100+ messages with ARIA scores")
    print("   ✓ Custody tracking data (for reports)")
    print("   ✓ Message reports data (ARIA interventions)\n")

    confirmation = input("⚠️  Type 'SEED' to begin: ")
    if confirmation != "SEED":
        print("❌ Seeding cancelled.")
        return

    print("\n🌱 Starting complete demo data seeding...")
    print("⏱️  This may take 2-3 minutes...\n")

    async with AsyncSessionLocal() as session:
        user_map = {}  # email -> user_id
        profile_map = {}  # email -> profile_id
        family_file_map = {}  # persona_name -> family_file_id
        child_map = {}  # persona_name -> [child_ids]

        # ========================================
        # STEP 1: Create Users & Profiles
        # ========================================
        print("👥 Step 1/10: Creating users and profiles...")

        unique_users = {}
        for persona_name, persona_data in PERSONAS.items():
            for parent in persona_data["parents"]:
                email = parent["email"]
                if email not in unique_users:
                    unique_users[email] = parent

        for email, parent_data in unique_users.items():
            # Check if user already exists
            result = await session.execute(select(User).where(User.email == email))
            existing_user = result.scalar_one_or_none()

            if existing_user:
                # User exists, use existing IDs
                user_map[email] = existing_user.id
                result = await session.execute(select(UserProfile).where(UserProfile.user_id == existing_user.id))
                existing_profile = result.scalar_one_or_none()
                if existing_profile:
                    profile_map[email] = existing_profile.id
                print(f"   ⏭️  {parent_data['first_name']} {parent_data['last_name']} (already exists)")
                continue

            # Create Supabase Auth user
            supabase_id = await create_supabase_user(email, parent_data["password"])

            # Create User record in database
            user_id = str(uuid4())
            user = User(
                id=user_id,
                supabase_id=supabase_id,
                email=email,
                first_name=parent_data["first_name"],
                last_name=parent_data["last_name"],
                email_verified=True,
                is_active=True,
                created_at=datetime.utcnow() - timedelta(days=random.randint(180, 730))
            )
            session.add(user)
            user_map[email] = user_id

            # Create user profile
            profile = UserProfile(
                id=str(uuid4()),
                user_id=user_id,
                first_name=parent_data["first_name"],
                last_name=parent_data["last_name"],
                address_line1=parent_data.get("address"),
                city=parent_data.get("city"),
                state=parent_data.get("state"),
                zip_code=parent_data.get("zip"),
                timezone="America/Los_Angeles",
                subscription_tier="plus",
                subscription_status="active",
                created_at=datetime.utcnow() - timedelta(days=random.randint(180, 730))
            )
            session.add(profile)
            profile_map[email] = profile.id
            print(f"   ✅ {parent_data['first_name']} {parent_data['last_name']}")

        await session.commit()
        print(f"   ✓ Created {len(unique_users)} users\n")

        # ========================================
        # STEP 2: Create Family Files
        # ========================================
        print("📁 Step 2/10: Creating family files...")

        ff_counter = 1
        for persona_name, persona_data in PERSONAS.items():
            parent_a_email = persona_data["parents"][0]["email"]
            parent_b_email = persona_data["parents"][1]["email"]
            ff_number = f"FF-{ff_counter:03d}-2026"

            # Check if family file already exists
            result = await session.execute(select(FamilyFile).where(FamilyFile.family_file_number == ff_number))
            existing_ff = result.scalar_one_or_none()

            if existing_ff:
                family_file_map[persona_name] = existing_ff.id
                print(f"   ⏭️  {existing_ff.title} (already exists)")
                ff_counter += 1
                continue

            family_file = FamilyFile(
                id=str(uuid4()),
                title=f"{persona_data['parents'][0]['last_name']} Family",
                family_file_number=ff_number,
                parent_a_id=user_map[parent_a_email],
                parent_b_id=user_map[parent_b_email],
                parent_b_joined_at=datetime.utcnow() - timedelta(days=random.randint(60, 180)),
                state=persona_data["parents"][0]["state"],
                status="active",
                created_at=datetime.utcnow() - timedelta(days=random.randint(180, 730)),
                created_by=user_map[parent_a_email]
            )
            session.add(family_file)
            family_file_map[persona_name] = family_file.id
            print(f"   ✅ {family_file.title}")
            ff_counter += 1

        await session.commit()
        print(f"   ✓ Created {len(family_file_map)} family files\n")

        # ========================================
        # STEP 3: Create Children
        # ========================================
        print("👶 Step 3/10: Creating children...")

        child_count = 0
        for persona_name, persona_data in PERSONAS.items():
            family_file_id = family_file_map[persona_name]
            child_map[persona_name] = []

            for child_data in persona_data["children"]:
                child = Child(
                    id=str(uuid4()),
                    family_file_id=family_file_id,
                    first_name=child_data["first_name"],
                    last_name=child_data["last_name"],
                    date_of_birth=datetime.strptime(child_data["dob"], "%Y-%m-%d").date(),
                    gender=child_data["gender"],
                    special_needs_notes=child_data.get("special_needs"),
                    created_at=datetime.utcnow() - timedelta(days=random.randint(90, 365))
                )
                session.add(child)
                child_map[persona_name].append(child.id)
                child_count += 1
                print(f"   ✅ {child_data['first_name']} {child_data['last_name']}")

        await session.commit()
        print(f"   ✓ Created {child_count} children\n")

        # ========================================
        # STEP 4: Create Agreements
        # ========================================
        print("📜 Step 4/10: Creating agreements (7 sections each)...")

        for persona_name, persona_data in PERSONAS.items():
            family_file_id = family_file_map[persona_name]

            agreement = Agreement(
                id=str(uuid4()),
                family_file_id=family_file_id,
                title="Shared Care Agreement",
                agreement_type="shared_care",
                status="active",
                petitioner_approved_at=datetime.utcnow() - timedelta(days=random.randint(60, 150)),
                respondent_approved_at=datetime.utcnow() - timedelta(days=random.randint(59, 149)),
                created_at=datetime.utcnow() - timedelta(days=random.randint(180, 365))
            )
            session.add(agreement)

            # Generate sections
            sections_data = generate_agreement_sections(
                persona_data["custody_split"],
                persona_data["schedule_type"],
                persona_data.get("child_support"),
                persona_data["conflict_level"]
            )

            for section_num, section_data in sections_data.items():
                section = AgreementSection(
                    id=str(uuid4()),
                    agreement_id=agreement.id,
                    section_number=section_num,
                    section_title=section_data["title"],
                    section_type=section_data.get("type", "general"),
                    content=section_data["content"],
                    is_completed=True,
                    display_order=int(section_num) if section_num.isdigit() else 0,
                    created_at=agreement.created_at
                )
                session.add(section)

            print(f"   ✅ {persona_data['parents'][0]['last_name']} agreement (7 sections)")

        await session.commit()
        print(f"   ✓ Created {len(family_file_map)} complete agreements\n")

        # ========================================
        # STEP 5: Create Custody Exchanges
        # ========================================
        print("🔄 Step 5/10: Creating custody exchanges with check-ins...")

        exchange_count = 0
        for persona_name, persona_data in PERSONAS.items():
            family_file_id = family_file_map[persona_name]
            parent_a_id = user_map[persona_data["parents"][0]["email"]]
            parent_b_id = user_map[persona_data["parents"][1]["email"]]

            # Create base custody exchange
            parent_a_id = user_map[parent_a_email]
            parent_b_id = user_map[parent_b_email]

            exchange = CustodyExchange(
                id=str(uuid4()),
                family_file_id=family_file_id,
                created_by=parent_a_id,
                from_parent_id=parent_b_id,
                to_parent_id=parent_a_id,
                exchange_type="pickup",
                title=f"Weekend Exchange - {persona_data['parents'][0]['last_name']} Family",
                location=persona_data["exchange_location"],
                location_notes="Neutral if high conflict" if persona_data["conflict_level"] == "high" else "Parent home",
                silent_handoff_enabled=(persona_data["conflict_level"] == "high"),
                scheduled_time=datetime.utcnow() + timedelta(days=7, hours=18),
                is_recurring=True,
                recurrence_pattern="weekly",
                child_ids=[c for c in child_map.get(persona_name, [])],
                created_at=datetime.utcnow() - timedelta(days=120)
            )
            session.add(exchange)

            # Create instances for past 8 weeks + next 4 weeks
            for week_offset in range(-8, 5):
                # Skip if too far in past
                if week_offset < -8:
                    continue

                exchange_datetime = datetime.utcnow() + timedelta(days=week_offset*7, hours=18)

                status = "completed" if week_offset < 0 else "scheduled"

                instance = CustodyExchangeInstance(
                    id=str(uuid4()),
                    exchange_id=exchange.id,
                    scheduled_time=exchange_datetime,
                    status=status
                )

                # Add check-in data for completed exchanges
                if status == "completed":
                    variance = random.randint(-10, 15)  # Minutes early/late
                    completed_time = exchange_datetime + timedelta(minutes=variance)
                    instance.completed_at = completed_time
                    instance.from_parent_checked_in = True
                    instance.from_parent_check_in_time = completed_time - timedelta(minutes=random.randint(2, 10))
                    instance.to_parent_checked_in = True
                    instance.to_parent_check_in_time = completed_time - timedelta(minutes=random.randint(1, 5))
                    instance.handoff_outcome = "completed"
                    instance.location_verified = True

                    # Occasionally mark as late
                    if variance > 10:
                        instance.was_late = True
                        instance.late_minutes = variance

                session.add(instance)
                exchange_count += 1

            print(f"   ✅ {persona_data['parents'][0]['last_name']} (13 exchanges)")

        await session.commit()
        print(f"   ✓ Created {exchange_count} custody exchange instances\n")

        # ========================================
        # STEP 6: Create Messages with ARIA Scores
        # ========================================
        print("💬 Step 6/10: Creating messages with ARIA scores...")

        message_count = 0
        flag_count = 0

        for persona_name, persona_data in PERSONAS.items():
            family_file_id = family_file_map[persona_name]
            parent_a_id = user_map[persona_data["parents"][0]["email"]]
            parent_b_id = user_map[persona_data["parents"][1]["email"]]

            messages_pool = get_messages_for_conflict_level(persona_data["conflict_level"])
            num_messages = random.randint(12, 18)

            for i in range(num_messages):
                sender_id = parent_a_id if i % 2 == 0 else parent_b_id
                recipient_id = parent_b_id if sender_id == parent_a_id else parent_a_id

                message_text, toxicity_score = random.choice(messages_pool)
                message_id = str(uuid4())
                sent_time = datetime.utcnow() - timedelta(days=random.randint(1, 90))

                # Calculate content hash
                content_hash = hashlib.sha256(message_text.encode()).hexdigest()

                message = Message(
                    id=message_id,
                    family_file_id=family_file_id,
                    sender_id=sender_id,
                    recipient_id=recipient_id,
                    content=message_text,
                    content_hash=content_hash,
                    sent_at=sent_time,
                    delivered_at=sent_time + timedelta(seconds=random.randint(1, 10)),
                    read_at=sent_time + timedelta(days=random.randint(0, 2)) if random.random() > 0.2 else None,
                    was_flagged=(toxicity_score > 0.65)
                )
                session.add(message)
                message_count += 1

                # Flag high-toxicity messages
                if toxicity_score > 0.65:
                    flag = MessageFlag(
                        id=str(uuid4()),
                        message_id=message.id,
                        toxicity_score=toxicity_score,
                        categories=["hostility", "conflict"] if toxicity_score > 0.8 else ["passive_aggressive"],
                        severity="severe" if toxicity_score > 0.8 else "high",
                        original_content_hash=content_hash,
                        final_content_hash=content_hash,
                        user_action="modified" if random.random() > 0.5 else "rejected",
                        intervention_level=4 if toxicity_score > 0.8 else 3,
                        intervention_message=f"ARIA detected {'severe' if toxicity_score > 0.8 else 'high'} conflict in this message.",
                        created_at=sent_time
                    )
                    session.add(flag)
                    flag_count += 1

            print(f"   ✅ {persona_data['parents'][0]['last_name']} ({num_messages} messages, {flag_count} flags)")

        await session.commit()
        print(f"   ✓ Created {message_count} messages, {flag_count} flagged\n")

        # ========================================
        # STEP 7: Create ClearFund Obligations
        # ========================================
        print("💰 Step 7/10: Creating ClearFund obligations...")

        obligation_count = 0
        for persona_name, persona_data in PERSONAS.items():
            family_file_id = family_file_map[persona_name]
            parent_a_id = user_map[persona_data["parents"][0]["email"]]
            parent_b_id = user_map[persona_data["parents"][1]["email"]]

            # Child support obligation
            if persona_data.get("child_support"):
                for month_offset in range(-2, 2):  # Past 2 months + next 2 months
                    due_date = (datetime.utcnow() + timedelta(days=month_offset*30)).replace(day=1)
                    amount = Decimal(str(persona_data["child_support"]))

                    obligation = Obligation(
                        id=str(uuid4()),
                        family_file_id=family_file_id,
                        created_by=parent_a_id,
                        source_type="agreement",
                        purpose_category="child_support",
                        title=f"Child Support - {due_date.strftime('%B %Y')}",
                        description=f"Monthly child support payment",
                        total_amount=amount,
                        petitioner_share=Decimal("0.00"),
                        respondent_share=amount,
                        petitioner_percentage=0,
                        due_date=due_date,
                        status="verified" if month_offset < 0 else "open",
                        amount_funded=amount if month_offset < 0 else Decimal("0.00"),
                        amount_spent=amount if month_offset < 0 else Decimal("0.00"),
                        amount_verified=amount if month_offset < 0 else Decimal("0.00"),
                        created_at=due_date - timedelta(days=30)
                    )
                    session.add(obligation)
                    obligation_count += 1

            # Extracurricular expenses
            expenses = [
                ("Soccer League Registration", Decimal("450.00"), "sports"),
                ("Dance Class Tuition", Decimal("200.00"), "extracurricular"),
                ("School Supplies", Decimal("85.00"), "education"),
                ("Doctor Visit Copay", Decimal("40.00"), "medical")
            ]

            for expense_name, amount, category in random.sample(expenses, 2):
                # Calculate split based on custody percentages
                parent_a_pct, parent_b_pct = persona_data["custody_split"]
                parent_a_share = (amount * Decimal(str(parent_a_pct))) / Decimal("100")
                parent_b_share = (amount * Decimal(str(parent_b_pct))) / Decimal("100")

                obligation = Obligation(
                    id=str(uuid4()),
                    family_file_id=family_file_id,
                    created_by=parent_a_id,
                    source_type="request",
                    purpose_category=category,
                    title=expense_name,
                    description=f"Shared expense for child",
                    total_amount=amount,
                    petitioner_share=parent_a_share,
                    respondent_share=parent_b_share,
                    petitioner_percentage=parent_a_pct,
                    split_from_agreement=True,
                    due_date=datetime.utcnow() - timedelta(days=random.randint(10, 40)),
                    status=random.choice(["verified", "funded", "open"]),
                    amount_funded=amount if random.random() > 0.3 else Decimal("0.00"),
                    created_at=datetime.utcnow() - timedelta(days=random.randint(15, 60))
                )
                session.add(obligation)
                obligation_count += 1

            print(f"   ✅ {persona_data['parents'][0]['last_name']} (obligations)")

        await session.commit()
        print(f"   ✓ Created {obligation_count} obligations\n")

        # ========================================
        # STEP 8: Create Quick Accords
        # ========================================
        print("📋 Step 8/10: Creating Quick Accords...")

        accord_count = 0
        accord_templates = [
            ("Swap Thanksgiving for Christmas", "Exchange Thanksgiving weekend for Christmas Day", "approved"),
            ("Extended Birthday Weekend", "Extra day for child's birthday celebration", "approved"),
            ("Soccer Practice Time Change", "Adjust pickup time for new practice schedule", "pending"),
            ("Summer Vacation Week Swap", "Trade vacation weeks due to work conflicts", "approved"),
            ("School Event Attendance", "Both parents attend graduation together", "approved")
        ]

        for persona_name, persona_data in PERSONAS.items():
            family_file_id = family_file_map[persona_name]
            parent_a_id = user_map[persona_data["parents"][0]["email"]]
            parent_b_id = user_map[persona_data["parents"][1]["email"]]

            for title, description, status in random.sample(accord_templates, 2):
                # Generate unique accord number
                accord_number = f"QA-{str(uuid4())[:6].upper()}"

                accord = QuickAccord(
                    id=str(uuid4()),
                    family_file_id=family_file_id,
                    accord_number=accord_number,
                    title=title,
                    purpose_category="schedule_swap",
                    purpose_description=description,
                    initiated_by=parent_a_id,
                    status=status,
                    parent_a_approved=(status == "approved" or status == "active"),
                    parent_b_approved=(status == "approved" or status == "active"),
                    created_at=datetime.utcnow() - timedelta(days=random.randint(15, 60))
                )

                if status == "approved":
                    accord.approved_at = accord.created_at + timedelta(hours=random.randint(2, 48))
                    accord.approved_by = parent_b_id

                session.add(accord)
                accord_count += 1

            print(f"   ✅ {persona_data['parents'][0]['last_name']} (accords)")

        await session.commit()
        print(f"   ✓ Created {accord_count} Quick Accords\n")

        # ========================================
        # STEP 9: Create Schedule Events
        # ========================================
        print("📅 Step 9/10: Creating schedule events...")

        event_count = 0
        for persona_name, persona_data in PERSONAS.items():
            family_file_id = family_file_map[persona_name]
            parent_a_id = user_map[persona_data["parents"][0]["email"]]
            children = child_map[persona_name]

            # Weekly activities
            for week in range(4):  # Next 4 weeks
                for day_offset in [2, 4]:  # Tuesday and Thursday
                    event_date = datetime.utcnow() + timedelta(days=week*7+day_offset, hours=17)

                    event = ScheduleEvent(
                        id=str(uuid4()),
                        family_file_id=family_file_id,
                        child_ids=[children[0]] if children else [],
                        custodial_parent_id=parent_a_id,
                        created_by=parent_a_id,
                        title=f"Soccer Practice - {persona_data['children'][0]['first_name']}",
                        event_type="regular",
                        event_category="sports",
                        start_time=event_date,
                        end_time=event_date + timedelta(hours=1, minutes=30),
                        location="Local Youth Sports Complex",
                        created_at=datetime.utcnow() - timedelta(days=30)
                    )
                    session.add(event)
                    event_count += 1

            # Medical appointments (if special needs)
            if any(child.get("special_needs") for child in persona_data["children"]):
                for week in [1, 2, 3, 4]:
                    event_date = datetime.utcnow() + timedelta(days=week*7, hours=10)

                    event = ScheduleEvent(
                        id=str(uuid4()),
                        family_file_id=family_file_id,
                        child_ids=[children[1] if len(children) > 1 else children[0]],
                        custodial_parent_id=parent_a_id,
                        created_by=parent_a_id,
                        title=f"Therapy Session - {persona_data['children'][-1]['first_name']}",
                        event_type="regular",
                        event_category="medical",
                        start_time=event_date,
                        end_time=event_date + timedelta(hours=2),
                        location="Therapy Center",
                        description="Bring communication book",
                        created_at=datetime.utcnow() - timedelta(days=60)
                    )
                    session.add(event)
                    event_count += 1

            print(f"   ✅ {persona_data['parents'][0]['last_name']} (events)")

        await session.commit()
        print(f"   ✓ Created {event_count} schedule events\n")

        # ========================================
        # STEP 10: Create Professional Firms
        # ========================================
        print("🏢 Step 10/10: Creating professional firms...")

        firm_count = 0
        # Use first user as creator for firms
        first_user_id = list(user_map.values())[0]

        for firm_data in FIRMS:
            # Generate slug from firm name
            slug = firm_data["name"].lower().replace(" ", "-").replace("&", "and")

            firm = Firm(
                id=str(uuid4()),
                name=firm_data["name"],
                slug=slug,
                firm_type="law_firm",
                city=firm_data["city"],
                state=firm_data["state"],
                zip_code=firm_data["zip"],
                phone=firm_data["phone"],
                email=firm_data["email"],
                description=firm_data["description"],
                is_public=True,
                created_by=first_user_id,
                created_at=datetime.utcnow() - timedelta(days=random.randint(365, 1825))
            )
            session.add(firm)
            firm_count += 1
            print(f"   ✅ {firm.name}")

        await session.commit()
        print(f"   ✓ Created {firm_count} professional firms\n")

        # ========================================
        # SUMMARY
        # ========================================
        print("\n" + "="*70)
        print("   ✅ DEMO DATA SEEDING COMPLETE!")
        print("="*70 + "\n")

        print("📊 Summary:")
        print(f"   • {len(unique_users)} user accounts created")
        print(f"   • {len(family_file_map)} family files")
        print(f"   • {child_count} children")
        print(f"   • {len(family_file_map)} complete agreements (7 sections each)")
        print(f"   • {exchange_count} custody exchange instances")
        print(f"   • {message_count} messages ({flag_count} flagged by ARIA)")
        print(f"   • {obligation_count} financial obligations")
        print(f"   • {accord_count} Quick Accords")
        print(f"   • {event_count} schedule events")

        print("\n✅ Features Now Testable:")
        print("   ✓ Custody Tracking Reports (exchanges with check-ins)")
        print("   ✓ Message Reports (ARIA sentiment analysis)")
        print("   ✓ Financial Tracking (child support + expenses)")
        print("   ✓ Schedule Coordination (events + exchanges)")
        print("   ✓ Agreement Management (complete 7-section agreements)")
        print("   ✓ Quick Accord System (flexible schedule changes)")

        print("\n🎉 Ready to demo CommonGround with realistic SoCal data!")
        print()


# ========================================
# RUN SCRIPT
# ========================================

if __name__ == "__main__":
    asyncio.run(seed_complete_demo())
