"""Bug Hunt Cohort service - manages organized QA testing sessions."""

import logging
from datetime import datetime, timedelta
from typing import Optional
from uuid import uuid4

from sqlalchemy import select, func, desc
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.bug_hunt import (
    BugHuntCohort,
    BugHuntFamily,
    BugHuntChecklistItem,
    BugHuntNote,
    BugHuntBugReport,
    BugHuntFeedback,
    BugHuntTester,
)
from app.models.user import User, UserProfile
from app.models.family_file import FamilyFile, generate_family_file_number
from app.models.child import Child

from datetime import date

logger = logging.getLogger(__name__)

# ── Test data pools ──────────────────────────────────────────────────

PARENT_A_NAMES = [
    ("Sarah", "Martinez"), ("Alex", "Chen"), ("Jordan", "Williams"),
    ("Taylor", "Davis"), ("Morgan", "Wilson"), ("Casey", "Brown"),
    ("Riley", "Johnson"), ("Quinn", "Anderson"), ("Avery", "Thomas"),
    ("Dakota", "Garcia"), ("Jamie", "Robinson"), ("Sam", "Lee"),
    ("Cameron", "Hall"), ("Drew", "Clark"), ("Reese", "Lewis"),
    ("Hayden", "Walker"), ("Emerson", "Young"), ("Parker", "King"),
    ("Sage", "Wright"), ("Rowan", "Scott"),
]

PARENT_B_NAMES = [
    ("Marcus", "Rivera"), ("Kim", "Patel"), ("Chris", "Thompson"),
    ("Robin", "Miller"), ("Jesse", "Moore"), ("Shannon", "Taylor"),
    ("Pat", "White"), ("Dana", "Harris"), ("Leslie", "Martin"),
    ("Kelly", "Jackson"), ("Tracy", "Allen"), ("Terry", "Adams"),
    ("Blair", "Campbell"), ("Mel", "Mitchell"), ("Jan", "Roberts"),
    ("Arin", "Carter"), ("Lynn", "Phillips"), ("Val", "Evans"),
    ("Brett", "Turner"), ("Dale", "Cooper"),
]

CHILD_NAMES = [
    "Emma", "Liam", "Olivia", "Noah", "Ava", "Ethan", "Sophia", "Mason",
    "Isabella", "Logan", "Mia", "Lucas", "Charlotte", "Oliver", "Amelia",
    "Aiden", "Harper", "Elijah", "Lily", "James",
]

# ── Default checklists per feature ───────────────────────────────────

DEFAULT_CHECKLISTS = {
    "exchange": [
        ("Create a custody exchange", "Create a new one-time exchange between parents"),
        ("Test GPS check-in", "Both parents check in at the exchange location"),
        ("Test QR code confirmation", "Use QR code to confirm handoff"),
        ("Verify recurring exchanges", "Create a recurring exchange and verify instances are generated"),
        ("Test silent handoff mode", "Enable silent handoff and verify contactless exchange flow"),
        ("Test exchange history view", "Verify completed exchanges show in history"),
        ("Test missed exchange handling", "Let an exchange window expire and verify status updates"),
    ],
    "messaging": [
        ("Send message between parents", "Send a normal message from Parent A to Parent B"),
        ("Trigger ARIA intervention", "Send a message with hostile/toxic language to trigger ARIA"),
        ("Accept ARIA suggestion", "Accept ARIA's rewritten message suggestion"),
        ("Reject ARIA suggestion", "Reject suggestion and send original (with warning)"),
        ("Test message thread view", "Verify messages display correctly in thread view"),
        ("Check unread count", "Verify unread badge updates when new messages arrive"),
        ("Test message attachments", "Send a message with an attachment"),
    ],
    "agreement": [
        ("Create SharedCare Agreement", "Start a new v2 standard agreement"),
        ("Complete all sections", "Fill out every section of the agreement"),
        ("Test ARIA section guidance", "Use ARIA's guided conversation for a section"),
        ("Test dual-parent approval", "Have both parents approve the agreement"),
        ("Verify PDF generation", "Generate and download the agreement PDF"),
        ("Test agreement versioning", "Make changes and verify version history"),
    ],
    "custody_tracking": [
        ("View custody calendar", "Check the shared custody calendar view"),
        ("Verify custody day records", "Confirm daily custody tracking is accurate"),
        ("Test MyTime collections", "Create and view time collection entries"),
        ("Check custody statistics", "Review custody time percentage breakdown"),
        ("Test schedule events", "Create and modify calendar events"),
    ],
    "clearfund": [
        ("Create an obligation", "Set up a shared expense obligation"),
        ("Submit expense for reimbursement", "File an expense request"),
        ("Test expense approval flow", "Approve/reject an expense request"),
        ("Verify payment tracking", "Check that payments are tracked correctly"),
        ("Test wallet system", "Verify wallet balance and transactions"),
    ],
    "general": [],  # Will be populated with union of all
}

# Build the "general" list from all others
for _feature, _items in DEFAULT_CHECKLISTS.items():
    if _feature != "general":
        DEFAULT_CHECKLISTS["general"].extend(_items)

# ── Rotation configs for agreement versions and subscription tiers ────
AGREEMENT_ROTATION = ["good_faith", "co-operative", "comprehensive"]
TIER_ROTATION = ["web_starter", "plus", "complete"]
TIER_PRICE_IDS: dict[str, str | None] = {
    "web_starter": None,  # free tier — skip Stripe subscription
    "plus": "price_1TE0bXBJIivbOFX70Ysv656Q",      # $17.99/mo
    "complete": "price_1TE0bYBJIivbOFX7VqmtQH23",   # $34.99/mo
}


async def create_cohort(
    db: AsyncSession,
    admin_user: User,
    name: str,
    description: Optional[str],
    target_feature: str,
    family_count: int,
    test_instructions: Optional[str],
) -> BugHuntCohort:
    """Create a new bug hunt cohort with default checklist items."""
    cohort = BugHuntCohort(
        id=str(uuid4()),
        name=name,
        description=description,
        target_feature=target_feature,
        status="draft",
        family_count=family_count,
        test_instructions=test_instructions,
        created_by=str(admin_user.id),
    )
    db.add(cohort)

    # Add default checklist items
    checklist_items = DEFAULT_CHECKLISTS.get(target_feature, DEFAULT_CHECKLISTS["general"])
    for i, (title, desc) in enumerate(checklist_items):
        item = BugHuntChecklistItem(
            id=str(uuid4()),
            cohort_id=cohort.id,
            title=title,
            description=desc,
            display_order=i,
        )
        db.add(item)

    await db.flush()
    return cohort


async def _seed_professional(
    db: AsyncSession,
    short_id: str,
    families: list,
    admin_client,
    settings,
) -> Optional[dict]:
    """Seed a verified professional + firm and SEND the first seeded family's
    case to them (active CaseAssignment with full scopes), so the professional
    portal can be tested end-to-end. Returns the professional's login info.

    Best-effort: any failure is logged and returns None rather than aborting the
    whole bug-hunt seed.
    """
    from app.models.professional import (
        ProfessionalProfile, Firm, FirmMembership, CaseAssignment,
        ProfessionalType, ProfessionalTier, FirmRole, FirmType,
        MembershipStatus, AssignmentRole, AssignmentStatus,
    )
    from app.models.user import User, UserProfile
    from app.models.family_file import FamilyFile

    if not families:
        return None
    target = families[0]
    ff_id = target.family_file_id

    pro_email = f"bh-{short_id}-pro@cg-qa.com"
    pro_password = "BugHuntPro!2026"
    pro_first, pro_last = "Jordan", "Avery"
    firm_name = f"Avery Family Law (Bug Hunt {short_id})"

    # Supabase auth user so the tester can actually log into the portal.
    supabase_ok = True
    try:
        pro_auth = admin_client.auth.admin.create_user({
            "email": pro_email,
            "password": pro_password,
            "email_confirm": True,
            "user_metadata": {"first_name": pro_first, "last_name": pro_last},
        })
        pro_supabase_id = pro_auth.user.id
    except Exception as e:
        logger.warning("Bug hunt: professional Supabase auth failed: %s", e)
        pro_supabase_id = str(uuid4())
        supabase_ok = False

    pro_user_id = str(uuid4())
    db.add(User(
        id=pro_user_id, supabase_id=pro_supabase_id, email=pro_email,
        first_name=pro_first, last_name=pro_last, is_active=True, email_verified=True,
    ))
    db.add(UserProfile(
        id=str(uuid4()), user_id=pro_user_id, first_name=pro_first, last_name=pro_last,
        subscription_tier="web_starter", subscription_status="active",
    ))

    firm_id = str(uuid4())
    db.add(Firm(
        id=firm_id, name=firm_name, slug=f"bh-{short_id}-firm",
        firm_type=FirmType.LAW_FIRM.value, email=pro_email, state="CA",
        is_public=True, is_active=True, created_by=pro_user_id,
        practice_areas=["Family Law", "Custody", "Mediation"],
    ))

    prof_id = str(uuid4())
    db.add(ProfessionalProfile(
        id=prof_id, user_id=pro_user_id,
        professional_type=ProfessionalType.ATTORNEY.value,
        license_number="CA-BH-001", license_state="CA",
        license_verified=True, license_verified_at=datetime.utcnow(),
        verification_status="verified", verification_submitted_at=datetime.utcnow(),
        subscription_tier=ProfessionalTier.SOLO.value,
        max_active_cases=15, active_case_count=1,
        subscription_status="active", is_public=True,
        practice_areas=["custody", "mediation"],
    ))

    db.add(FirmMembership(
        id=str(uuid4()), professional_id=prof_id, firm_id=firm_id,
        role=FirmRole.OWNER.value, status=MembershipStatus.ACTIVE.value,
        joined_at=datetime.utcnow(),
    ))

    # Make sure both parents on the case have consented to professional message
    # viewing, so the communications view actually works for the tester.
    ff = await db.get(FamilyFile, ff_id)
    if ff:
        for pid in (ff.parent_a_id, ff.parent_b_id):
            if not pid:
                continue
            prof = (
                await db.execute(select(UserProfile).where(UserProfile.user_id == pid))
            ).scalar_one_or_none()
            if prof and getattr(prof, "professional_message_consent_at", None) is None:
                prof.professional_message_consent_at = datetime.utcnow()

    # Active assignment — the case is "sent" to the firm with full access.
    db.add(CaseAssignment(
        id=str(uuid4()), professional_id=prof_id, firm_id=firm_id,
        family_file_id=ff_id, assignment_role=AssignmentRole.LEAD_ATTORNEY.value,
        representing="parent_a",
        access_scopes=[
            "agreement", "schedule", "checkins", "messages", "financials",
            "compliance", "interventions", "circle",
        ],
        can_control_aria=False, can_message_client=True,
        status=AssignmentStatus.ACTIVE.value, assigned_at=datetime.utcnow(),
        consent_both_parents=True,
        consent_parent_a_at=datetime.utcnow(), consent_parent_b_at=datetime.utcnow(),
    ))

    # KidSpace incidents — a flagged child message + a terminated call with a
    # recording, so the professional's "circle" incidents view and the
    # recording-request workflow have real data to exercise.
    kidspace_seeded = False
    try:
        kidspace_seeded = await _seed_kidspace_incidents(
            db, ff_id, ff.parent_a_id if ff else None, short_id
        )
    except Exception as e:
        logger.warning("Bug hunt: KidSpace incident seeding failed: %s", e)

    frontend = (getattr(settings, "FRONTEND_URL", "") or "").rstrip("/")
    return {
        "email": pro_email,
        "password": pro_password,
        "name": f"{pro_first} {pro_last}",
        "firm_name": firm_name,
        "professional_type": "attorney",
        "portal_url": f"{frontend}/professional/dashboard" if frontend else "/professional/dashboard",
        "assigned_family_file_id": ff_id,
        "assigned_family": f"{target.parent_a_name} & {target.parent_b_name}",
        "access_scopes": [
            "agreement", "schedule", "checkins", "messages", "financials",
            "compliance", "interventions", "circle",
        ],
        "kidspace_incidents_seeded": kidspace_seeded,
        "login_works": supabase_ok,
    }


async def _seed_kidspace_incidents(
    db: AsyncSession,
    family_file_id: str,
    added_by: Optional[str],
    short_id: str,
) -> bool:
    """Seed KidSpace/circle safety data for a family: an approved circle contact,
    a flagged child message, and a terminated call with flags + a recording.

    Gives the professional's circle-incidents view and the recording-request
    workflow something real to test. Returns True if seeded.
    """
    from app.models.child import Child
    from app.models.circle import CircleContact
    from app.models.circle_call import CircleCallRoom, CircleCallSession, CircleCallFlag
    from app.models.circle_message import CircleMessage

    child_id = (
        await db.execute(
            select(Child.id).where(Child.family_file_id == family_file_id).limit(1)
        )
    ).scalar_one_or_none()
    if not child_id or not added_by:
        return False

    # Approved circle contact (the flagged party).
    contact_id = str(uuid4())
    db.add(CircleContact(
        id=contact_id,
        family_file_id=family_file_id,
        contact_name="Uncle Rob (Bug Hunt)",
        relationship_type="relative",
        added_by=added_by,
        is_active=True,
        is_verified=True,
    ))

    # Flagged + hidden child message.
    db.add(CircleMessage(
        id=str(uuid4()),
        family_file_id=family_file_id,
        child_id=child_id,
        sender_id=contact_id,
        sender_type="circle_contact",
        sender_name="Uncle Rob",
        recipient_id=child_id,
        recipient_type="child",
        content="[hidden by ARIA]",
        original_content="hey, don't tell your mom but let's meet up alone after school",
        aria_analyzed=True,
        aria_flagged=True,
        aria_category="stranger_danger",
        aria_reason="Solicitation to meet alone + secrecy from parent",
        aria_score=0.94,
        aria_intervention_level=4,
        is_hidden=True,
        sent_at=datetime.utcnow(),
    ))

    # Call room + a terminated call with a recording and safety flags.
    room_id = str(uuid4())
    db.add(CircleCallRoom(
        id=room_id,
        family_file_id=family_file_id,
        child_id=child_id,
        circle_contact_id=contact_id,
        daily_room_name=f"bh-{short_id}-room",
        daily_room_url=f"https://daily.co/bh-{short_id}-room",
    ))
    session_id = str(uuid4())
    db.add(CircleCallSession(
        id=session_id,
        family_file_id=family_file_id,
        room_id=room_id,
        child_id=child_id,
        circle_contact_id=contact_id,
        call_type="video",
        status="terminated",
        initiated_by_id=contact_id,
        initiated_by_type="circle_contact",
        daily_room_name=f"bh-{short_id}-sess",
        daily_room_url=f"https://daily.co/bh-{short_id}-sess",
        aria_terminated_call=True,
        aria_termination_reason="Grooming language detected — call ended for child safety.",
        aria_intervention_count=2,
        overall_safety_score=0.2,
        recording_storage_path=f"circle-call-recordings/{family_file_id}/{session_id}/recording.webm",
        recording_url=f"circle-call-recordings/{family_file_id}/{session_id}/recording.webm",
        initiated_at=datetime.utcnow(),
    ))
    db.add(CircleCallFlag(
        id=str(uuid4()),
        session_id=session_id,
        flag_type="real_time",
        toxicity_score=0.92,
        severity="severe",
        categories=["grooming", "stranger_danger"],
        triggers=["meet alone", "don't tell your mom"],
        intervention_taken=True,
        intervention_type="terminate",
        intervention_message="This call was ended to keep you safe.",
        offending_speaker_id=contact_id,
        offending_speaker_type="circle_contact",
    ))
    return True


async def generate_seed_families(
    db: AsyncSession,
    cohort_id: str,
) -> list[BugHuntFamily]:
    """Generate seed families with Supabase auth accounts and full parent lifecycle.

    Creates complete family setups including:
    - Supabase auth users (Parent A + Parent B)
    - Local User + UserProfile records with Stripe customers/subscriptions
    - FamilyFile with both parents and active children
    - v1 Agreement with all 18 sections, structured data, and activation side effects
    - Feature-specific data (exchanges, messages) based on cohort target
    """
    import stripe
    from app.core.config import settings
    from app.core.supabase import get_supabase_admin_client
    from app.models.agreement import Agreement, AgreementSection
    from app.schemas.agreement import SECTION_TEMPLATES

    # ── Variety data pools ───────────────────────────────────────────
    EXCHANGE_LOCATIONS = [
        "Sunnydale Elementary, 123 Oak Ave, Los Angeles, CA 90001",
        "Central Park Community Center, 456 Elm St, Los Angeles, CA 90002",
        "Riverside Public Library, 789 Pine Rd, Los Angeles, CA 90003",
    ]

    ACTIVITIES = [
        [{"name": "Soccer", "annual_cost": 1200}, {"name": "Piano", "annual_cost": 2400}],
        [{"name": "Swimming", "annual_cost": 1800}, {"name": "Art Class", "annual_cost": 960}],
        [{"name": "Basketball", "annual_cost": 1500}, {"name": "Dance", "annual_cost": 2100}],
    ]

    CHILD_SUPPORT_AMOUNTS = [500, 650, 400, 750, 550]

    cohort = await db.get(BugHuntCohort, cohort_id)
    if not cohort:
        raise ValueError(f"Cohort {cohort_id} not found")
    if cohort.status not in ("draft", "seeding"):
        raise ValueError(f"Cohort is {cohort.status}, cannot generate data")

    cohort.status = "seeding"
    await db.flush()

    short_id = cohort.id[:8]
    admin_client = get_supabase_admin_client()
    created_families: list[BugHuntFamily] = []
    synthetic_id_families: list[int] = []  # track families with failed Supabase auth

    family_configs: list[dict] = []  # track per-family metadata for seed_config

    for i in range(cohort.family_count):
        # ── Rotation: cycle through agreement versions and subscription tiers
        agreement_version = AGREEMENT_ROTATION[i % len(AGREEMENT_ROTATION)]
        subscription_tier = TIER_ROTATION[i % len(TIER_ROTATION)]
        stripe_price_id = TIER_PRICE_IDS[subscription_tier]

        family_configs.append({
            "index": i,
            "agreement_version": agreement_version,
            "subscription_tier": subscription_tier,
        })

        idx = i % len(PARENT_A_NAMES)
        a_first, a_last = PARENT_A_NAMES[idx]
        b_first, b_last = PARENT_B_NAMES[idx]

        pa_email = f"bh-{short_id}-a{i+1}@cg-qa.com"
        pb_email = f"bh-{short_id}-b{i+1}@cg-qa.com"
        pa_password = f"BugHunt#{i+1}!2026"
        pb_password = f"BugHunt#{i+1}!2026b"

        supabase_created = True
        try:
            # Create Supabase auth users
            pa_auth = admin_client.auth.admin.create_user({
                "email": pa_email,
                "password": pa_password,
                "email_confirm": True,
                "user_metadata": {"first_name": a_first, "last_name": a_last},
            })
            pb_auth = admin_client.auth.admin.create_user({
                "email": pb_email,
                "password": pb_password,
                "email_confirm": True,
                "user_metadata": {"first_name": b_first, "last_name": b_last},
            })

            pa_supabase_id = pa_auth.user.id
            pb_supabase_id = pb_auth.user.id

        except Exception as e:
            logger.error(
                "Supabase user creation FAILED for family %d: %s. "
                "Using synthetic IDs — these accounts will NOT work for actual login.",
                i + 1, e,
            )
            pa_supabase_id = str(uuid4())
            pb_supabase_id = str(uuid4())
            supabase_created = False

        # Create local User records
        pa_id = str(uuid4())
        pb_id = str(uuid4())

        parent_a = User(
            id=pa_id,
            supabase_id=pa_supabase_id,
            email=pa_email,
            first_name=a_first,
            last_name=a_last,
            is_active=True,
            email_verified=True,
        )
        parent_b = User(
            id=pb_id,
            supabase_id=pb_supabase_id,
            email=pb_email,
            first_name=b_first,
            last_name=b_last,
            is_active=True,
            email_verified=True,
        )
        db.add(parent_a)
        db.add(parent_b)
        await db.flush()  # Users must exist before FamilyFile FKs

        # Create UserProfile records (tier rotates per family)
        pa_profile = UserProfile(
            id=str(uuid4()),
            user_id=pa_id,
            first_name=a_first,
            last_name=a_last,
            subscription_tier=subscription_tier,
            subscription_status="active",
        )
        pb_profile = UserProfile(
            id=str(uuid4()),
            user_id=pb_id,
            first_name=b_first,
            last_name=b_last,
            subscription_tier=subscription_tier,
            subscription_status="active",
        )
        db.add(pa_profile)
        db.add(pb_profile)

        # ── Stripe Customer + Subscription for EACH parent ───────────
        if settings.STRIPE_SECRET_KEY and stripe_price_id:
            stripe.api_key = settings.STRIPE_SECRET_KEY
            for profile, email, first_name, last_name, user_id, is_parent_a in [
                (pa_profile, pa_email, a_first, a_last, pa_id, True),
                (pb_profile, pb_email, b_first, b_last, pb_id, False),
            ]:
                try:
                    # Create Stripe customer
                    customer = stripe.Customer.create(
                        email=email,
                        name=f"{first_name} {last_name}",
                        metadata={"platform": "commonground", "source": "bug_hunt_seed", "user_id": user_id},
                    )
                    profile.stripe_customer_id = customer.id

                    # Attach test payment method so the subscription can be charged
                    pm = stripe.PaymentMethod.attach("pm_card_visa", customer=customer.id)
                    stripe.Customer.modify(
                        customer.id,
                        invoice_settings={"default_payment_method": pm.id},
                    )

                    # Create subscription (same tier for both parents)
                    subscription = stripe.Subscription.create(
                        customer=customer.id,
                        items=[{"price": stripe_price_id}],
                        metadata={"source": "bug_hunt_seed"},
                    )
                    profile.stripe_subscription_id = subscription.id
                except Exception as e:
                    logger.warning(f"Stripe setup failed for {email}: {e}")

        # Create FamilyFile
        ff_id = str(uuid4())
        family_file = FamilyFile(
            id=ff_id,
            family_file_number=generate_family_file_number(),
            title=f"{a_last} & {b_last} Family (Bug Hunt)",
            created_by=pa_id,
            parent_a_id=pa_id,
            parent_a_role="parent_a",
            parent_b_id=pb_id,
            parent_b_role="parent_b",
            parent_b_email=pb_email,
            parent_b_joined_at=datetime.utcnow(),
            status="active",
            state="CA",
        )
        db.add(family_file)
        await db.flush()  # FamilyFile must exist before Children/Exchanges/BugHuntFamily FKs

        # Create 1-2 children (status=active)
        num_children = 1 + (i % 2)  # alternating 1 and 2 children
        child_names = []
        for c in range(num_children):
            child_name_idx = (i * 2 + c) % len(CHILD_NAMES)
            child_name = CHILD_NAMES[child_name_idx]
            child_names.append(child_name)

            child = Child(
                id=str(uuid4()),
                family_file_id=ff_id,
                first_name=child_name,
                last_name=a_last,
                date_of_birth=date(2020 - c, 6, 15),
                status="active",
                created_by=pa_id,
                approved_by_a=pa_id,
                approved_at_a=datetime.utcnow(),
                approved_by_b=pb_id,
                approved_at_b=datetime.utcnow(),
            )
            db.add(child)

        # Create feature-specific data based on target
        if cohort.target_feature in ("exchange", "general"):
            from app.models.custody_exchange import CustodyExchange
            exchange = CustodyExchange(
                id=str(uuid4()),
                family_file_id=ff_id,
                created_by=pa_id,
                title=f"Weekly Pickup - {a_last} Family",
                exchange_type="pickup",
                location="Main Street Park, 123 Main St, Los Angeles, CA 90001",
                location_lat=34.0522,
                location_lng=-118.2437,
                scheduled_time=datetime.utcnow(),
                is_recurring=True,
                recurrence_pattern="weekly",
                status="active",
            )
            db.add(exchange)

        if cohort.target_feature in ("messaging", "general"):
            import hashlib
            from app.models.message import Message
            msg_content = f"Hi {b_first}, let's coordinate the schedule for this week."
            msg = Message(
                id=str(uuid4()),
                family_file_id=ff_id,
                sender_id=pa_id,
                recipient_id=pb_id,
                content=msg_content,
                content_hash=hashlib.sha256(msg_content.encode()).hexdigest(),
            )
            db.add(msg)

        # ── Create Agreement (version rotates per family) ──────────
        children_names_str = " and ".join(child_names)
        child1_name = child_names[0]
        activities = ACTIVITIES[i % len(ACTIVITIES)]
        support_amount = CHILD_SUPPORT_AMOUNTS[i % len(CHILD_SUPPORT_AMOUNTS)]

        agreement = Agreement(
            id=str(uuid4()),
            family_file_id=ff_id,
            agreement_type="shared_care",
            agreement_version=agreement_version,
            title=f"{a_last}-{b_last} SharedCare Agreement",
            status="draft",
        )
        db.add(agreement)
        await db.flush()  # Agreement must exist before sections

        if agreement_version == "good_faith":
            # ── Good Faith: no sections, activate directly ────────
            agreement.status = "active"
            agreement.effective_date = datetime.utcnow()
            agreement.petitioner_approved = True
            agreement.petitioner_approved_at = datetime.utcnow()
            agreement.respondent_approved = True
            agreement.respondent_approved_at = datetime.utcnow()
            logger.info("Good faith agreement created for family %d (no sections)", i + 1)

        elif agreement_version == "co-operative":
            # ── Co-operative: 7 sections from V2 Standard ─────────
            from app.schemas.agreement_v2 import SECTION_TEMPLATES_V2_STANDARD

            v2_structured = {
                "1": {
                    "parent_a_name": f"{a_first} {a_last}",
                    "parent_b_name": f"{b_first} {b_last}",
                    "children": [{"name": n, "dob": f"{2020 - j}-06-15"} for j, n in enumerate(child_names)],
                    "state": "CA",
                    "current_arrangements": "week_on_week_off",
                },
                "2": {
                    "effective_date": datetime.utcnow().strftime("%Y-%m-%d"),
                    "duration_type": "ongoing",
                    "review_schedule": "annual",
                    "amendment_process": "mutual_written_consent",
                },
                "3": {
                    "primary_residence": "equal",
                    "schedule_pattern": "week_on_week_off",
                    "transition_day": "Sunday",
                    "transition_time": "6:00 PM",
                    "schedule_notes": f"Parents alternate weekly custody of {children_names_str}",
                },
                "4": {
                    "exchange_location": "school",
                    "exchange_location_address": EXCHANGE_LOCATIONS[i % len(EXCHANGE_LOCATIONS)],
                    "transportation_responsibility": "shared",
                    "transition_communication": "commonground",
                    "backup_plan": "In case of emergency, contact the other parent by phone.",
                },
                "5": {
                    "major_decision_authority": "mutual_consent",
                    "education_decisions": "mutual_consent",
                    "healthcare_decisions": "mutual_consent",
                    "communication_platform": "commonground",
                    "response_timeframe": "24_hours",
                    "emergency_contact_order": "phone",
                },
                "6": {
                    "expense_categories": ["medical", "education", "extracurricular"],
                    "split_ratio": "50/50",
                    "reimbursement_window": "30_days",
                    "documentation_required": True,
                    "payment_method": "commonground_clearfund",
                },
                "7": {
                    "modification_triggers": "material_change_in_circumstances",
                    "dispute_resolution_steps": ["commonground_platform", "mediation", "court"],
                    "escalation_timeframe": "30_days",
                },
            }

            v2_content = {
                "1": f"This SharedCare Agreement is entered into by {a_first} {a_last} (Parent A) and {b_first} {b_last} (Parent B) regarding the care of their {'child' if num_children == 1 else 'children'}, {children_names_str}. Both parents reside in California.",
                "2": f"This agreement takes effect immediately and remains in force until modified by mutual written consent. Both parents agree to review the agreement annually to ensure it serves the best interests of {children_names_str}.",
                "3": f"The parents agree to a week-on/week-off schedule. Transitions occur every Sunday at 6:00 PM. {children_names_str} will spend approximately equal time with each parent.",
                "4": f"Custody exchanges take place at {EXCHANGE_LOCATIONS[i % len(EXCHANGE_LOCATIONS)]}. Transportation is shared. All transition communication goes through CommonGround. In emergencies, contact the other parent by phone.",
                "5": f"All major decisions regarding {children_names_str} require mutual consent. Communication goes through CommonGround with 24-hour response expected. Emergency matters may use phone.",
                "6": f"Shared expenses (medical, education, extracurricular) are split 50/50. Reimbursement requests within 30 days via ClearFund with documentation.",
                "7": f"Either parent may request modification for material changes. Disputes follow: (1) CommonGround platform, (2) mediation, (3) court. Both parents acknowledge and agree to these terms.",
            }

            for template in SECTION_TEMPLATES_V2_STANDARD:
                sec_num = template["section_number"]
                section = AgreementSection(
                    id=str(uuid4()),
                    agreement_id=agreement.id,
                    section_number=sec_num,
                    section_title=template["section_title"],
                    section_type=template["section_type"],
                    display_order=template["display_order"],
                    is_required=template["is_required"],
                    content=v2_content.get(sec_num, template["template"]),
                    structured_data=v2_structured.get(sec_num),
                    is_completed=True,
                )
                db.add(section)

            # Approve + activate
            agreement.status = "pending_approval"
            agreement.petitioner_approved = True
            agreement.petitioner_approved_at = datetime.utcnow()
            agreement.petitioner_approval_ip = "127.0.0.1"
            agreement.respondent_approved = True
            agreement.respondent_approved_at = datetime.utcnow()
            agreement.respondent_approval_ip = "127.0.0.1"
            agreement.status = "approved"
            await db.flush()

            from app.services.agreement_activation import AgreementActivationService
            activation_service = AgreementActivationService(db)
            try:
                activation_result = await activation_service.activate_agreement(
                    agreement=agreement, activated_by=str(parent_a.id),
                )
                agreement.status = "active"
                agreement.effective_date = datetime.utcnow()
                logger.info("Co-operative agreement activated for family %d: exchanges=%s", i + 1, getattr(activation_result, "exchanges_created", "?"))
            except Exception as e:
                logger.error("Co-operative agreement activation failed for family %d: %s", i + 1, e)
                agreement.status = "active"
                agreement.effective_date = datetime.utcnow()

        else:
            # ── Comprehensive: full 18-section v1 ─────────────────
            section_structured_data = {
                "1": {
                    "parent_a_name": f"{a_first} {a_last}",
                    "parent_b_name": f"{b_first} {b_last}",
                    "children": [{"name": n, "dob": f"{2020 - j}-06-15"} for j, n in enumerate(child_names)],
                    "state": "CA",
                },
                "2": {"custody_type": "joint_legal", "decision_making": "mutual_consent"},
                "3": {"physical_custody": "joint", "primary_residence": "equal"},
                "4": {
                    "primary_residence": "equal", "schedule_pattern": "week_on_week_off",
                    "transition_day": "Sunday", "transition_time": "6:00 PM",
                    "schedule_notes": f"Parents alternate weekly custody of {children_names_str}",
                },
                "5": {
                    "holidays": [
                        {"name": "Thanksgiving", "allocation": "alternating", "parent_this_year": "parent_a"},
                        {"name": "Christmas Eve", "allocation": "parent_a"},
                        {"name": "Christmas Day", "allocation": "parent_b"},
                        {"name": "New Year's Eve", "allocation": "alternating", "parent_this_year": "parent_b"},
                        {"name": "Easter", "allocation": "alternating", "parent_this_year": "parent_a"},
                        {"name": "July 4th", "allocation": "alternating", "parent_this_year": "parent_b"},
                        {"name": "Mother's Day", "allocation": "parent_b"},
                        {"name": "Father's Day", "allocation": "parent_a"},
                        {"name": f"{child1_name}'s Birthday", "allocation": "alternating", "parent_this_year": "parent_a"},
                    ],
                },
                "6": {"vacation_weeks_per_parent": 2, "advance_notice_days": 30, "blackout_dates": "first_week_of_school"},
                "7": {"spring_break": "alternating", "winter_break": "split", "summer_break": "two_weeks_each"},
                "8": {
                    "exchange_location": "school",
                    "exchange_location_address": EXCHANGE_LOCATIONS[i % len(EXCHANGE_LOCATIONS)],
                    "transportation_responsibility": "shared", "transition_communication": "commonground",
                    "backup_plan": "In case of emergency, contact the other parent via phone immediately.",
                },
                "9": {"major_decisions": "mutual_consent", "dispute_process": "mediation_first"},
                "10": {"school_selection": "mutual_consent", "tutoring": "mutual_consent", "special_education": "mutual_consent"},
                "11": {"routine_medical": "either_parent", "major_medical": "mutual_consent", "therapy": "mutual_consent", "insurance_provider": "parent_a"},
                "12": {"religious_upbringing": "mutual_respect", "religious_education": "mutual_consent"},
                "13": {
                    "activities": [{"name": a["name"], "annual_cost": a["annual_cost"], "frequency": "monthly"} for a in activities],
                    "approval_required": "mutual_consent", "cost_sharing": "50/50",
                },
                "14": {
                    "has_support": True, "payer_parent_role": "parent_a", "receiver_parent_role": "parent_b",
                    "amount": support_amount, "frequency": "monthly", "due_day": 1, "payment_method": "clearfund",
                },
                "15": {
                    "expense_categories": ["medical", "education", "extracurricular"], "split_ratio": "50/50",
                    "reimbursement_window": "30_days", "documentation_required": True, "payment_method": "commonground_clearfund",
                    "shared_expenses": [
                        {"name": activities[0]["name"], "annual_cost": activities[0]["annual_cost"], "frequency": "monthly"},
                        {"name": activities[1]["name"], "annual_cost": activities[1]["annual_cost"], "frequency": "monthly"},
                        {"name": "Summer Camp", "annual_cost": 3000, "frequency": "annual"},
                    ],
                },
                "16": {"primary_method": "commonground", "response_time": "24_hours", "emergency_contact": "phone", "communication_tone": "business_like"},
                "17": {"dispute_process": "mediation_first", "mediator_selection": "mutual_agreement", "cost_sharing": "50/50"},
                "18": {"modification_process": "mutual_written_consent", "review_frequency": "annual"},
            }

            section_content = {
                "1": f"This Parenting Agreement is entered into by {a_first} {a_last} (Parent A) and {b_first} {b_last} (Parent B) regarding the care and custody of their {'child' if num_children == 1 else 'children'}, {children_names_str}. Both parents reside in the state of California.",
                "2": f"The parties shall share joint legal custody of {children_names_str}. Both parents have equal rights and responsibilities to make major decisions affecting the children's welfare, education, health, and religious upbringing.",
                "3": f"The parties agree to share joint physical custody of {children_names_str}. The children shall spend approximately equal time with each parent under a week-on/week-off arrangement.",
                "4": f"The regular parenting time schedule follows a week-on/week-off pattern. Transitions occur every Sunday at 6:00 PM. Parents alternate weekly custody of {children_names_str}.",
                "5": f"Holiday parenting time is allocated on an alternating basis. Thanksgiving, Easter, and July 4th alternate yearly. Christmas Eve is with Parent A and Christmas Day with Parent B each year. {child1_name}'s birthday alternates.",
                "6": f"Each parent is entitled to two weeks of vacation time with {children_names_str} per year. A minimum of 30 days advance written notice is required.",
                "7": f"Spring break alternates between parents each year. Winter break is split equally. Each parent may take two consecutive weeks during summer break.",
                "8": f"Custody exchanges take place at {EXCHANGE_LOCATIONS[i % len(EXCHANGE_LOCATIONS)]}. Transportation is shared. All transition communication goes through CommonGround.",
                "9": f"All major decisions regarding {children_names_str} require mutual consent of both parents. Disagreements go to mediation first.",
                "10": f"Educational decisions for {children_names_str}, including school selection, require mutual consent from both parents.",
                "11": f"Routine medical decisions may be made by either parent. Major medical decisions require mutual consent. Parent A maintains health insurance.",
                "12": f"Both parents agree to respect each other's religious beliefs. Religious education decisions for {children_names_str} require mutual consent.",
                "13": f"{children_names_str} participates in {' and '.join(a['name'] for a in activities)}. Activity costs shared equally.",
                "14": f"Parent A shall pay ${support_amount} per month in child support to Parent B via ClearFund.",
                "15": f"Extraordinary expenses (medical, education, extracurricular) shared 50/50. Reimbursement within 30 days via ClearFund.",
                "16": f"All non-emergency communication through CommonGround. 24-hour response expected. Emergency: phone.",
                "17": f"Disputes: CommonGround first, then mediation (50/50 cost), then court.",
                "18": f"Agreement modifiable by mutual written consent. Annual review. Changes documented through CommonGround.",
            }

            for template in SECTION_TEMPLATES:
                sec_num = template["section_number"]
                section = AgreementSection(
                    id=str(uuid4()),
                    agreement_id=agreement.id,
                    section_number=sec_num,
                    section_title=template["section_title"],
                    section_type=template["section_type"],
                    display_order=template["display_order"],
                    is_required=template["is_required"],
                    content=section_content.get(sec_num, template["template"]),
                    structured_data=section_structured_data.get(sec_num),
                    is_completed=True,
                )
                db.add(section)

            # Approve + activate
            agreement.status = "pending_approval"
            agreement.petitioner_approved = True
            agreement.petitioner_approved_at = datetime.utcnow()
            agreement.petitioner_approval_ip = "127.0.0.1"
            agreement.respondent_approved = True
            agreement.respondent_approved_at = datetime.utcnow()
            agreement.respondent_approval_ip = "127.0.0.1"
            agreement.status = "approved"
            await db.flush()

            from app.services.agreement_activation import AgreementActivationService
            activation_service = AgreementActivationService(db)
            try:
                activation_result = await activation_service.activate_agreement(
                    agreement=agreement, activated_by=str(parent_a.id),
                )
                agreement.status = "active"
                agreement.effective_date = datetime.utcnow()
                logger.info(
                    "Comprehensive agreement activated for family %d: exchanges=%s, obligations=%s",
                    i + 1, getattr(activation_result, "exchanges_created", "?"),
                    getattr(activation_result, "recurring_obligations_created", "?"),
                )
            except Exception as e:
                logger.error("Agreement activation failed for family %d: %s", i + 1, e)
                agreement.status = "active"
                agreement.effective_date = datetime.utcnow()

        # Create BugHuntFamily record
        bh_family = BugHuntFamily(
            id=str(uuid4()),
            cohort_id=cohort_id,
            family_file_id=ff_id,
            parent_a_email=pa_email,
            parent_a_password=pa_password,
            parent_b_email=pb_email,
            parent_b_password=pb_password,
            parent_a_name=f"{a_first} {a_last}",
            parent_b_name=f"{b_first} {b_last}",
            children_names=child_names,
            test_status="pending",
        )
        db.add(bh_family)
        created_families.append(bh_family)
        if not supabase_created:
            synthetic_id_families.append(i + 1)

    if synthetic_id_families:
        logger.error(
            "Cohort %s: %d/%d families have synthetic Supabase IDs (families: %s). "
            "These accounts cannot be used for actual login.",
            cohort_id, len(synthetic_id_families), len(created_families), synthetic_id_families,
        )

    # Send the first family's case to a seeded firm/professional so the
    # professional portal can be tested end-to-end. Done for the "professional"
    # and "general" cohorts; best-effort (never aborts the family seed).
    professional_info = None
    if cohort.target_feature in ("professional", "general") and created_families:
        try:
            professional_info = await _seed_professional(
                db, short_id, created_families, admin_client, settings
            )
        except Exception as e:
            logger.error("Bug hunt: professional seeding failed: %s", e)

    # Update cohort status
    cohort.status = "active"
    cohort.started_at = datetime.utcnow()
    cohort.seed_config = {
        "target_feature": cohort.target_feature,
        "family_count": cohort.family_count,
        "generated_at": datetime.utcnow().isoformat(),
        "synthetic_id_families": synthetic_id_families,
        "families": family_configs,
        "professional": professional_info,
    }

    await db.flush()
    return created_families


async def get_cohort_dashboard(db: AsyncSession, cohort_id: str) -> dict:
    """Get full cohort dashboard data."""
    cohort = await db.get(BugHuntCohort, cohort_id)
    if not cohort:
        raise ValueError(f"Cohort {cohort_id} not found")

    # Fetch all related data
    families_q = await db.execute(
        select(BugHuntFamily).where(BugHuntFamily.cohort_id == cohort_id).order_by(BugHuntFamily.created_at)
    )
    families = families_q.scalars().all()

    checklist_q = await db.execute(
        select(BugHuntChecklistItem).where(BugHuntChecklistItem.cohort_id == cohort_id).order_by(BugHuntChecklistItem.display_order)
    )
    checklist = checklist_q.scalars().all()

    bugs_q = await db.execute(
        select(BugHuntBugReport).where(BugHuntBugReport.cohort_id == cohort_id).order_by(desc(BugHuntBugReport.created_at))
    )
    bug_reports = bugs_q.scalars().all()

    feedback_q = await db.execute(
        select(BugHuntFeedback).where(BugHuntFeedback.cohort_id == cohort_id).order_by(desc(BugHuntFeedback.created_at))
    )
    feedback_items = feedback_q.scalars().all()

    notes_q = await db.execute(
        select(BugHuntNote).where(BugHuntNote.cohort_id == cohort_id).order_by(desc(BugHuntNote.created_at))
    )
    notes = notes_q.scalars().all()

    testers_q = await db.execute(
        select(BugHuntTester).where(BugHuntTester.cohort_id == cohort_id)
    )
    testers = testers_q.scalars().all()
    tester_map = {t.id: t for t in testers}
    tester_by_family = {t.family_id: t for t in testers}

    # Compute stats
    completed_families = sum(1 for f in families if f.test_status == "completed")
    completed_checklist = sum(1 for c in checklist if c.is_completed)
    bugs_by_severity = {}
    for b in bug_reports:
        bugs_by_severity[b.severity] = bugs_by_severity.get(b.severity, 0) + 1

    ratings = [f.rating for f in feedback_items if f.rating is not None]
    avg_rating = sum(ratings) / len(ratings) if ratings else None

    def _serialize_cohort(c: BugHuntCohort) -> dict:
        return {
            "id": c.id, "name": c.name, "description": c.description,
            "target_feature": c.target_feature, "status": c.status,
            "family_count": c.family_count, "test_instructions": c.test_instructions,
            "created_by": c.created_by, "started_at": c.started_at.isoformat() if c.started_at else None,
            "completed_at": c.completed_at.isoformat() if c.completed_at else None,
            "seed_config": c.seed_config, "summary_json": c.summary_json,
            "created_at": c.created_at.isoformat(), "updated_at": c.updated_at.isoformat(),
        }

    def _serialize_tester(t: BugHuntTester) -> dict:
        return {
            "id": t.id, "cohort_id": t.cohort_id, "family_id": t.family_id,
            "tester_name": t.tester_name, "tester_email": t.tester_email,
            "status": t.status,
            "first_accessed_at": t.first_accessed_at.isoformat() if t.first_accessed_at else None,
            "last_accessed_at": t.last_accessed_at.isoformat() if t.last_accessed_at else None,
            "email_sent_at": t.email_sent_at.isoformat() if t.email_sent_at else None,
            "created_at": t.created_at.isoformat(),
        }

    # Build per-family config lookup from seed_config
    _family_configs = (cohort.seed_config or {}).get("families", [])
    _family_config_by_idx = {fc["index"]: fc for fc in _family_configs}

    def _serialize_family(f: BugHuntFamily, idx: int) -> dict:
        t = tester_by_family.get(f.id)
        fc = _family_config_by_idx.get(idx, {})
        return {
            "id": f.id, "cohort_id": f.cohort_id, "family_file_id": f.family_file_id,
            "parent_a_email": f.parent_a_email, "parent_a_password": f.parent_a_password,
            "parent_b_email": f.parent_b_email, "parent_b_password": f.parent_b_password,
            "parent_a_name": f.parent_a_name, "parent_b_name": f.parent_b_name,
            "children_names": f.children_names or [], "test_status": f.test_status,
            "tester_notes": f.tester_notes, "created_at": f.created_at.isoformat(),
            "tester": _serialize_tester(t) if t else None,
            "agreement_version": fc.get("agreement_version"),
            "subscription_tier": fc.get("subscription_tier"),
        }

    def _serialize_checklist(c: BugHuntChecklistItem) -> dict:
        t = tester_map.get(c.tester_id) if c.tester_id else None
        return {
            "id": c.id, "cohort_id": c.cohort_id, "title": c.title,
            "description": c.description, "display_order": c.display_order,
            "is_completed": c.is_completed, "completed_by": c.completed_by,
            "tester_id": c.tester_id,
            "tester_name": t.tester_name if t else None,
            "completed_at": c.completed_at.isoformat() if c.completed_at else None,
            "created_at": c.created_at.isoformat(),
        }

    def _serialize_bug(b: BugHuntBugReport) -> dict:
        t = tester_map.get(b.tester_id) if b.tester_id else None
        return {
            "id": b.id, "cohort_id": b.cohort_id, "family_id": b.family_id,
            "reported_by": b.reported_by, "tester_id": b.tester_id,
            "tester_name": t.tester_name if t else None,
            "title": b.title, "description": b.description,
            "severity": b.severity, "status": b.status,
            "sentry_issue_id": b.sentry_issue_id, "steps_to_reproduce": b.steps_to_reproduce,
            "screenshot_urls": b.screenshot_urls or [], "created_at": b.created_at.isoformat(),
        }

    def _serialize_feedback(f: BugHuntFeedback) -> dict:
        t = tester_map.get(f.tester_id) if f.tester_id else None
        return {
            "id": f.id, "cohort_id": f.cohort_id, "family_id": f.family_id,
            "submitted_by": f.submitted_by, "tester_id": f.tester_id,
            "tester_name": t.tester_name if t else None,
            "rating": f.rating, "category": f.category,
            "content": f.content, "feature_area": f.feature_area,
            "created_at": f.created_at.isoformat(),
        }

    def _serialize_note(n: BugHuntNote) -> dict:
        t = tester_map.get(n.tester_id) if n.tester_id else None
        return {
            "id": n.id, "cohort_id": n.cohort_id, "family_id": n.family_id,
            "author_id": n.author_id, "tester_id": n.tester_id,
            "tester_name": t.tester_name if t else None,
            "content": n.content, "note_type": n.note_type,
            "created_at": n.created_at.isoformat(),
        }

    testers_active = sum(1 for t in testers if t.status == "active")

    return {
        "cohort": _serialize_cohort(cohort),
        "families": [_serialize_family(f, idx) for idx, f in enumerate(families)],
        "checklist": [_serialize_checklist(c) for c in checklist],
        "bug_reports": [_serialize_bug(b) for b in bug_reports],
        "feedback": [_serialize_feedback(f) for f in feedback_items],
        "notes": [_serialize_note(n) for n in notes],
        "testers": [_serialize_tester(t) for t in testers],
        "stats": {
            "families_total": len(families),
            "families_completed": completed_families,
            "checklist_total": len(checklist),
            "checklist_completed": completed_checklist,
            "bugs_total": len(bug_reports),
            "bugs_by_severity": bugs_by_severity,
            "feedback_total": len(feedback_items),
            "avg_rating": round(avg_rating, 1) if avg_rating else None,
            "testers_total": len(testers),
            "testers_active": testers_active,
        },
    }


async def list_cohorts(
    db: AsyncSession,
    status_filter: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
) -> list[dict]:
    """List cohorts with summary counts."""
    query = select(BugHuntCohort).order_by(desc(BugHuntCohort.created_at))
    if status_filter:
        query = query.where(BugHuntCohort.status == status_filter)
    query = query.limit(limit).offset(offset)

    result = await db.execute(query)
    cohorts = result.scalars().all()

    items = []
    for c in cohorts:
        # Get quick counts
        family_count_q = await db.execute(
            select(func.count()).select_from(BugHuntFamily).where(BugHuntFamily.cohort_id == c.id)
        )
        bug_count_q = await db.execute(
            select(func.count()).select_from(BugHuntBugReport).where(BugHuntBugReport.cohort_id == c.id)
        )
        checklist_total_q = await db.execute(
            select(func.count()).select_from(BugHuntChecklistItem).where(BugHuntChecklistItem.cohort_id == c.id)
        )
        checklist_done_q = await db.execute(
            select(func.count()).select_from(BugHuntChecklistItem).where(
                BugHuntChecklistItem.cohort_id == c.id,
                BugHuntChecklistItem.is_completed == True,
            )
        )

        total_cl = checklist_total_q.scalar() or 0
        done_cl = checklist_done_q.scalar() or 0
        progress = round((done_cl / total_cl) * 100) if total_cl > 0 else 0

        items.append({
            "id": c.id, "name": c.name, "description": c.description,
            "target_feature": c.target_feature, "status": c.status,
            "family_count": c.family_count, "test_instructions": c.test_instructions,
            "created_by": c.created_by,
            "started_at": c.started_at.isoformat() if c.started_at else None,
            "completed_at": c.completed_at.isoformat() if c.completed_at else None,
            "seed_config": c.seed_config, "summary_json": c.summary_json,
            "created_at": c.created_at.isoformat(), "updated_at": c.updated_at.isoformat(),
            "families_count": family_count_q.scalar() or 0,
            "bugs_count": bug_count_q.scalar() or 0,
            "checklist_progress": progress,
        })

    return items


async def add_checklist_item(
    db: AsyncSession, cohort_id: str, title: str, description: Optional[str] = None,
) -> BugHuntChecklistItem:
    """Add a new checklist item."""
    # Get max display_order
    max_q = await db.execute(
        select(func.max(BugHuntChecklistItem.display_order)).where(
            BugHuntChecklistItem.cohort_id == cohort_id
        )
    )
    max_order = max_q.scalar() or 0

    item = BugHuntChecklistItem(
        id=str(uuid4()),
        cohort_id=cohort_id,
        title=title,
        description=description,
        display_order=max_order + 1,
    )
    db.add(item)
    await db.flush()
    return item


async def toggle_checklist_item(
    db: AsyncSession, item_id: str, admin_user: User,
) -> BugHuntChecklistItem:
    """Toggle a checklist item's completion status."""
    item = await db.get(BugHuntChecklistItem, item_id)
    if not item:
        raise ValueError(f"Checklist item {item_id} not found")

    item.is_completed = not item.is_completed
    if item.is_completed:
        item.completed_by = str(admin_user.id)
        item.completed_at = datetime.utcnow()
    else:
        item.completed_by = None
        item.completed_at = None

    await db.flush()
    return item


async def add_note(
    db: AsyncSession,
    cohort_id: str,
    author_id: str,
    content: str,
    note_type: str = "observation",
    family_id: Optional[str] = None,
) -> BugHuntNote:
    """Add a note to the cohort."""
    note = BugHuntNote(
        id=str(uuid4()),
        cohort_id=cohort_id,
        family_id=family_id,
        author_id=author_id,
        content=content,
        note_type=note_type,
    )
    db.add(note)
    await db.flush()
    return note


async def add_bug_report(
    db: AsyncSession,
    cohort_id: str,
    reported_by: str,
    title: str,
    description: str,
    severity: str = "medium",
    family_id: Optional[str] = None,
    steps_to_reproduce: Optional[str] = None,
) -> BugHuntBugReport:
    """Add a bug report to the cohort."""
    report = BugHuntBugReport(
        id=str(uuid4()),
        cohort_id=cohort_id,
        family_id=family_id,
        reported_by=reported_by,
        title=title,
        description=description,
        severity=severity,
        steps_to_reproduce=steps_to_reproduce,
    )
    db.add(report)
    await db.flush()
    return report


async def update_bug_status(
    db: AsyncSession, bug_id: str, status: str,
) -> BugHuntBugReport:
    """Update the status of a bug report."""
    bug = await db.get(BugHuntBugReport, bug_id)
    if not bug:
        raise ValueError(f"Bug report {bug_id} not found")
    if status not in VALID_BUG_STATUSES:
        raise ValueError(f"Invalid bug status: {status}")
    bug.status = status
    await db.flush()
    return bug


async def add_feedback(
    db: AsyncSession,
    cohort_id: str,
    submitted_by: str,
    content: str,
    category: str = "other",
    rating: Optional[int] = None,
    family_id: Optional[str] = None,
    feature_area: Optional[str] = None,
) -> BugHuntFeedback:
    """Add feedback to the cohort."""
    fb = BugHuntFeedback(
        id=str(uuid4()),
        cohort_id=cohort_id,
        family_id=family_id,
        submitted_by=submitted_by,
        rating=rating,
        category=category,
        content=content,
        feature_area=feature_area,
    )
    db.add(fb)
    await db.flush()
    return fb


async def complete_cohort(
    db: AsyncSession, cohort_id: str,
) -> BugHuntCohort:
    """Complete a bug hunt cohort and generate summary."""
    cohort = await db.get(BugHuntCohort, cohort_id)
    if not cohort:
        raise ValueError(f"Cohort {cohort_id} not found")
    if cohort.status not in ("active", "seeding"):
        raise ValueError(f"Cannot complete a cohort in '{cohort.status}' status")

    # Gather stats for summary
    dashboard = await get_cohort_dashboard(db, cohort_id)
    stats = dashboard["stats"]

    cohort.status = "completed"
    cohort.completed_at = datetime.utcnow()
    cohort.summary_json = {
        "families_tested": stats["families_total"],
        "families_completed": stats["families_completed"],
        "checklist_completed": f"{stats['checklist_completed']}/{stats['checklist_total']}",
        "bugs_found": stats["bugs_total"],
        "bugs_by_severity": stats["bugs_by_severity"],
        "feedback_received": stats["feedback_total"],
        "avg_rating": stats["avg_rating"],
        "duration_hours": None,
    }

    if cohort.started_at:
        duration = (cohort.completed_at - cohort.started_at).total_seconds() / 3600
        cohort.summary_json["duration_hours"] = round(duration, 1)

    await db.flush()
    return cohort


VALID_TEST_STATUSES = {"pending", "in_progress", "completed", "blocked"}
VALID_BUG_STATUSES = {"open", "confirmed", "fixed", "wont_fix"}


async def update_family_status(
    db: AsyncSession,
    family_id: str,
    test_status: str,
    tester_notes: Optional[str] = None,
    cohort_id: Optional[str] = None,
) -> BugHuntFamily:
    """Update a family's test status and notes."""
    family = await db.get(BugHuntFamily, family_id)
    if not family:
        raise ValueError(f"Family {family_id} not found")
    if cohort_id and family.cohort_id != cohort_id:
        raise ValueError("Family does not belong to this cohort")
    if test_status not in VALID_TEST_STATUSES:
        raise ValueError(f"Invalid status: {test_status}")
    family.test_status = test_status
    if tester_notes is not None:
        family.tester_notes = tester_notes
    await db.flush()
    return family


# ── Tester Assignment Functions ──────────────────────────────────────


async def assign_tester(
    db: AsyncSession,
    cohort_id: str,
    family_id: str,
    tester_name: str,
    tester_email: str,
    expiry_days: int = 7,
) -> BugHuntTester:
    """Assign a real-world tester to a bug hunt family."""
    import secrets

    # Check family exists and belongs to cohort
    family = await db.get(BugHuntFamily, family_id)
    if not family or family.cohort_id != cohort_id:
        raise ValueError("Family not found in this cohort")

    # Check if family already has a tester
    existing_q = await db.execute(
        select(BugHuntTester).where(
            BugHuntTester.family_id == family_id,
            BugHuntTester.status != "revoked",
        )
    )
    if existing_q.scalar_one_or_none():
        raise ValueError("Family already has an active tester assigned")

    tester = BugHuntTester(
        id=str(uuid4()),
        cohort_id=cohort_id,
        family_id=family_id,
        tester_name=tester_name,
        tester_email=tester_email,
        access_token=secrets.token_urlsafe(48),
        token_expires_at=datetime.utcnow() + timedelta(days=expiry_days),
        status="invited",
    )
    db.add(tester)
    await db.flush()
    return tester


async def get_tester_by_token(db: AsyncSession, token: str) -> Optional[BugHuntTester]:
    """Look up a tester by access token, validating expiry and status."""
    result = await db.execute(
        select(BugHuntTester).where(BugHuntTester.access_token == token)
    )
    tester = result.scalar_one_or_none()
    if not tester:
        return None
    if tester.status == "revoked":
        return None
    if tester.token_expires_at < datetime.utcnow():
        return None
    return tester


async def get_tester_dashboard(db: AsyncSession, tester: BugHuntTester) -> dict:
    """Get dashboard data for a public tester page."""
    cohort = await db.get(BugHuntCohort, tester.cohort_id)
    family = await db.get(BugHuntFamily, tester.family_id)

    # Get checklist for the cohort
    checklist_q = await db.execute(
        select(BugHuntChecklistItem).where(
            BugHuntChecklistItem.cohort_id == tester.cohort_id
        ).order_by(BugHuntChecklistItem.display_order)
    )
    checklist = checklist_q.scalars().all()

    # Get bugs for this family
    bugs_q = await db.execute(
        select(BugHuntBugReport).where(
            BugHuntBugReport.cohort_id == tester.cohort_id,
            BugHuntBugReport.family_id == tester.family_id,
        ).order_by(desc(BugHuntBugReport.created_at))
    )
    bugs = bugs_q.scalars().all()

    # Get feedback for this family
    feedback_q = await db.execute(
        select(BugHuntFeedback).where(
            BugHuntFeedback.cohort_id == tester.cohort_id,
            BugHuntFeedback.family_id == tester.family_id,
        ).order_by(desc(BugHuntFeedback.created_at))
    )
    feedback_items = feedback_q.scalars().all()

    # Get notes for this family
    notes_q = await db.execute(
        select(BugHuntNote).where(
            BugHuntNote.cohort_id == tester.cohort_id,
            BugHuntNote.family_id == tester.family_id,
        ).order_by(desc(BugHuntNote.created_at))
    )
    notes = notes_q.scalars().all()

    # Look up per-family config from seed_config
    _family_configs = (cohort.seed_config or {}).get("families", [])
    # Find config matching this family by looking up all families in order
    _families_q = await db.execute(
        select(BugHuntFamily).where(BugHuntFamily.cohort_id == tester.cohort_id).order_by(BugHuntFamily.created_at)
    )
    _all_families = _families_q.scalars().all()
    _family_idx = next((idx for idx, f in enumerate(_all_families) if f.id == family.id), None)
    _fc = {}
    if _family_idx is not None:
        _fc = next((fc for fc in _family_configs if fc.get("index") == _family_idx), {})

    return {
        "tester": {
            "id": tester.id, "tester_name": tester.tester_name,
            "tester_email": tester.tester_email, "status": tester.status,
        },
        "cohort": {
            "id": cohort.id, "name": cohort.name, "description": cohort.description,
            "target_feature": cohort.target_feature, "status": cohort.status,
            "test_instructions": cohort.test_instructions,
        },
        "family": {
            "id": family.id, "parent_a_email": family.parent_a_email,
            "parent_a_password": family.parent_a_password,
            "parent_b_email": family.parent_b_email,
            "parent_b_password": family.parent_b_password,
            "parent_a_name": family.parent_a_name,
            "parent_b_name": family.parent_b_name,
            "children_names": family.children_names or [],
            "agreement_version": _fc.get("agreement_version"),
            "subscription_tier": _fc.get("subscription_tier"),
        },
        "checklist": [{
            "id": c.id, "title": c.title, "description": c.description,
            "display_order": c.display_order, "is_completed": c.is_completed,
            "completed_at": c.completed_at.isoformat() if c.completed_at else None,
        } for c in checklist],
        "bug_reports": [{
            "id": b.id, "title": b.title, "description": b.description,
            "severity": b.severity, "status": b.status,
            "steps_to_reproduce": b.steps_to_reproduce,
            "created_at": b.created_at.isoformat(),
        } for b in bugs],
        "feedback": [{
            "id": f.id, "rating": f.rating, "category": f.category,
            "content": f.content, "feature_area": f.feature_area,
            "created_at": f.created_at.isoformat(),
        } for f in feedback_items],
        "notes": [{
            "id": n.id, "content": n.content, "note_type": n.note_type,
            "created_at": n.created_at.isoformat(),
        } for n in notes],
    }


async def tester_toggle_checklist(
    db: AsyncSession, tester: BugHuntTester, item_id: str,
) -> BugHuntChecklistItem:
    """Toggle a checklist item as a tester."""
    item = await db.get(BugHuntChecklistItem, item_id)
    if not item or item.cohort_id != tester.cohort_id:
        raise ValueError("Checklist item not found")

    item.is_completed = not item.is_completed
    if item.is_completed:
        item.tester_id = tester.id
        item.completed_at = datetime.utcnow()
    else:
        item.tester_id = None
        item.completed_by = None
        item.completed_at = None

    await db.flush()
    return item


async def tester_add_bug_report(
    db: AsyncSession,
    tester: BugHuntTester,
    title: str,
    description: str,
    severity: str = "medium",
    steps_to_reproduce: Optional[str] = None,
    screenshot_urls: Optional[list] = None,
) -> BugHuntBugReport:
    """Submit a bug report as a tester."""
    report = BugHuntBugReport(
        id=str(uuid4()),
        cohort_id=tester.cohort_id,
        family_id=tester.family_id,
        tester_id=tester.id,
        title=title,
        description=description,
        severity=severity,
        steps_to_reproduce=steps_to_reproduce,
        screenshot_urls=screenshot_urls,
    )
    db.add(report)
    await db.flush()
    return report


async def tester_add_feedback(
    db: AsyncSession,
    tester: BugHuntTester,
    content: str,
    category: str = "other",
    rating: Optional[int] = None,
    feature_area: Optional[str] = None,
) -> BugHuntFeedback:
    """Submit feedback as a tester."""
    fb = BugHuntFeedback(
        id=str(uuid4()),
        cohort_id=tester.cohort_id,
        family_id=tester.family_id,
        tester_id=tester.id,
        rating=rating,
        category=category,
        content=content,
        feature_area=feature_area,
    )
    db.add(fb)
    await db.flush()
    return fb


async def tester_add_note(
    db: AsyncSession,
    tester: BugHuntTester,
    content: str,
    note_type: str = "observation",
) -> BugHuntNote:
    """Add a note as a tester."""
    note = BugHuntNote(
        id=str(uuid4()),
        cohort_id=tester.cohort_id,
        family_id=tester.family_id,
        tester_id=tester.id,
        content=content,
        note_type=note_type,
    )
    db.add(note)
    await db.flush()
    return note


async def revoke_tester(db: AsyncSession, tester_id: str) -> BugHuntTester:
    """Revoke a tester's access."""
    tester = await db.get(BugHuntTester, tester_id)
    if not tester:
        raise ValueError(f"Tester {tester_id} not found")
    tester.status = "revoked"
    await db.flush()
    return tester


async def resend_tester_invite(db: AsyncSession, tester_id: str, expiry_days: int = 7) -> BugHuntTester:
    """Regenerate token and mark for resend."""
    import secrets
    tester = await db.get(BugHuntTester, tester_id)
    if not tester:
        raise ValueError(f"Tester {tester_id} not found")
    tester.access_token = secrets.token_urlsafe(48)
    tester.token_expires_at = datetime.utcnow() + timedelta(days=expiry_days)
    tester.status = "invited"
    await db.flush()
    return tester


async def generate_ai_overview(db: AsyncSession, cohort_id: str) -> dict:
    """Generate an AI-powered analysis of a bug hunt cohort using Claude."""
    import json as json_mod

    dashboard = await get_cohort_dashboard(db, cohort_id)
    cohort_data = dashboard["cohort"]
    stats = dashboard["stats"]

    # Build context for the AI
    checklist_summary = []
    for item in dashboard["checklist"]:
        status = "completed" if item["is_completed"] else "incomplete"
        by = item.get("tester_name") or ("Admin" if item.get("completed_by") else "nobody")
        checklist_summary.append(f"- [{status}] {item['title']} (by {by})")

    bug_summary = []
    for bug in dashboard["bug_reports"]:
        by = bug.get("tester_name") or "Admin"
        bug_summary.append(f"- [{bug['severity'].upper()}] [{bug['status']}] {bug['title']}: {bug['description'][:200]} (reported by {by})")

    feedback_summary = []
    for fb in dashboard["feedback"]:
        rating = f"Rating: {fb['rating']}/5" if fb.get("rating") else "No rating"
        by = fb.get("tester_name") or "Admin"
        feedback_summary.append(f"- [{fb['category']}] {rating} — {fb['content'][:200]} (by {by})")

    notes_summary = []
    for note in dashboard["notes"]:
        by = note.get("tester_name") or "Admin"
        notes_summary.append(f"- [{note['note_type']}] {note['content'][:200]} (by {by})")

    tester_summary = []
    for t in dashboard.get("testers", []):
        tester_summary.append(f"- {t['tester_name']} ({t['tester_email']}): status={t['status']}, first_access={t.get('first_accessed_at') or 'never'}")

    prompt = f"""Analyze this Bug Hunt QA testing session and provide a structured overview.

BUG HUNT: {cohort_data['name']}
Description: {cohort_data.get('description') or 'N/A'}
Target Feature: {cohort_data['target_feature']}
Status: {cohort_data['status']}

STATS:
- Families: {stats['families_total']} total, {stats['families_completed']} completed
- Checklist: {stats['checklist_completed']}/{stats['checklist_total']} items done
- Bugs Found: {stats['bugs_total']} (by severity: {stats['bugs_by_severity']})
- Feedback: {stats['feedback_total']} entries, avg rating: {stats.get('avg_rating') or 'N/A'}
- Testers: {stats.get('testers_total', 0)} assigned, {stats.get('testers_active', 0)} active

CHECKLIST ITEMS:
{chr(10).join(checklist_summary) if checklist_summary else 'No checklist items'}

BUG REPORTS:
{chr(10).join(bug_summary) if bug_summary else 'No bugs reported'}

FEEDBACK:
{chr(10).join(feedback_summary) if feedback_summary else 'No feedback'}

TESTER NOTES:
{chr(10).join(notes_summary) if notes_summary else 'No notes'}

TESTERS:
{chr(10).join(tester_summary) if tester_summary else 'No testers assigned'}

Respond with a JSON object (no markdown, just raw JSON) with these fields:
{{
  "executive_summary": "2-3 sentence overview of the testing session results",
  "key_findings": ["finding 1", "finding 2", ...],
  "bug_patterns": ["pattern 1", "pattern 2", ...],
  "ux_themes": ["theme 1", "theme 2", ...],
  "action_items": [
    {{"priority": "high|medium|low", "action": "description", "category": "bug_fix|ux_improvement|investigation|documentation"}},
    ...
  ],
  "tester_engagement": "assessment of tester participation and coverage",
  "overall_health": "healthy|needs_attention|critical"
}}"""

    try:
        from app.core.ai_clients import get_async_anthropic

        client = get_async_anthropic()
        response = await client.messages.create(
            model="claude-sonnet-4-5-20250514",
            max_tokens=4096,
            messages=[{"role": "user", "content": prompt}],
        )
        text = response.content[0].text.strip()

        # Parse JSON from response (handle markdown code blocks)
        if text.startswith("```"):
            text = text.split("\n", 1)[1].rsplit("```", 1)[0].strip()
        analysis = json_mod.loads(text)
    except Exception as e:
        logger.error("AI overview generation failed: %s", e)
        analysis = {
            "executive_summary": f"AI analysis unavailable: {type(e).__name__}",
            "key_findings": [],
            "bug_patterns": [],
            "ux_themes": [],
            "action_items": [],
            "tester_engagement": "Unable to assess",
            "overall_health": "needs_attention",
            "error": str(e),
        }

    # Store in cohort summary_json
    cohort = await db.get(BugHuntCohort, cohort_id)
    if cohort:
        existing = cohort.summary_json or {}
        existing["ai_overview"] = analysis
        existing["ai_generated_at"] = datetime.utcnow().isoformat()
        cohort.summary_json = existing
        await db.flush()

    return analysis


async def delete_cohort(db: AsyncSession, cohort_id: str) -> bool:
    """Delete a cohort and all related data. Optionally clean up Supabase users."""
    cohort = await db.get(BugHuntCohort, cohort_id)
    if not cohort:
        raise ValueError(f"Cohort {cohort_id} not found")

    # Try to clean up Supabase auth users
    try:
        from app.core.supabase import get_supabase_admin_client
        admin_client = get_supabase_admin_client()

        families_q = await db.execute(
            select(BugHuntFamily).where(BugHuntFamily.cohort_id == cohort_id)
        )
        families = families_q.scalars().all()

        for family in families:
            # Look up User records by email to get supabase_id
            for email in [family.parent_a_email, family.parent_b_email]:
                user_q = await db.execute(
                    select(User).where(User.email == email)
                )
                user = user_q.scalar_one_or_none()
                if user and user.supabase_id:
                    try:
                        admin_client.auth.admin.delete_user(user.supabase_id)
                    except Exception:
                        pass  # Best effort cleanup

        # Clean up the seeded professional's Supabase user too.
        pro = (cohort.seed_config or {}).get("professional") if isinstance(cohort.seed_config, dict) else None
        if pro and pro.get("email"):
            pu = (await db.execute(select(User).where(User.email == pro["email"]))).scalar_one_or_none()
            if pu and pu.supabase_id:
                try:
                    admin_client.auth.admin.delete_user(pu.supabase_id)
                except Exception:
                    pass
    except Exception as e:
        logger.warning("Failed to cleanup Supabase users: %s", e)

    # Delete the cohort (cascades to all child tables)
    await db.delete(cohort)
    await db.flush()
    return True
