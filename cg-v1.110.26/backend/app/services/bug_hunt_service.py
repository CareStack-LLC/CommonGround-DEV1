"""Bug Hunt Cohort service - manages organized QA testing sessions."""

import logging
from datetime import datetime
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


async def generate_seed_families(
    db: AsyncSession,
    cohort_id: str,
) -> list[BugHuntFamily]:
    """Generate seed families with Supabase auth accounts and linked data."""
    from app.core.supabase import get_supabase_admin_client

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

    for i in range(cohort.family_count):
        idx = i % len(PARENT_A_NAMES)
        a_first, a_last = PARENT_A_NAMES[idx]
        b_first, b_last = PARENT_B_NAMES[idx]

        pa_email = f"bh-{short_id}-a{i+1}@cg-qa.com"
        pb_email = f"bh-{short_id}-b{i+1}@cg-qa.com"
        pa_password = f"BugHunt#{i+1}!2026"
        pb_password = f"BugHunt#{i+1}!2026b"

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
            logger.warning("Supabase user creation failed for family %d: %s. Using synthetic IDs.", i + 1, e)
            pa_supabase_id = str(uuid4())
            pb_supabase_id = str(uuid4())

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

        # Create UserProfile records
        pa_profile = UserProfile(
            id=str(uuid4()),
            user_id=pa_id,
            subscription_tier="complete",
            subscription_status="active",
        )
        pb_profile = UserProfile(
            id=str(uuid4()),
            user_id=pb_id,
            subscription_tier="complete",
            subscription_status="active",
        )
        db.add(pa_profile)
        db.add(pb_profile)

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

        # Create 1-2 children
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

        if cohort.target_feature in ("agreement", "general"):
            from app.models.agreement import Agreement
            agreement = Agreement(
                id=str(uuid4()),
                family_file_id=ff_id,
                agreement_type="shared_care",
                agreement_version="v2_standard",
                title=f"{a_last}-{b_last} SharedCare Agreement",
                status="draft",
            )
            db.add(agreement)

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

    # Update cohort status
    cohort.status = "active"
    cohort.started_at = datetime.utcnow()
    cohort.seed_config = {
        "target_feature": cohort.target_feature,
        "family_count": cohort.family_count,
        "generated_at": datetime.utcnow().isoformat(),
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

    def _serialize_family(f: BugHuntFamily) -> dict:
        return {
            "id": f.id, "cohort_id": f.cohort_id, "family_file_id": f.family_file_id,
            "parent_a_email": f.parent_a_email, "parent_a_password": f.parent_a_password,
            "parent_b_email": f.parent_b_email, "parent_b_password": f.parent_b_password,
            "parent_a_name": f.parent_a_name, "parent_b_name": f.parent_b_name,
            "children_names": f.children_names or [], "test_status": f.test_status,
            "tester_notes": f.tester_notes, "created_at": f.created_at.isoformat(),
        }

    def _serialize_checklist(c: BugHuntChecklistItem) -> dict:
        return {
            "id": c.id, "cohort_id": c.cohort_id, "title": c.title,
            "description": c.description, "display_order": c.display_order,
            "is_completed": c.is_completed, "completed_by": c.completed_by,
            "completed_at": c.completed_at.isoformat() if c.completed_at else None,
            "created_at": c.created_at.isoformat(),
        }

    def _serialize_bug(b: BugHuntBugReport) -> dict:
        return {
            "id": b.id, "cohort_id": b.cohort_id, "family_id": b.family_id,
            "reported_by": b.reported_by, "title": b.title, "description": b.description,
            "severity": b.severity, "status": b.status,
            "sentry_issue_id": b.sentry_issue_id, "steps_to_reproduce": b.steps_to_reproduce,
            "screenshot_urls": b.screenshot_urls or [], "created_at": b.created_at.isoformat(),
        }

    def _serialize_feedback(f: BugHuntFeedback) -> dict:
        return {
            "id": f.id, "cohort_id": f.cohort_id, "family_id": f.family_id,
            "submitted_by": f.submitted_by, "rating": f.rating, "category": f.category,
            "content": f.content, "feature_area": f.feature_area,
            "created_at": f.created_at.isoformat(),
        }

    def _serialize_note(n: BugHuntNote) -> dict:
        return {
            "id": n.id, "cohort_id": n.cohort_id, "family_id": n.family_id,
            "author_id": n.author_id, "content": n.content, "note_type": n.note_type,
            "created_at": n.created_at.isoformat(),
        }

    return {
        "cohort": _serialize_cohort(cohort),
        "families": [_serialize_family(f) for f in families],
        "checklist": [_serialize_checklist(c) for c in checklist],
        "bug_reports": [_serialize_bug(b) for b in bug_reports],
        "feedback": [_serialize_feedback(f) for f in feedback_items],
        "notes": [_serialize_note(n) for n in notes],
        "stats": {
            "families_total": len(families),
            "families_completed": completed_families,
            "checklist_total": len(checklist),
            "checklist_completed": completed_checklist,
            "bugs_total": len(bug_reports),
            "bugs_by_severity": bugs_by_severity,
            "feedback_total": len(feedback_items),
            "avg_rating": round(avg_rating, 1) if avg_rating else None,
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


async def update_family_status(
    db: AsyncSession,
    family_id: str,
    test_status: str,
    tester_notes: Optional[str] = None,
) -> BugHuntFamily:
    """Update a family's test status and notes."""
    family = await db.get(BugHuntFamily, family_id)
    if not family:
        raise ValueError(f"Family {family_id} not found")
    family.test_status = test_status
    if tester_notes is not None:
        family.tester_notes = tester_notes
    await db.flush()
    return family


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
    except Exception as e:
        logger.warning("Failed to cleanup Supabase users: %s", e)

    # Delete the cohort (cascades to all child tables)
    await db.delete(cohort)
    await db.flush()
    return True
