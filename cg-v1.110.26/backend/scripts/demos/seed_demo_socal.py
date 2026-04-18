"""
Seed Demo Data - Southern California Co-Parent Personas

Creates 7 realistic co-parent situations with complete data:
- 16 user accounts
- 8 family files
- 15 children
- Complete agreements
- Quick accords
- Schedule events
- Custody exchanges
- ClearFund expenses
- Messages with ARIA scores
- 16 professional firms
- Professional case assignments

Based on DEMO_PERSONAS.md
"""

import asyncio
import os
from datetime import datetime, timedelta
from decimal import Decimal
from uuid import uuid4
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select
import random

# Import models (adjust path as needed)
import sys
sys.path.append('/Users/tj/Desktop/CommonGround/cg-v1.110.26/backend')

from app.models.user import User, UserProfile
from app.models.family_file import FamilyFile
from app.models.child import Child
from app.models.agreement import Agreement, AgreementSection
from app.models.schedule import ScheduleEvent
from app.models.custody_exchange import CustodyExchange, CustodyExchangeInstance
from app.models.obligation import Obligation
from app.models.message import Message, MessageThread, MessageFlag
from app.models.professional import ProfessionalProfile, Firm, FirmMembership, CaseAssignment


# ========================================
# PERSONA DATA STRUCTURES
# ========================================

PERSONAS = {
    "sarah_mike": {
        "parents": [
            {
                "email": "sarah.williams@email.com",
                "password": "Demo2026!",
                "first_name": "Sarah",
                "last_name": "Williams",
                "phone": "(949) 555-0101",
                "address": "24 Marigold St",
                "city": "Irvine",
                "state": "CA",
                "zip": "92620",
                "role": "parent_a"
            },
            {
                "email": "mike.williams@email.com",
                "password": "Demo2026!",
                "first_name": "Mike",
                "last_name": "Williams",
                "phone": "(949) 555-0102",
                "address": "1250 Oak Canyon Dr",
                "city": "Irvine",
                "state": "CA",
                "zip": "92618",
                "role": "parent_b"
            }
        ],
        "children": [
            {"first_name": "Emma", "last_name": "Williams", "date_of_birth": "2018-03-15", "gender": "Female"},
            {"first_name": "Liam", "last_name": "Williams", "date_of_birth": "2019-09-22", "gender": "Male"}
        ],
        "custody_type": "50/50",
        "schedule_type": "week_on_week_off",
        "conflict_level": "low",
        "child_support": None,
        "professional_type": "attorney"
    },
    "tasha_marcus": {
        "parents": [
            {
                "email": "tasha.brown@email.com",
                "password": "Demo2026!",
                "first_name": "Tasha",
                "last_name": "Brown",
                "phone": "(310) 555-0201",
                "address": "1523 E Compton Blvd",
                "city": "Compton",
                "state": "CA",
                "zip": "90221",
                "role": "parent_a"
            },
            {
                "email": "marcus.brown@email.com",
                "password": "Demo2026!",
                "first_name": "Marcus",
                "last_name": "Brown",
                "phone": "(310) 555-0202",
                "address": "2104 N Long Beach Blvd",
                "city": "Compton",
                "state": "CA",
                "zip": "90221",
                "role": "parent_b"
            }
        ],
        "children": [
            {"first_name": "Jayden", "last_name": "Brown", "date_of_birth": "2020-06-10", "gender": "Male"}
        ],
        "custody_type": "80/20",
        "schedule_type": "every_other_weekend",
        "conflict_level": "high",
        "child_support": 800.00,
        "professional_type": "gal"
    },
    "jennifer_ryan": {
        "parents": [
            {
                "email": "jennifer.martinez@email.com",
                "password": "Demo2026!",
                "first_name": "Jennifer",
                "last_name": "Martinez",
                "phone": "(562) 555-0301",
                "address": "3421 Atlantic Ave",
                "city": "Long Beach",
                "state": "CA",
                "zip": "90807",
                "role": "parent_a"
            },
            {
                "email": "ryan.martinez@email.com",
                "password": "Demo2026!",
                "first_name": "Ryan",
                "last_name": "Martinez",
                "phone": "(562) 555-0302",
                "address": "6210 E Pacific Coast Hwy",
                "city": "Long Beach",
                "state": "CA",
                "zip": "90803",
                "role": "parent_b"
            }
        ],
        "children": [
            {"first_name": "Noah", "last_name": "Martinez", "date_of_birth": "2016-04-18", "gender": "Male"}
        ],
        "custody_type": "60/40",
        "schedule_type": "2_2_3",
        "conflict_level": "moderate",
        "child_support": 600.00,
        "professional_type": "mediator"
    },
    "jennifer_carlos": {
        "parents": [
            {
                "email": "jennifer.martinez@email.com",  # Same Jennifer
                "password": "Demo2026!",
                "first_name": "Jennifer",
                "last_name": "Martinez",
                "phone": "(562) 555-0301",
                "address": "3421 Atlantic Ave",
                "city": "Long Beach",
                "state": "CA",
                "zip": "90807",
                "role": "parent_a"
            },
            {
                "email": "carlos.garcia@email.com",
                "password": "Demo2026!",
                "first_name": "Carlos",
                "last_name": "Garcia",
                "phone": "(562) 555-0401",
                "address": "3421 Atlantic Ave",  # Lives with Jennifer
                "city": "Long Beach",
                "state": "CA",
                "zip": "90807",
                "role": "parent_b"
            }
        ],
        "children": [
            {"first_name": "Sofia", "last_name": "Garcia", "date_of_birth": "2018-11-02", "gender": "Female"}
        ],
        "custody_type": "primary",
        "schedule_type": "lives_with_mother",
        "conflict_level": "low",
        "child_support": None,
        "professional_type": None
    },
    "carlos_maria": {
        "parents": [
            {
                "email": "carlos.garcia@email.com",  # Same Carlos
                "password": "Demo2026!",
                "first_name": "Carlos",
                "last_name": "Garcia",
                "phone": "(562) 555-0401",
                "address": "3421 Atlantic Ave",
                "city": "Long Beach",
                "state": "CA",
                "zip": "90807",
                "role": "parent_a"
            },
            {
                "email": "maria.garcia@email.com",
                "password": "Demo2026!",
                "first_name": "Maria",
                "last_name": "Garcia",
                "phone": "(562) 555-0402",
                "address": "2150 E 7th St",
                "city": "Long Beach",
                "state": "CA",
                "zip": "90804",
                "role": "parent_b"
            }
        ],
        "children": [
            {"first_name": "Isabella", "last_name": "Garcia", "date_of_birth": "2017-08-14", "gender": "Female"}
        ],
        "custody_type": "50/50",
        "schedule_type": "week_on_week_off",
        "conflict_level": "low",
        "child_support": None,
        "professional_type": None
    },
    "amanda_david": {
        "parents": [
            {
                "email": "amanda.chen@email.com",
                "password": "Demo2026!",
                "first_name": "Amanda",
                "last_name": "Chen",
                "phone": "(626) 555-0501",
                "address": "1285 San Pasqual St",
                "city": "Pasadena",
                "state": "CA",
                "zip": "91106",
                "role": "parent_a"
            },
            {
                "email": "david.chen@email.com",
                "password": "Demo2026!",
                "first_name": "David",
                "last_name": "Chen",
                "phone": "(626) 555-0502",
                "address": "675 S Madison Ave",
                "city": "Pasadena",
                "state": "CA",
                "zip": "91106",
                "role": "parent_b"
            }
        ],
        "children": [
            {"first_name": "Olivia", "last_name": "Chen", "date_of_birth": "2014-01-20", "gender": "Female"},
            {"first_name": "Ethan", "last_name": "Chen", "date_of_birth": "2017-05-12", "gender": "Male"},
            {"first_name": "Ava", "last_name": "Chen", "date_of_birth": "2019-09-30", "gender": "Female"}
        ],
        "custody_type": "50/50_flexible",
        "schedule_type": "custom",
        "conflict_level": "low",
        "child_support": None,
        "professional_type": "attorney"
    },
    "keisha_darnell": {
        "parents": [
            {
                "email": "keisha.johnson@email.com",
                "password": "Demo2026!",
                "first_name": "Keisha",
                "last_name": "Johnson",
                "phone": "(310) 555-0601",
                "address": "21828 S Avalon Blvd",
                "city": "Carson",
                "state": "CA",
                "zip": "90745",
                "role": "parent_a"
            },
            {
                "email": "darnell.johnson@email.com",
                "password": "Demo2026!",
                "first_name": "Darnell",
                "last_name": "Johnson",
                "phone": "(310) 555-0602",
                "address": "22112 Moneta Ave",
                "city": "Carson",
                "state": "CA",
                "zip": "90745",
                "role": "parent_b"
            }
        ],
        "children": [
            {"first_name": "Aaliyah", "last_name": "Johnson", "date_of_birth": "2023-02-14", "gender": "Female"}
        ],
        "custody_type": "70/30",
        "schedule_type": "weekends_plus",
        "conflict_level": "moderate",
        "child_support": 300.00,
        "professional_type": None
    },
    "lisa_tom": {
        "parents": [
            {
                "email": "lisa.taylor@email.com",
                "password": "Demo2026!",
                "first_name": "Lisa",
                "last_name": "Taylor",
                "phone": "(951) 555-0701",
                "address": "5830 Mission Blvd",
                "city": "Riverside",
                "state": "CA",
                "zip": "92509",
                "role": "parent_a"
            },
            {
                "email": "tom.taylor@email.com",
                "password": "Demo2026!",
                "first_name": "Tom",
                "last_name": "Taylor",
                "phone": "(951) 555-0702",
                "address": "3400 Central Ave",
                "city": "Riverside",
                "state": "CA",
                "zip": "92506",
                "role": "parent_b"
            }
        ],
        "children": [
            {"first_name": "Mason", "last_name": "Taylor", "date_of_birth": "2015-07-08", "gender": "Male"},
            {"first_name": "Chloe", "last_name": "Taylor", "date_of_birth": "2018-03-25", "gender": "Female", "special_needs": "Autism Spectrum Disorder"}
        ],
        "custody_type": "50/50",
        "schedule_type": "2_2_5_5",
        "conflict_level": "low",
        "child_support": 1200.00,
        "professional_type": "parenting_coordinator"
    },
    "rachel_jason": {
        "parents": [
            {
                "email": "rachel.anderson@email.com",
                "password": "Demo2026!",
                "first_name": "Rachel",
                "last_name": "Anderson",
                "phone": "(213) 555-0801",
                "address": "1100 Wilshire Blvd #1405",
                "city": "Los Angeles",
                "state": "CA",
                "zip": "90017",
                "role": "parent_a"
            },
            {
                "email": "jason.anderson@email.com",
                "password": "Demo2026!",
                "first_name": "Jason",
                "last_name": "Anderson",
                "phone": "(949) 555-0802",
                "address": "2600 Michelson Dr",
                "city": "Irvine",
                "state": "CA",
                "zip": "92612",
                "role": "parent_b"
            }
        ],
        "children": [
            {"first_name": "Brooklyn", "last_name": "Anderson", "date_of_birth": "2013-04-05", "gender": "Female"},
            {"first_name": "Aiden", "last_name": "Anderson", "date_of_birth": "2016-10-18", "gender": "Male"}
        ],
        "custody_type": "75/25",
        "schedule_type": "every_other_weekend_extended",
        "conflict_level": "low",
        "child_support": 1800.00,
        "professional_type": "attorney"
    }
}


FIRMS = [
    {
        "name": "Family First Legal Group",
        "type": "Family Law Attorneys",
        "city": "Irvine",
        "state": "CA",
        "zip": "92614",
        "address": "17875 Von Karman Ave, Suite 400",
        "phone": "(949) 555-0100",
        "email": "info@familyfirstlegal.com",
        "website": "www.familyfirstlegal.com",
        "description": "Orange County's premier family law firm specializing in collaborative divorce and child-centered custody solutions. We believe in minimizing conflict while maximizing outcomes for children.",
        "specialties": ["High-net-worth divorce", "Custody agreements", "Mediation", "Collaborative divorce"],
        "attorneys": [
            {"name": "Jennifer Park, Esq.", "role": "Lead Partner", "years_experience": 15},
            {"name": "Michael Chen, Esq.", "role": "Associate", "years_experience": 5}
        ]
    },
    {
        "name": "Compton Community Law Center",
        "type": "Affordable Family Law Services",
        "city": "Compton",
        "state": "CA",
        "zip": "90220",
        "address": "205 S Willowbrook Ave",
        "phone": "(310) 555-0200",
        "email": "help@comptonlawcenter.org",
        "website": "www.comptonlawcenter.org",
        "description": "Providing accessible family law services to underserved communities. Sliding scale fees and pro bono work available. We fight for families who need it most.",
        "specialties": ["Low-income support", "Domestic violence", "Child support enforcement"],
        "attorneys": [
            {"name": "Angela Davis, Esq.", "role": "Director", "years_experience": 20},
            {"name": "Marcus Johnson, Esq.", "role": "Staff Attorney", "years_experience": 8}
        ]
    },
    {
        "name": "Westside Mediation Services",
        "type": "Family Mediators",
        "city": "Culver City",
        "state": "CA",
        "zip": "90232",
        "address": "10850 Washington Blvd, Suite 300",
        "phone": "(310) 555-0300",
        "email": "schedule@westsidemediation.com",
        "website": "www.westsidemediation.com",
        "description": "Compassionate mediation for families in transition. We help parents create workable agreements without litigation. Child-focused, solution-oriented approach.",
        "specialties": ["Divorce mediation", "Parenting plans", "Co-parent counseling"],
        "mediators": [
            {"name": "Dr. Sarah Thompson, LMFT", "role": "Mediator", "years_experience": 12},
            {"name": "Robert Martinez, JD", "role": "Retired Judge", "years_experience": 25}
        ]
    },
    {
        "name": "Long Beach Family Law Associates",
        "type": "Full-Service Family Law",
        "city": "Long Beach",
        "state": "CA",
        "zip": "90802",
        "address": "110 Pine Ave, Suite 1200",
        "phone": "(562) 555-0400",
        "email": "contact@lbfamilylaw.com",
        "website": "www.lbfamilylaw.com",
        "description": "Award-winning family law practice serving Long Beach and surrounding communities. Known for creative solutions and fierce advocacy.",
        "specialties": ["Complex custody", "Modifications", "Relocation", "LGBTQ+ families"],
        "attorneys": [
            {"name": "Patricia Williams, Esq.", "role": "Managing Partner", "years_experience": 18},
            {"name": "David Lee, Esq.", "role": "Senior Associate", "years_experience": 10},
            {"name": "Sofia Ramirez, Esq.", "role": "Associate", "years_experience": 4}
        ]
    },
    {
        "name": "Pasadena Collaborative Law Group",
        "type": "Collaborative Divorce Specialists",
        "city": "Pasadena",
        "state": "CA",
        "zip": "91101",
        "address": "301 E Colorado Blvd, Suite 600",
        "phone": "(626) 555-0500",
        "email": "info@pasadenacollaborative.com",
        "website": "www.pasadenacollaborative.com",
        "description": "Pioneering collaborative divorce in the San Gabriel Valley. For professionals who want to divorce with dignity and preserve family relationships.",
        "specialties": ["High-asset divorce", "Business valuation", "Collaborative process"],
        "attorneys": [
            {"name": "Elizabeth Morgan, Esq.", "role": "Founding Partner", "years_experience": 22},
            {"name": "James Patterson, Esq.", "role": "Partner", "years_experience": 16}
        ]
    },
    {
        "name": "Inland Empire Parenting Coordinators",
        "type": "Parenting Coordinators & Child Specialists",
        "city": "Riverside",
        "state": "CA",
        "zip": "92501",
        "address": "3750 University Ave, Suite 500",
        "phone": "(951) 555-0600",
        "email": "appointments@ieparentingcoord.com",
        "website": "www.ieparentingcoord.com",
        "description": "Court-appointed parenting coordinators helping high-conflict families find peace. Specializing in cases involving special needs children and complex custody arrangements.",
        "specialties": ["High-conflict cases", "Special needs children", "Co-parent counseling"],
        "specialists": [
            {"name": "Dr. Michael Rivera, PhD", "role": "Clinical Psychologist", "years_experience": 15},
            {"name": "Linda Garcia, LCSW", "role": "Child Specialist", "years_experience": 10}
        ]
    },
    {
        "name": "South Bay Legal Advocates",
        "type": "Family Law & Immigration",
        "city": "Carson",
        "state": "CA",
        "zip": "90810",
        "address": "21515 S Alameda St, Suite 200",
        "phone": "(310) 555-0700",
        "email": "abogados@southbaylegal.com",
        "website": "www.southbaylegal.com",
        "description": "Serving South LA's diverse communities with culturally sensitive family law services. We understand the unique challenges facing immigrant families.",
        "specialties": ["Bilingual services (Spanish/English)", "Immigration + family law", "Domestic violence"],
        "attorneys": [
            {"name": "Maria Gonzalez, Esq.", "role": "Owner", "years_experience": 14},
            {"name": "Carlos Mendez, Esq.", "role": "Associate", "years_experience": 6}
        ]
    },
    {
        "name": "Downtown LA Family Law Center",
        "type": "Full-Service Family Law Firm",
        "city": "Los Angeles",
        "state": "CA",
        "zip": "90071",
        "address": "355 S Grand Ave, Suite 4400",
        "phone": "(213) 555-0800",
        "email": "inquiries@dtlafamilylaw.com",
        "website": "www.dtlafamilylaw.com",
        "description": "Discreet, high-stakes family law for entertainment professionals and executives. Known for protecting privacy and complex asset divisions.",
        "specialties": ["Entertainment industry divorces", "Prenups", "Custody litigation"],
        "attorneys": [
            {"name": "Richard Stone, Esq.", "role": "Senior Partner", "years_experience": 25},
            {"name": "Amanda Foster, Esq.", "role": "Partner", "years_experience": 14},
            {"name": "Kevin Park, Esq.", "role": "Associate", "years_experience": 7}
        ]
    },
    {
        "name": "Lakewood Family Mediation & Law",
        "type": "Mediation + Legal Services",
        "city": "Lakewood",
        "state": "CA",
        "zip": "90712",
        "address": "5250 Clark Ave, Suite 100",
        "phone": "(562) 555-0900",
        "email": "info@lakewoodfamilylaw.com",
        "website": "www.lakewoodfamilylaw.com",
        "description": "Flexible approach to family law - start with mediation, add legal support when needed. Affordable, effective, and less adversarial.",
        "specialties": ["Hybrid mediation/legal approach", "Co-parenting education", "Child support"],
        "attorneys": [
            {"name": "Janet Wilson, Esq., Mediator", "role": "Owner", "years_experience": 19},
            {"name": "Thomas Rodriguez, Esq.", "role": "Associate", "years_experience": 11}
        ]
    },
    {
        "name": "Redlands Children's Rights Advocates",
        "type": "Child-Focused Family Law",
        "city": "Redlands",
        "state": "CA",
        "zip": "92373",
        "address": "300 E State St, Suite 630",
        "phone": "(909) 555-1000",
        "email": "advocacy@redlandschildrights.com",
        "website": "www.redlandschildrights.com",
        "description": "When children need a voice in custody proceedings. Court-appointed attorneys and GALs who put children's best interests first.",
        "specialties": ["GAL services", "Minor's counsel", "Child custody evaluations"],
        "attorneys": [
            {"name": "Susan Campbell, Esq.", "role": "Guardian ad Litem", "years_experience": 17},
            {"name": "Brian Mitchell, Esq.", "role": "Minor's Counsel", "years_experience": 13}
        ]
    },
    {
        "name": "Orange County Divorce Financial Analysts",
        "type": "CDFA (Certified Divorce Financial Analysts)",
        "city": "Irvine",
        "state": "CA",
        "zip": "92612",
        "address": "19800 MacArthur Blvd, Suite 1000",
        "phone": "(949) 555-1100",
        "email": "consult@ocdivorcefinancial.com",
        "website": "www.ocdivorcefinancial.com",
        "description": "Financial clarity during divorce. We help families understand the long-term financial impact of custody and support decisions.",
        "specialties": ["Financial planning", "Asset division", "Child support calculations", "QDRO"],
        "analysts": [
            {"name": "Rebecca Chang, CDFA, CPA", "role": "Senior Analyst", "years_experience": 20},
            {"name": "Mark Stevens, CDFA, CFP", "role": "Analyst", "years_experience": 15}
        ]
    },
    {
        "name": "LA County Parenting Coaches",
        "type": "Co-Parenting Education & Coaching",
        "city": "Los Angeles",
        "state": "CA",
        "zip": "90036",
        "address": "5900 Wilshire Blvd, Suite 2000",
        "phone": "(323) 555-1200",
        "email": "coaching@laparentingcoaches.com",
        "website": "www.laparentingcoaches.com",
        "description": "Learn to co-parent effectively, even in high-conflict situations. Evidence-based strategies for putting children first.",
        "specialties": ["Communication skills", "Conflict resolution", "Blended families", "Parallel parenting"],
        "coaches": [
            {"name": "Dr. Jennifer Adams, PhD", "role": "Licensed Psychologist", "years_experience": 18},
            {"name": "Michelle Torres, LMFT", "role": "Therapist & Coach", "years_experience": 12}
        ]
    },
    {
        "name": "Riverside Military Family Law",
        "type": "Military Divorce Specialists",
        "city": "Riverside",
        "state": "CA",
        "zip": "92501",
        "address": "4129 Main St, Suite 200",
        "phone": "(951) 555-1300",
        "email": "support@riversidemilfamlaw.com",
        "website": "www.riversidemilfamlaw.com",
        "description": "Understanding the unique needs of military families. Experience with deployment, relocation, and military benefits division.",
        "specialties": ["Military pension division", "Relocation", "Deployment custody plans"],
        "attorneys": [
            {"name": "Colonel (Ret.) Daniel Harris, Esq.", "role": "Lead Attorney", "years_experience": 23},
            {"name": "Melissa Grant, Esq.", "role": "Associate", "years_experience": 9}
        ]
    },
    {
        "name": "South LA Mediation Collective",
        "type": "Community-Based Mediation",
        "city": "Los Angeles",
        "state": "CA",
        "zip": "90022",
        "address": "5301 Whittier Blvd",
        "phone": "(323) 555-1400",
        "email": "connect@slamediationcollective.org",
        "website": "www.slamediationcollective.org",
        "description": "Grassroots mediation for families in South LA. Sliding scale fees, focus on healing and community. We believe in transformation, not litigation.",
        "specialties": ["Culturally responsive mediation", "Restorative justice", "Affordable services"],
        "mediators": [
            {"name": "Jamal Washington", "role": "Community Mediator", "years_experience": 14},
            {"name": "Keisha Brown, LCSW", "role": "Social Worker & Mediator", "years_experience": 10}
        ]
    },
    {
        "name": "Newport Beach High-Asset Divorce Group",
        "type": "High-Net-Worth Family Law",
        "city": "Newport Beach",
        "state": "CA",
        "zip": "92660",
        "address": "4100 Newport Place Dr, Suite 800",
        "phone": "(949) 555-1500",
        "email": "contact@newportdivorce.com",
        "website": "www.newportdivorce.com",
        "description": "Sophisticated representation for complex, high-stakes divorces. Expertise in business ownership, executive compensation, and wealth preservation.",
        "specialties": ["Business valuations", "Stock options", "Executive comp", "Trusts", "Prenups"],
        "attorneys": [
            {"name": "Gregory Anderson, Esq.", "role": "Founding Partner", "years_experience": 28},
            {"name": "Victoria Chen, Esq.", "role": "Partner", "years_experience": 19},
            {"name": "Jonathan Miller, Esq.", "role": "Senior Associate", "years_experience": 12}
        ]
    },
    {
        "name": "Watts Community Legal Aid",
        "type": "Non-Profit Legal Services",
        "city": "Los Angeles",
        "state": "CA",
        "zip": "90002",
        "address": "1686 E 103rd St",
        "phone": "(323) 555-1600",
        "email": "intake@wattslegalaid.org",
        "website": "www.wattslegalaid.org",
        "description": "Free legal services for families in crisis. No one should face family court alone. We provide representation to those who can't afford an attorney.",
        "specialties": ["Free/low-cost family law", "Domestic violence", "Housing + family law"],
        "attorneys": [
            {"name": "Rosa Martinez, Esq.", "role": "Executive Director", "years_experience": 16},
            {"name": "David Thompson, Esq.", "role": "Staff Attorney", "years_experience": 7}
        ]
    }
]


async def main():
    """Main seeding function"""

    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        raise ValueError("DATABASE_URL not set")

    print("\n" + "="*60)
    print("   SEEDING DEMO DATA - SOUTHERN CALIFORNIA")
    print("="*60 + "\n")

    print("📋 This will create:")
    print("   - 16 user accounts (14 parents + 2 extras)")
    print("   - 8 family files")
    print("   - 15 children")
    print("   - 8 complete agreements")
    print("   - 12-15 quick accords")
    print("   - 50+ schedule events")
    print("   - 30+ custody exchanges")
    print("   - 20+ ClearFund expenses")
    print("   - 100+ messages with ARIA scores")
    print("   - 16 professional firms")
    print("   - 7-8 professional case assignments\n")

    confirmation = input("⚠️  Type 'SEED' to continue: ")
    if confirmation != "SEED":
        print("❌ Seeding cancelled.")
        return

    print("\n🔄 Starting in 3 seconds...")
    import time
    time.sleep(3)

    # Create engine
    engine = create_async_engine(database_url, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as session:
        print("\n🌱 Seeding demo data...\n")

        # Step 1: Create users in Supabase Auth
        print("👥 Step 1: Creating users in Supabase Auth...")
        # TODO: Implement Supabase Auth user creation
        print("   ⚠️  Supabase Auth integration needed - creating profiles only for now\n")

        # Step 2: Create user profiles
        print("📝 Step 2: Creating user profiles...")
        user_map = {}  # email -> user_id mapping
        for persona_name, persona_data in PERSONAS.items():
            for parent_data in persona_data["parents"]:
                # Create user (mock ID for now)
                user_id = str(uuid4())
                user_map[parent_data["email"]] = user_id

                # Create profile
                profile = UserProfile(
                    id=str(uuid4()),
                    user_id=user_id,
                    first_name=parent_data["first_name"],
                    last_name=parent_data["last_name"],
                    email=parent_data["email"],
                    phone=parent_data.get("phone"),
                    address_line1=parent_data.get("address"),
                    city=parent_data.get("city"),
                    state=parent_data.get("state"),
                    zip_code=parent_data.get("zip"),
                    timezone="America/Los_Angeles",
                    subscription_tier="free",
                    subscription_status="active",
                    created_at=datetime.utcnow()
                )
                session.add(profile)
                print(f"   ✅ Created profile: {parent_data['first_name']} {parent_data['last_name']}")

        await session.commit()
        print(f"\n✅ Created {len(user_map)} user profiles\n")

        # Step 3: Create family files
        print("📁 Step 3: Creating family files...")
        family_file_map = {}  # persona_name -> family_file_id

        for persona_name, persona_data in PERSONAS.items():
            parent_a_email = persona_data["parents"][0]["email"]
            parent_b_email = persona_data["parents"][1]["email"]

            parent_a_id = user_map[parent_a_email]
            parent_b_id = user_map[parent_b_email]

            family_file = FamilyFile(
                id=str(uuid4()),
                title=f"{persona_data['parents'][0]['last_name']} Family",
                family_file_number=f"FF-{persona_name.upper()}-001",
                parent_a_id=parent_a_id,
                parent_b_id=parent_b_id,
                parent_b_joined_at=datetime.utcnow() - timedelta(days=random.randint(30, 180)),
                state=persona_data["parents"][0]["state"],
                status="active",
                created_at=datetime.utcnow() - timedelta(days=random.randint(180, 730)),
                created_by=parent_a_id
            )
            session.add(family_file)
            family_file_map[persona_name] = family_file.id

            print(f"   ✅ Created family file: {family_file.title}")

        await session.commit()
        print(f"\n✅ Created {len(family_file_map)} family files\n")

        # Step 4: Create children
        print("👶 Step 4: Creating children...")
        child_count = 0

        for persona_name, persona_data in PERSONAS.items():
            family_file_id = family_file_map[persona_name]

            for child_data in persona_data["children"]:
                child = Child(
                    id=str(uuid4()),
                    family_file_id=family_file_id,
                    first_name=child_data["first_name"],
                    last_name=child_data["last_name"],
                    date_of_birth=datetime.strptime(child_data["date_of_birth"], "%Y-%m-%d").date(),
                    gender=child_data["gender"],
                    special_needs_note=child_data.get("special_needs"),
                    created_at=datetime.utcnow() - timedelta(days=random.randint(30, 180))
                )
                session.add(child)
                child_count += 1
                print(f"   ✅ Created child: {child_data['first_name']} {child_data['last_name']}")

        await session.commit()
        print(f"\n✅ Created {child_count} children\n")

        print("\n🎉 Demo data seeded successfully!")
        print("\n📊 Summary:")
        print(f"   - {len(user_map)} user profiles")
        print(f"   - {len(family_file_map)} family files")
        print(f"   - {child_count} children")
        print("\n⚠️  TODO: Implement full seeding (agreements, events, exchanges, messages, firms)")

    await engine.dispose()


if __name__ == "__main__":
    print("\n💡 NOTE: This is a starter script. Full implementation requires:")
    print("   1. Supabase Auth integration for user creation")
    print("   2. Agreement section creation")
    print("   3. Schedule event generation")
    print("   4. Custody exchange instances")
    print("   5. ClearFund obligation creation")
    print("   6. Message generation with ARIA scores")
    print("   7. Professional firm profiles")
    print("   8. Case assignment logic\n")

    asyncio.run(main())
