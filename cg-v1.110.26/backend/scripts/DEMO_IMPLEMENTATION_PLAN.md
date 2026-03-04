# Demo Data Implementation Plan

## ✅ Completed (Phase 1)

### Documentation
- **DEMO_PERSONAS.md** - Complete personas for 7 co-parent situations
  - Detailed backstories and motivations
  - 16 user accounts (14 parents + 2 from shared relationships)
  - 15 children with realistic ages and details
  - Southern California addresses across 10 cities
  - Varying custody arrangements and conflict levels
  - 16 professional firms with complete descriptions

### Framework
- **seed_demo_socal.py** - Python seeding script foundation
  - Data structures for all personas
  - Firm profiles with contact info
  - User/profile creation logic
  - Family file generation structure
  - Child creation framework

---

## 🔨 To Implement (Phase 2)

### 1. Supabase Auth Integration (Critical)

**Current Gap:** Script creates mock user IDs, not real Supabase auth users

**Needs:**
```python
from supabase import create_client, Client

async def create_auth_user(email: str, password: str) -> str:
    """Create user in Supabase Auth, return user_id"""
    supabase: Client = create_client(supabase_url, supabase_key)

    # Create auth user
    auth_response = supabase.auth.sign_up({
        "email": email,
        "password": password
    })

    return auth_response.user.id
```

**Files to modify:**
- `seed_demo_socal.py` - Add Supabase client integration
- Environment variables: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`

---

### 2. Complete Agreement Creation

**What's needed:**
- Create Agreement record for each family file
- Generate all 18 sections with realistic content
- Set approval statuses (both parents approved)
- Create initial version

**Sections to populate:**
1. Children (names, ages from child records)
2. Legal Custody (joint vs sole)
3. Physical Custody (percentages)
4. Parenting Time Schedule (2-2-3, week-on-week-off, etc.)
5. Holidays & Special Days (alternating schedule)
6. Vacation Time (summer splits)
7. Transportation & Exchanges (locations, times)
8. Communication (methods allowed)
9. Education (decision-making)
10. Healthcare (medical decisions)
11. Extracurricular Activities (approval process)
12. Religious Upbringing (guidelines)
13. Child Support (amounts from personas)
14. Expense Sharing (percentages)
15. Right of First Refusal (timeframes)
16. Relocation (notice requirements)
17. Dispute Resolution (mediation first)
18. Modifications (amendment process)

**Implementation:**
```python
async def create_agreement(session, family_file_id, custody_type, conflict_level):
    agreement = Agreement(
        id=str(uuid4()),
        family_file_id=family_file_id,
        title="Shared Care Agreement",
        agreement_type="shared_care",
        status="active",
        parent_a_approved_at=datetime.utcnow() - timedelta(days=60),
        parent_b_approved_at=datetime.utcnow() - timedelta(days=59),
        created_at=datetime.utcnow() - timedelta(days=90)
    )
    session.add(agreement)

    # Create sections
    for section_template in SHARED_CARE_SECTIONS:
        content = generate_section_content(
            section_template["type"],
            custody_type,
            conflict_level
        )
        section = AgreementSection(
            id=str(uuid4()),
            agreement_id=agreement.id,
            section_number=section_template["number"],
            title=section_template["title"],
            content=content,
            completed=True,
            created_at=datetime.utcnow() - timedelta(days=90)
        )
        session.add(section)
```

---

### 3. Quick Accord Generation

**What's needed:**
- 12-15 Quick Accords across families
- Types: holiday swaps, schedule changes, one-time adjustments
- Various statuses: pending, approved, declined, expired

**Examples:**
- "Swap Thanksgiving for Christmas Eve"
- "Extended weekend for child's birthday"
- "Change pickup time for soccer practice"
- "Summer vacation week exchange"

**Implementation:**
```python
async def create_quick_accords(session, family_file_id, parent_a_id, parent_b_id):
    accords = [
        {
            "title": "Thanksgiving/Christmas Swap 2025",
            "description": "Exchange Thanksgiving weekend for Christmas Day",
            "status": "approved",
            "created_days_ago": 45
        },
        {
            "title": "Extended Weekend for Emma's Birthday",
            "description": "Pick up Friday after school instead of Sunday",
            "status": "approved",
            "created_days_ago": 30
        },
        {
            "title": "Soccer Practice Schedule Change",
            "description": "Pickup at 5:30pm instead of 6pm on Tuesdays",
            "status": "pending",
            "created_days_ago": 7
        }
    ]

    for accord_data in accords:
        accord = QuickAccord(
            id=str(uuid4()),
            family_file_id=family_file_id,
            title=accord_data["title"],
            description=accord_data["description"],
            proposed_by=parent_a_id,
            status=accord_data["status"],
            created_at=datetime.utcnow() - timedelta(days=accord_data["created_days_ago"])
        )
        if accord_data["status"] == "approved":
            accord.approved_at = accord.created_at + timedelta(hours=6)
            accord.approved_by = parent_b_id

        session.add(accord)
```

---

### 4. Schedule Event Creation

**What's needed:**
- 50+ events across all families
- Types: activities, school, medical, exchanges, holidays
- Recurring events (weekly soccer, therapy)
- One-time events (birthday parties, school concerts)

**Event Categories:**
- **Activities**: Soccer practice, dance class, swimming lessons
- **School**: Parent-teacher conferences, school plays, field trips
- **Medical**: Doctor appointments, therapy sessions (for Chloe)
- **Exchanges**: Custody handoffs
- **Holidays**: Christmas, Thanksgiving, birthdays

**Implementation:**
```python
async def generate_schedule_events(session, family_file_id, children, custody_type):
    events = []

    # Weekly activities
    if custody_type in ["50/50", "60/40"]:
        # Soccer practice (Tuesdays & Thursdays)
        for week_offset in range(12):  # Next 12 weeks
            event = ScheduleEvent(
                id=str(uuid4()),
                family_file_id=family_file_id,
                title="Soccer Practice - Emma",
                category="activity",
                start_time=datetime.utcnow() + timedelta(days=week_offset*7, hours=17),
                end_time=datetime.utcnow() + timedelta(days=week_offset*7, hours=18, minutes=30),
                location="Irvine Youth Soccer Fields",
                is_recurring=True,
                created_at=datetime.utcnow() - timedelta(days=30)
            )
            events.append(event)

    # Medical appointments (special needs child)
    if any(child.get("special_needs") for child in children):
        therapy_days = [7, 14, 21, 28]  # Weekly for next month
        for day in therapy_days:
            event = ScheduleEvent(
                id=str(uuid4()),
                family_file_id=family_file_id,
                title="ABA Therapy - Chloe",
                category="medical",
                start_time=datetime.utcnow() + timedelta(days=day, hours=10),
                end_time=datetime.utcnow() + timedelta(days=day, hours=12),
                location="Riverside Autism Center",
                notes="Don't forget communication book",
                created_at=datetime.utcnow() - timedelta(days=60)
            )
            events.append(event)

    for event in events:
        session.add(event)
```

---

### 5. Custody Exchange Instances

**What's needed:**
- 30+ exchange instances across families
- Various check-in statuses: pending, completed, missed, late
- GPS verification data for completed exchanges
- Silent handoff mode for high-conflict cases

**Implementation:**
```python
async def create_custody_exchanges(session, family_file_id, custody_type, conflict_level):
    # Create base exchange template
    exchange = CustodyExchange(
        id=str(uuid4()),
        family_file_id=family_file_id,
        exchange_type="regular",
        location_type="neutral" if conflict_level == "high" else "parent_home",
        location_address="Compton Police Station" if conflict_level == "high" else "Parent A residence",
        is_silent_handoff=conflict_level == "high",
        is_recurring=True,
        recurrence_pattern="weekly",
        created_at=datetime.utcnow() - timedelta(days=90)
    )
    session.add(exchange)

    # Create instances for past 4 weeks + next 4 weeks
    for week_offset in range(-4, 5):
        exchange_time = datetime.utcnow() + timedelta(days=week_offset*7, hours=18)  # 6pm

        status = "completed" if week_offset < 0 else "pending"

        instance = CustodyExchangeInstance(
            id=str(uuid4()),
            custody_exchange_id=exchange.id,
            scheduled_datetime=exchange_time,
            status=status,
            created_at=datetime.utcnow() - timedelta(days=max(0, -week_offset*7))
        )

        if status == "completed":
            # Add check-in data
            instance.checked_in_by = "parent_a"  # Dropping off
            instance.checked_in_at = exchange_time + timedelta(minutes=random.randint(-5, 10))
            instance.location_verified = True

        session.add(instance)
```

---

### 6. ClearFund Obligations & Expenses

**What's needed:**
- 20+ obligations across families
- Types: extracurriculars, medical, school, daycare
- Various payment statuses: pending, paid, overdue, disputed
- Expense receipts (mock Stripe payment IDs)

**Examples:**
- Soccer league fees ($450)
- Art class tuition ($200/month)
- School supplies ($85)
- Medical co-pays ($40 per visit)
- Daycare ($800/month for Aaliyah)
- ABA therapy co-pays ($150/session for Chloe)

**Implementation:**
```python
async def create_clearfund_obligations(session, family_file_id, parent_a_id, parent_b_id, child_support_amount):
    obligations = []

    # Child support (if applicable)
    if child_support_amount:
        obligation = Obligation(
            id=str(uuid4()),
            family_file_id=family_file_id,
            obligation_type="child_support",
            description="Monthly Child Support",
            amount=Decimal(str(child_support_amount)),
            frequency="monthly",
            payer_id=parent_b_id,
            payee_id=parent_a_id,
            due_date=datetime.utcnow().replace(day=1) + timedelta(days=32),  # Next month
            status="active",
            created_at=datetime.utcnow() - timedelta(days=180)
        )
        obligations.append(obligation)

    # Extracurricular activity
    obligation = Obligation(
        id=str(uuid4()),
        family_file_id=family_file_id,
        obligation_type="extracurricular",
        description="Soccer League Registration - Spring 2026",
        amount=Decimal("450.00"),
        split_percentage_a=50,
        split_percentage_b=50,
        payer_id=parent_a_id,  # Parent A paid upfront
        due_date=datetime.utcnow() - timedelta(days=15),
        status="pending_reimbursement",
        receipt_url="https://storage.supabase.co/receipts/soccer_reg_001.pdf",
        created_at=datetime.utcnow() - timedelta(days=20)
    )
    obligations.append(obligation)

    for obligation in obligations:
        session.add(obligation)
```

---

### 7. Message Generation with ARIA Scores

**What's needed:**
- 100+ messages across families
- Varying ARIA sentiment scores based on conflict level
- Some flagged messages for high-conflict cases
- Message threads for conversations

**ARIA Score Distribution:**
- **Low conflict**: 95% score 0.0-0.2 (neutral/positive), 5% score 0.2-0.4 (mild)
- **Moderate conflict**: 70% score 0.0-0.3, 20% score 0.3-0.5, 10% score 0.5-0.7
- **High conflict**: 40% score 0.0-0.3, 30% score 0.3-0.6, 30% score 0.6-1.0 (flagged)

**Message Templates:**
```python
LOW_CONFLICT_MESSAGES = [
    "Emma had a great soccer game today! She scored 2 goals.",
    "Picking up at 6pm works perfectly. See you then!",
    "Liam finished his homework. Math worksheet is in his backpack.",
    "Can we swap next Thursday for Friday? My work schedule changed.",
    "Thanks for taking them to the dentist. How did it go?"
]

MODERATE_CONFLICT_MESSAGES = [
    "You were 20 minutes late again. This needs to stop.",
    "I disagree with that decision. We should discuss it first.",
    "The kids mentioned you let them stay up past bedtime.",
    "I need the child support payment. It's 5 days late.",
    "Can you please respond to my messages sooner?"
]

HIGH_CONFLICT_MESSAGES = [
    "This is unacceptable. You're not following the agreement.",
    "I'm documenting all of this for my attorney.",
    "You always do this. It's selfish.",
    "The kids are upset because of your behavior.",
    "I'm considering going back to court about this."
]
```

**Implementation:**
```python
async def generate_messages(session, family_file_id, parent_a_id, parent_b_id, conflict_level):
    message_templates = get_message_templates(conflict_level)

    for i in range(random.randint(15, 25)):  # 15-25 messages per family
        # Pick sender (alternate)
        sender_id = parent_a_id if i % 2 == 0 else parent_b_id
        recipient_id = parent_b_id if sender_id == parent_a_id else parent_a_id

        # Select message based on conflict level
        content = random.choice(message_templates)
        toxicity_score = calculate_toxicity_score(content, conflict_level)

        message = Message(
            id=str(uuid4()),
            family_file_id=family_file_id,
            sender_id=sender_id,
            recipient_id=recipient_id,
            content=content,
            aria_sentiment_score=toxicity_score,
            sent_at=datetime.utcnow() - timedelta(days=random.randint(1, 90)),
            status="delivered"
        )
        session.add(message)

        # Flag high-toxicity messages
        if toxicity_score > 0.7:
            flag = MessageFlag(
                id=str(uuid4()),
                message_id=message.id,
                flag_type="high_toxicity",
                toxicity_score=toxicity_score,
                severity="severe",
                intervention_taken=True,
                flagged_at=message.sent_at
            )
            session.add(flag)
```

---

### 8. Professional Firm Profiles

**What's needed:**
- Create 16 Firm records
- Create ProfessionalProfile for each attorney/mediator
- Create FirmMembership linking profiles to firms
- Assign professionals to appropriate cases

**Implementation:**
```python
async def create_professional_firms(session):
    firm_map = {}

    for firm_data in FIRMS:
        firm = Firm(
            id=str(uuid4()),
            name=firm_data["name"],
            firm_type=firm_data["type"],
            address_line1=firm_data["address"],
            city=firm_data["city"],
            state=firm_data["state"],
            zip_code=firm_data["zip"],
            phone=firm_data["phone"],
            email=firm_data["email"],
            website=firm_data.get("website"),
            description=firm_data["description"],
            specialties=firm_data["specialties"],
            is_verified=True,
            created_at=datetime.utcnow() - timedelta(days=random.randint(365, 1825))  # 1-5 years old
        )
        session.add(firm)
        firm_map[firm_data["name"]] = firm.id

        # Create professional profiles for attorneys/staff
        for attorney in firm_data.get("attorneys", []):
            # Create user account for professional
            prof_user_id = await create_auth_user(
                f"{attorney['name'].lower().replace(' ', '.')}@{firm_data['email'].split('@')[1]}",
                "Demo2026!"
            )

            profile = ProfessionalProfile(
                id=str(uuid4()),
                user_id=prof_user_id,
                professional_type="attorney",
                bar_number=f"CA{random.randint(100000, 999999)}",
                years_experience=attorney["years_experience"],
                specialties=firm_data["specialties"],
                is_verified=True,
                created_at=datetime.utcnow() - timedelta(days=365)
            )
            session.add(profile)

            # Create firm membership
            membership = FirmMembership(
                id=str(uuid4()),
                firm_id=firm.id,
                professional_id=profile.id,
                role=attorney["role"],
                is_primary=attorney["role"] in ["Lead Partner", "Owner", "Director"],
                joined_at=firm.created_at + timedelta(days=random.randint(1, 365)),
                created_at=firm.created_at
            )
            session.add(membership)

    return firm_map
```

---

### 9. Professional Case Assignments

**What's needed:**
- Assign professionals to 7-8 family files based on persona requirements
- Match professional type to family needs (attorney, mediator, GAL, PC)
- Set appropriate access levels and permissions

**Assignments:**
- **Sarah & Mike**: Family First Legal Group (attorney)
- **Tasha & Marcus**: Redlands Children's Rights Advocates (GAL)
- **Jennifer & Ryan**: Westside Mediation Services (mediator)
- **Amanda & David**: Pasadena Collaborative Law Group (attorney)
- **Lisa & Tom**: Inland Empire Parenting Coordinators (PC)
- **Rachel & Jason**: Downtown LA Family Law Center (attorney)

**Implementation:**
```python
async def assign_professionals_to_cases(session, family_file_map, firm_map):
    assignments = [
        {
            "persona": "sarah_mike",
            "firm": "Family First Legal Group",
            "role": "attorney",
            "access_level": "full"
        },
        {
            "persona": "tasha_marcus",
            "firm": "Redlands Children's Rights Advocates",
            "role": "gal",
            "access_level": "read_all"
        },
        # ... more assignments
    ]

    for assignment_data in assignments:
        family_file_id = family_file_map[assignment_data["persona"]]
        firm_id = firm_map[assignment_data["firm"]]

        # Get first professional from firm
        result = await session.execute(
            select(ProfessionalProfile)
            .join(FirmMembership)
            .where(FirmMembership.firm_id == firm_id)
            .limit(1)
        )
        professional = result.scalar_one_or_none()

        if professional:
            case_assignment = CaseAssignment(
                id=str(uuid4()),
                family_file_id=family_file_id,
                professional_id=professional.id,
                assignment_type=assignment_data["role"],
                access_level=assignment_data["access_level"],
                status="active",
                assigned_at=datetime.utcnow() - timedelta(days=random.randint(30, 180)),
                created_at=datetime.utcnow() - timedelta(days=random.randint(30, 180))
            )
            session.add(case_assignment)
```

---

## 📋 Implementation Checklist

### Phase 2A - Core Data (Priority 1)
- [ ] Integrate Supabase Auth for user creation
- [ ] Generate complete agreements with all 18 sections
- [ ] Create Quick Accords (12-15 across families)
- [ ] Generate schedule events (50+ total)

### Phase 2B - Financial & Custody (Priority 2)
- [ ] Create custody exchange instances (30+ with check-ins)
- [ ] Generate ClearFund obligations (20+ expenses)
- [ ] Add child support payment tracking
- [ ] Create expense receipts and payment history

### Phase 2C - Communication (Priority 3)
- [ ] Generate messages with realistic content (100+)
- [ ] Calculate ARIA sentiment scores
- [ ] Create MessageFlags for high-toxicity messages
- [ ] Create message threads for conversations

### Phase 2D - Professional Network (Priority 4)
- [ ] Create 16 professional firms
- [ ] Generate professional profiles (25-30 attorneys/mediators)
- [ ] Create firm memberships
- [ ] Assign professionals to 7-8 cases

---

## 🎯 Success Criteria

When complete, the demo database should have:

✅ **16 realistic user accounts** with Southern California addresses
✅ **8 family files** representing different co-parent situations
✅ **15 children** with ages, photos, and profiles
✅ **8 complete agreements** with all sections approved
✅ **12-15 Quick Accords** showing flexibility and adaptation
✅ **50+ schedule events** (activities, school, medical)
✅ **30+ custody exchanges** with realistic check-in data
✅ **20+ ClearFund obligations** showing expense sharing
✅ **100+ messages** with realistic ARIA sentiment scores
✅ **16 professional firms** with complete information
✅ **25-30 professional profiles** (attorneys, mediators, GALs)
✅ **7-8 case assignments** matching professionals to families

---

## 🚀 Next Steps

1. **Review DEMO_PERSONAS.md** to understand each co-parent situation
2. **Run existing seed_demo_socal.py** to see framework (incomplete)
3. **Decide priority**: Which sections to implement first?
4. **Implement incrementally**: Test each section before moving to next

**Recommended order:**
1. Supabase Auth integration (blocker for everything else)
2. Complete agreements (core feature showcase)
3. Schedule events (visual demonstration)
4. Messages with ARIA (showcases AI mediation)
5. Professional firms (business model demonstration)

---

## 📝 Notes

- All data is **realistic but fictional** - no real PII
- Addresses are **real Southern California locations** but made-up street numbers
- Phone numbers use **correct area codes** but are in 555-XXXX range (fictional)
- **ARIA scores** are calculated to match conflict levels
- **Dates** are relative to current date for realism
- Professional firm descriptions are **detailed and realistic** for demo purposes
