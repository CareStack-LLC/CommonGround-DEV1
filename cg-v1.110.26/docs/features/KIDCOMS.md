# KidComs - Child Communication System

**Last Updated:** January 12, 2026
**Version:** 1.2.0
**Status:** Production Ready

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Daily.co Integration](#dailyco-integration)
4. [Session Management](#session-management)
5. [Participant Types](#participant-types)
6. [Call Flows](#call-flows)
7. [Permission System](#permission-system)
8. [Family Settings](#family-settings)
9. [ARIA Chat Monitoring](#aria-chat-monitoring)
10. [API Reference](#api-reference)
11. [Frontend Integration](#frontend-integration)
12. [Theater Mode](#theater-mode)
13. [Brand Theming](#brand-theming-v130)

---

## Overview

KidComs is CommonGround's child communication platform that enables children to have video calls, chat, and interactive sessions with their approved circle of contacts (parents, grandparents, aunts/uncles, family friends).

### Key Features

- **Video/Voice Calls**: Real-time video and audio communication
- **Chat Messaging**: Text-based communication with ARIA monitoring
- **Theater Mode**: Watch videos, storybooks, and YouTube together in real-time
- **Content Library**: Curated videos and PDF storybooks for children
- **Arcade Mode**: Play games together (planned)
- **Whiteboard**: Collaborative drawing (planned)
- **Circle Management**: Parents control approved contacts
- **Parental Controls**: Time restrictions, feature toggles, monitoring

### Design Philosophy

1. **Child Safety First**: All communications monitored by ARIA
2. **Parental Control**: Parents control who can communicate with children
3. **Age-Appropriate**: Kid-friendly UI and PIN-based login
4. **Transparent**: Complete communication logs for parental review
5. **Flexible**: Works with both parents' custody schedules

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           KidComs Architecture                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                         User Layer                                     │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────────┐  │  │
│  │  │  Child   │  │ Parent A │  │ Parent B │  │   Circle Contact    │  │  │
│  │  │ (PIN)    │  │ (JWT)    │  │ (JWT)    │  │   (Circle JWT)      │  │  │
│  │  └────┬─────┘  └────┬─────┘  └────┬─────┘  └──────────┬───────────┘  │  │
│  └───────┼─────────────┼───────────────┼─────────────────────┼───────────┘  │
│          │             │               │                     │              │
│          ▼             ▼               ▼                     ▼              │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                       API Layer (FastAPI)                              │  │
│  │  ┌─────────────────┐ ┌────────────────┐ ┌─────────────────────────┐   │  │
│  │  │ /kidcoms/*      │ │ /kidcoms/      │ │ /kidcoms/sessions/      │   │  │
│  │  │  settings       │ │  sessions      │ │  child/* | circle/*    │   │  │
│  │  └─────────────────┘ └────────────────┘ └─────────────────────────┘   │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                     │                                        │
│                                     ▼                                        │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                      Service Layer                                     │  │
│  │  ┌────────────────────┐  ┌───────────────────────────────────────┐    │  │
│  │  │  DailyVideoService │  │          KidComs Business Logic       │    │  │
│  │  │                    │  │  • Session creation/management        │    │  │
│  │  │  • create_room     │  │  • Permission validation              │    │  │
│  │  │  • create_token    │  │  • Time restriction enforcement       │    │  │
│  │  │  • get_presence    │  │  • ARIA message analysis              │    │  │
│  │  │  • delete_room     │  │  • Communication logging              │    │  │
│  │  └─────────┬──────────┘  └───────────────────────────────────────┘    │  │
│  └────────────┼──────────────────────────────────────────────────────────┘  │
│               │                                                              │
│               ▼                                                              │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                     External Services                                  │  │
│  │  ┌────────────────────┐  ┌────────────────────────────────────────┐   │  │
│  │  │    Daily.co API    │  │           Database (PostgreSQL)        │   │  │
│  │  │                    │  │                                        │   │  │
│  │  │  • Room Management │  │  • kidcoms_settings                    │   │  │
│  │  │  • Token Generation│  │  • kidcoms_sessions                    │   │  │
│  │  │  • Presence API    │  │  • kidcoms_messages                    │   │  │
│  │  │  • Recording       │  │  • circle_permissions                  │   │  │
│  │  └────────────────────┘  │  • child_users / circle_users          │   │  │
│  │                          └────────────────────────────────────────┘   │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### File Structure

```
mvp/backend/app/
├── api/v1/endpoints/
│   └── kidcoms.py              # REST API endpoints
├── models/
│   └── kidcoms.py              # Database models
├── schemas/
│   └── kidcoms.py              # Pydantic schemas
└── services/
    └── daily_video.py          # Daily.co integration
```

### Database Models

| Model | Purpose |
|-------|---------|
| `KidComsSettings` | Per-family configuration |
| `KidComsSession` | Video/communication sessions |
| `KidComsMessage` | Chat messages in sessions |
| `KidComsSessionInvite` | Session invitations |
| `KidComsRoom` | Persistent rooms (future) |
| `ChildUser` | Child PIN login credentials |
| `CircleUser` | Circle contact login credentials |
| `CirclePermission` | Contact-child communication permissions |
| `KidComsCommunicationLog` | Audit trail |

---

## Daily.co Integration

KidComs uses [Daily.co](https://daily.co) for real-time video communication.

### Configuration

```bash
# Environment Variables
DAILY_API_KEY=your-daily-api-key
DAILY_DOMAIN=your-domain.daily.co
```

### DailyVideoService

**Location:** `mvp/backend/app/services/daily_video.py`

```python
class DailyVideoService:
    """Service for interacting with Daily.co API."""

    async def create_room(
        self,
        room_name: str,
        privacy: str = "private",
        exp_minutes: int = 120,
        max_participants: int = 4,
        enable_chat: bool = True,
        enable_recording: bool = False,
    ) -> Dict[str, Any]:
        """Create a new Daily.co room."""

    async def create_meeting_token(
        self,
        room_name: str,
        user_name: str,
        user_id: str,
        is_owner: bool = False,
        exp_minutes: int = 60,
    ) -> str:
        """Create a meeting token for a participant."""

    async def delete_room(self, room_name: str) -> bool:
        """Delete a Daily.co room."""

    async def get_room_presence(self, room_name: str) -> Dict[str, Any]:
        """Get current participants in a room."""
```

### Room Configuration

```python
room_config = {
    "name": "cg-kidcoms-abc123xyz",
    "privacy": "private",          # Require tokens
    "properties": {
        "exp": timestamp,          # Room expiration
        "max_participants": 4,     # Limit participants
        "enable_chat": True,       # In-call chat
        "enable_recording": False, # Recording disabled by default
    }
}
```

### Meeting Tokens

```python
token_config = {
    "properties": {
        "room_name": "cg-kidcoms-abc123xyz",
        "user_name": "Emma",
        "user_id": "child-uuid-123",
        "is_owner": False,         # Parents are owners
        "exp": timestamp,          # Token expiration
        "start_video_off": False,
        "start_audio_off": False,
    }
}
```

### Mock Mode

When `DAILY_API_KEY` is not configured, the service operates in mock mode:

```python
if not self.api_key:
    return {
        "name": room_name,
        "url": f"https://{self.domain}/{room_name}",
        "privacy": privacy,
        "created_at": datetime.utcnow().isoformat(),
    }
```

---

## Session Management

### Session Types

```python
class SessionType(str, Enum):
    VIDEO_CALL = "video_call"   # Standard video call
    THEATER = "theater"         # Watch together (production)
    ARCADE = "arcade"           # Play games (planned)
    WHITEBOARD = "whiteboard"   # Collaborative drawing (planned)
    MIXED = "mixed"             # Multiple features
```

### Session Status

```python
class SessionStatus(str, Enum):
    SCHEDULED = "scheduled"   # Future scheduled call
    WAITING = "waiting"       # Room created, awaiting participants
    RINGING = "ringing"       # Call initiated, awaiting answer
    ACTIVE = "active"         # Call in progress
    COMPLETED = "completed"   # Call ended normally
    CANCELLED = "cancelled"   # Call cancelled before start
    REJECTED = "rejected"     # Recipient declined call
    MISSED = "missed"         # Call timed out (3 minutes)
```

### Session Lifecycle

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌───────────┐
│ SCHEDULED│───▶│ WAITING  │───▶│  ACTIVE  │───▶│ COMPLETED │
└──────────┘    └────┬─────┘    └────┬─────┘    └───────────┘
                     │               │
                     │               ▼
                     │          ┌──────────┐
                     │          │ CANCELLED│
                     │          └──────────┘
                     │
                     ▼
              ┌──────────────────────────────┐
              │     RINGING (Incoming)       │
              └──────────┬───────────────────┘
                         │
         ┌───────────────┼───────────────┐
         ▼               ▼               ▼
    ┌────────┐      ┌────────┐      ┌────────┐
    │ ACTIVE │      │REJECTED│      │ MISSED │
    └────────┘      └────────┘      └────────┘
```

### Session Model

```python
class KidComsSession(Base):
    # Identification
    id: str                          # UUID
    family_file_id: str              # FK to family
    child_id: str                    # FK to child
    circle_contact_id: Optional[str] # FK to circle contact (if applicable)

    # Session Info
    session_type: str                # video_call, theater, etc.
    title: str                       # "Call from Grandma"
    status: str                      # waiting, active, completed, etc.

    # Daily.co
    daily_room_name: str             # cg-kidcoms-xxx
    daily_room_url: str              # https://domain.daily.co/room

    # Initiation
    initiated_by_id: str             # User/contact who started
    initiated_by_type: str           # child, parent, circle_contact

    # Participants (JSON)
    participants: List[dict]         # [{id, type, name, joined_at}]

    # Timing
    scheduled_for: Optional[datetime]
    ringing_started_at: Optional[datetime]
    started_at: Optional[datetime]
    ended_at: Optional[datetime]
    duration_seconds: Optional[int]

    # Features
    features_used: List[str]         # ["chat", "theater"]
    total_messages: int
    flagged_messages: int
```

---

## Participant Types

### Three Participant Types

```python
class ParticipantType(str, Enum):
    CHILD = "child"
    PARENT = "parent"
    CIRCLE_CONTACT = "circle_contact"
```

### Authentication Methods

| Participant | Auth Method | Token Type |
|-------------|-------------|------------|
| Child | PIN + Username | Child JWT |
| Parent | Email + Password | User JWT |
| Circle Contact | Email + Password | Circle JWT |

### Child User Model

```python
class ChildUser(Base):
    child_id: str              # FK to Child
    family_file_id: str        # FK to FamilyFile
    username: str              # Kid-friendly name "SuperMax"
    pin_hash: str              # Hashed 4-6 digit PIN
    avatar_id: Optional[str]   # Avatar selection
    last_login: Optional[datetime]
    is_active: bool
```

### Circle User Model

```python
class CircleUser(Base):
    circle_contact_id: str     # FK to CircleContact
    email: str                 # Login email
    password_hash: str         # Hashed password
    invite_token: str          # Invitation token
    invite_expires_at: datetime
    invite_accepted_at: Optional[datetime]
    email_verified: bool
    last_login: Optional[datetime]
```

### Circle Contact Room Assignment (v1.1.2)

Each circle contact is assigned a dedicated room (3-10) for video/voice calls:

```python
class CircleContact(Base):
    # ... other fields
    room_number: Optional[int]  # Assigned room (3-10)
```

**Room Allocation:**
- Rooms 1-2: Reserved for parents
- Rooms 3-10: Available for circle contacts
- Auto-assigned on invite creation via `create-and-invite` endpoint

**Login Flow:**
```
1. Parent invites contact via My Circle
2. System auto-assigns available room (3-10)
3. Email sent with login link: /my-circle/contact?email={email}
4. Contact visits login page (email pre-filled from URL)
5. After login, contact accesses their dedicated room
```

**Frontend Integration:**
```typescript
// Login URL with email pre-fill
const loginUrl = `/my-circle/contact?email=${encodeURIComponent(contact.contact_email)}`;

// Room lookup via room_number
const contactRoom = contact.room_number
  ? rooms.find((room) => room.room_number === contact.room_number)
  : undefined;
```

---

## Call Flows

### Flow 1: Parent Initiates Call

```
Parent                     Backend                  Daily.co               Child
   │                          │                        │                      │
   │ POST /kidcoms/sessions   │                        │                      │
   │ (child_id, contacts)     │                        │                      │
   │─────────────────────────▶│                        │                      │
   │                          │ Create Room            │                      │
   │                          │───────────────────────▶│                      │
   │                          │◀───────────────────────│                      │
   │                          │                        │                      │
   │      Session Created     │                        │                      │
   │◀─────────────────────────│                        │                      │
   │                          │                        │                      │
   │ POST /sessions/{id}/join │                        │                      │
   │─────────────────────────▶│                        │                      │
   │                          │ Get Meeting Token      │                      │
   │                          │───────────────────────▶│                      │
   │                          │◀───────────────────────│                      │
   │     Token + Room URL     │                        │                      │
   │◀─────────────────────────│                        │                      │
   │                          │                        │                      │
   │       Join Room          │                        │                      │
   │─────────────────────────────────────────────────▶│                      │
   │                          │                        │                      │
   │                          │ (Poll for incoming)    │                      │
   │                          │◀───────────────────────┼──────────────────────│
   │                          │                        │                      │
   │                          │ GET /incoming/child    │                      │
   │                          │◀───────────────────────┼──────────────────────│
   │                          │    Incoming Call       │                      │
   │                          │─────────────────────────────────────────────▶│
   │                          │                        │                      │
   │                          │ POST /sessions/{id}/accept                   │
   │                          │◀─────────────────────────────────────────────│
   │                          │       Token            │                      │
   │                          │─────────────────────────────────────────────▶│
   │                          │                        │                      │
   │                          │                        │     Join Room        │
   │                          │                        │◀─────────────────────│
   │                          │                        │                      │
   │◀───────────────────────────────── Call Active ─────────────────────────▶│
```

### Flow 2: Child Initiates Call

```
Child                      Backend                  Daily.co              Parent
   │                          │                        │                      │
   │ POST /sessions/child/create                       │                      │
   │ (contact_id, contact_type)                        │                      │
   │─────────────────────────▶│                        │                      │
   │                          │                        │                      │
   │                          │ Validate Permissions   │                      │
   │                          │ Check Time Restrictions│                      │
   │                          │                        │                      │
   │                          │ Create Room            │                      │
   │                          │───────────────────────▶│                      │
   │                          │◀───────────────────────│                      │
   │                          │                        │                      │
   │                          │ Create Child Token     │                      │
   │                          │───────────────────────▶│                      │
   │                          │◀───────────────────────│                      │
   │                          │                        │                      │
   │     Token + Room URL     │                        │                      │
   │◀─────────────────────────│                        │                      │
   │                          │                        │                      │
   │       Join Room          │                        │                      │
   │─────────────────────────────────────────────────▶│                      │
   │                          │                        │                      │
   │                          │ (Session in WAITING)   │                      │
   │                          │                        │                      │
   │                          │ GET /sessions/active   │                      │
   │                          │◀───────────────────────┼──────────────────────│
   │                          │    Incoming Call       │                      │
   │                          │─────────────────────────────────────────────▶│
   │                          │                        │                      │
   │                          │ POST /sessions/{id}/join                     │
   │                          │◀─────────────────────────────────────────────│
   │                          │       Token            │                      │
   │                          │─────────────────────────────────────────────▶│
   │                          │                        │                      │
   │                          │                        │     Join Room        │
   │                          │                        │◀─────────────────────│
   │                          │                        │                      │
   │◀───────────────────────────────── Call Active ─────────────────────────▶│
```

### Flow 3: Circle Contact Initiates Call

```
Circle                     Backend                  Daily.co              Child
   │                          │                        │                      │
   │ POST /sessions/circle/create                      │                      │
   │ (child_id, session_type) │                        │                      │
   │─────────────────────────▶│                        │                      │
   │                          │                        │                      │
   │                          │ Validate:              │                      │
   │                          │ • Contact is active    │                      │
   │                          │ • Has child permission │                      │
   │                          │ • Feature allowed      │                      │
   │                          │ • Within time window   │                      │
   │                          │                        │                      │
   │                          │ Create Room            │                      │
   │                          │───────────────────────▶│                      │
   │                          │◀───────────────────────│                      │
   │                          │                        │                      │
   │     Token + Room URL     │                        │                      │
   │◀─────────────────────────│                        │                      │
   │                          │                        │                      │
   │       Join Room          │                        │                      │
   │─────────────────────────────────────────────────▶│                      │
   │                          │                        │                      │
   │                          │ GET /incoming/child    │                      │
   │                          │◀───────────────────────┼──────────────────────│
   │                          │    Incoming Call       │                      │
   │                          │─────────────────────────────────────────────▶│
   │                          │                        │                      │
   │                          │ POST /{id}/accept      │                      │
   │                          │◀─────────────────────────────────────────────│
   │                          │                        │                      │
   │◀───────────────────────────────── Call Active ─────────────────────────▶│
```

---

## Permission System

### CirclePermission Model

Controls exactly what each contact can do with each child:

```python
class CirclePermission(Base):
    # Links
    circle_contact_id: str    # Which contact
    child_id: str             # Which child
    family_file_id: str       # Which family

    # Feature permissions
    can_video_call: bool      # Video calls allowed
    can_voice_call: bool      # Voice-only calls allowed
    can_chat: bool            # Text chat allowed
    can_theater: bool         # Watch together allowed

    # Time restrictions
    allowed_days: List[int]   # [0,1,2,3,4,5,6] for Sun-Sat
    allowed_start_time: str   # "09:00"
    allowed_end_time: str     # "20:00"

    # Session restrictions
    max_call_duration_minutes: int   # Default: 60
    require_parent_present: bool     # Require parent in call
```

### Permission Validation

```python
# Check if contact can make video call to child
if session_data.session_type == "video_call" and not permission.can_video_call:
    raise HTTPException(
        status_code=403,
        detail="Video calls are not enabled for this connection"
    )

# Check time restrictions
if permission.allowed_days:
    today = now.weekday()
    js_weekday = (today + 1) % 7  # Convert to Sunday=0 format
    if js_weekday not in permission.allowed_days:
        raise HTTPException(
            status_code=403,
            detail="Calls are not allowed on this day"
        )

if permission.allowed_start_time and permission.allowed_end_time:
    current_time = now.strftime("%H:%M")
    if current_time < permission.allowed_start_time or current_time > permission.allowed_end_time:
        raise HTTPException(
            status_code=403,
            detail=f"Calls are only allowed between {permission.allowed_start_time} and {permission.allowed_end_time}"
        )
```

---

## Family Settings

### KidComsSettings Model

Per-family configuration for KidComs features:

```python
class KidComsSettings(Base):
    family_file_id: str       # FK to family

    # Circle approval
    circle_approval_mode: str  # "both_parents", "either_parent"

    # Availability schedule (JSON)
    # {"monday": {"start": "09:00", "end": "20:00"}, ...}
    availability_schedule: Optional[dict]
    enforce_availability: bool

    # Notifications
    require_parent_notification: bool
    notify_on_session_start: bool
    notify_on_session_end: bool
    notify_on_aria_flag: bool

    # Feature toggles (JSON)
    # {"video": true, "chat": true, "theater": true, "arcade": true, "whiteboard": true}
    allowed_features: dict

    # Session limits
    max_session_duration_minutes: int  # Default: 60
    max_daily_sessions: int            # Default: 5
    max_participants_per_session: int  # Default: 4

    # Parental controls
    require_parent_in_call: bool       # Default: False
    allow_child_to_initiate: bool      # Default: True
    record_sessions: bool              # Default: False
```

### Helper Methods

```python
def is_feature_allowed(self, feature: str) -> bool:
    """Check if a specific feature is allowed."""
    return self.allowed_features.get(feature, False)

def is_within_availability(self, check_time: Optional[datetime] = None) -> bool:
    """Check if the current time is within availability schedule."""
    if not self.enforce_availability or not self.availability_schedule:
        return True

    check_time = check_time or datetime.utcnow()
    day_name = check_time.strftime("%A").lower()
    current_time = check_time.strftime("%H:%M")

    day_schedule = self.availability_schedule.get(day_name)
    if not day_schedule:
        return False

    start = day_schedule.get("start", "00:00")
    end = day_schedule.get("end", "23:59")

    return start <= current_time <= end
```

---

## ARIA Chat Monitoring

### Message Model

```python
class KidComsMessage(Base):
    session_id: str           # FK to session
    sender_id: str            # Who sent
    sender_type: str          # child, parent, circle_contact
    sender_name: str          # Display name

    content: str              # Message content
    original_content: Optional[str]  # If modified

    # ARIA analysis
    aria_analyzed: bool       # Was message analyzed
    aria_flagged: bool        # Was it flagged
    aria_category: Optional[str]  # Flag category
    aria_reason: Optional[str]    # Why flagged
    aria_score: Optional[float]   # Confidence score

    # Status
    is_delivered: bool        # Message delivered
    is_hidden: bool           # Hidden from view
    sent_at: datetime
```

### ARIA Analysis Flow

```python
# Send message in session
@router.post("/sessions/{session_id}/messages")
async def send_message(session_id: str, message_data: KidComsMessageCreate):
    # Create message
    message = KidComsMessage(
        session_id=session_id,
        sender_id=current_user.id,
        sender_type=ParticipantType.PARENT.value,
        sender_name=f"{current_user.first_name} {current_user.last_name}",
        content=message_data.content,
    )

    # ARIA analysis
    analysis = await aria_service.analyze_chat(message.content)

    message.aria_analyzed = True
    message.aria_flagged = analysis.is_flagged
    message.aria_category = analysis.category
    message.aria_score = analysis.score

    if analysis.is_flagged:
        session.flagged_messages += 1
        if settings.notify_on_aria_flag:
            # Notify parents
            pass

    session.total_messages += 1
```

### Analysis Response

```python
@dataclass
class ARIAChatAnalyzeResponse:
    is_safe: bool                  # Safe for children
    should_flag: bool              # Flag for parent review
    category: Optional[str]        # inappropriate, concerning, etc.
    reason: Optional[str]          # Explanation
    confidence_score: float        # 0.0 - 1.0
    suggested_rewrite: Optional[str]
    should_hide: bool              # Hide from children
    should_notify_parents: bool    # Immediate notification
```

---

## API Reference

### Settings Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/kidcoms/settings/{family_file_id}` | GET | Get family settings |
| `/kidcoms/settings/{family_file_id}` | PUT | Update family settings |

### Session Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/kidcoms/sessions` | POST | Create session (parent) |
| `/kidcoms/sessions` | GET | List sessions |
| `/kidcoms/sessions/{id}` | GET | Get session details |
| `/kidcoms/sessions/{id}/join` | POST | Join session |
| `/kidcoms/sessions/{id}/end` | POST | End session |
| `/kidcoms/sessions/active/{family_id}` | GET | Get active sessions |

### Child Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/kidcoms/sessions/child/create` | POST | Child creates session |
| `/kidcoms/sessions/child/active` | GET | Child's active sessions |
| `/kidcoms/sessions/child/{id}/join` | POST | Child joins session |

### Circle Contact Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/kidcoms/sessions/circle/create` | POST | Circle creates session |
| `/kidcoms/sessions/{id}/circle/accept` | POST | Circle accepts call |

### Incoming Call Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/kidcoms/sessions/incoming/child` | GET | Poll for child's incoming calls |
| `/kidcoms/sessions/incoming/circle` | GET | Poll for circle's incoming calls |
| `/kidcoms/sessions/{id}/accept` | POST | Child accepts call |
| `/kidcoms/sessions/{id}/reject` | POST | Child rejects call |

### Message Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/kidcoms/sessions/{id}/messages` | POST | Send message |
| `/kidcoms/sessions/{id}/messages` | GET | Get messages |
| `/kidcoms/aria/analyze` | POST | Analyze message with ARIA |

### Summary Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/kidcoms/summary/{family_file_id}` | GET | Family activity summary |
| `/kidcoms/session-types` | GET | List session types |

---

## Frontend Integration

### Join Response Schema

```typescript
interface KidComsJoinResponse {
  session_id: string;
  room_url: string;           // Daily.co room URL
  token: string;              // Meeting token
  participant_name: string;
  participant_type: "child" | "parent" | "circle_contact";
}
```

### Incoming Call Schema

```typescript
interface IncomingCallResponse {
  session_id: string;
  caller_name: string;
  caller_type: string;
  session_type: string;
  room_url: string;
  started_ringing_at: string;
  child_id: string;
  child_name?: string;
  circle_contact_id?: string;
  contact_name?: string;
}
```

### Daily.co Integration

```typescript
// Using @daily-co/daily-js
import DailyIframe from '@daily-co/daily-js';

// Join call
const response = await api.post(`/kidcoms/sessions/${sessionId}/join`);
const { room_url, token } = response.data;

const callFrame = DailyIframe.createFrame({
  url: room_url,
  token: token,
  showLeaveButton: true,
  showFullscreenButton: true,
});

callFrame.join();
```

### Polling for Incoming Calls

```typescript
// Child polls for incoming calls
const pollForCalls = async () => {
  const response = await api.get('/kidcoms/sessions/incoming/child');
  const { items } = response.data;

  if (items.length > 0) {
    showIncomingCallUI(items[0]);
  }
};

// Poll every 3 seconds
setInterval(pollForCalls, 3000);
```

### Call Timeout

Calls that are not answered within 3 minutes are automatically marked as missed:

```python
# In incoming call endpoint
timeout_threshold = datetime.utcnow() - timedelta(minutes=3)

for session in sessions:
    ring_time = session.ringing_started_at or session.created_at

    if ring_time and ring_time < timeout_threshold:
        session.status = SessionStatus.MISSED.value
        await db.commit()
        continue
```

---

## Theater Mode

### Overview

Theater Mode enables children and their circle to watch content together in real-time while maintaining video/voice communication. The experience includes synchronized playback and picture-in-picture video tiles.

### Content Types

| Type | Description | Source |
|------|-------------|--------|
| `video` | Local video files | Content Library |
| `pdf` | PDF storybooks | Content Library |
| `youtube` | YouTube videos | User-provided URL |

### Content Library

The Content Library modal provides curated, child-appropriate content:

```typescript
interface ContentLibrary {
  videos: VideoContent[];     // Curated animated videos
  storybooks: StorybookContent[]; // PDF picture books
}

interface VideoContent {
  id: string;
  title: string;
  url: string;
  duration?: string;
}

interface StorybookContent {
  id: string;
  title: string;
  url: string;
  author?: string;
}
```

### YouTube Integration

Theater Mode supports YouTube video playback with URL validation:

```typescript
// Supported YouTube URL formats
const isValidYouTubeUrl = (url: string) => {
  return (
    url.includes('youtube.com/watch') ||
    url.includes('youtu.be/') ||
    url.includes('youtube.com/embed/')
  );
};
```

### Picture-in-Picture (PiP) Video

During Theater Mode, participants' video feeds appear as PiP tiles:

- Small overlays in corner of content area
- Draggable positioning
- Show participant name and mute status
- Emerald border for active speaker

### Theater Mode UI Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `theater-mode.tsx` | `components/kidcoms/` | Main theater experience |
| `content-library.tsx` | `components/kidcoms/` | Content selection modal |
| `video-call.tsx` | `components/kidcoms/` | Video tile rendering |

---

## Brand Theming (v1.3.0)

### Color Palette

KidComs uses the CommonGround brand colors throughout the interface:

| Element | Color | Tailwind Class |
|---------|-------|----------------|
| Primary Gradient | Emerald to Teal | `from-emerald-500 to-teal-600` |
| Hover Gradient | Darker | `from-emerald-600 to-teal-700` |
| Background Dark | Slate | `bg-slate-800`, `bg-slate-900` |
| Accent Shadow | Emerald glow | `shadow-emerald-500/20` |
| Tab Active | Emerald | `text-emerald-400`, `border-emerald-400` |
| Loading Spinner | Emerald | `text-emerald-500` |

### UI Component Styling

**Video Call Controls:**
```typescript
// Mute/unmute button (active state)
className="bg-slate-700 hover:bg-slate-600 text-white"

// Mute/unmute button (muted state)
className="bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/25"

// End call button
className="bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/25"
```

**Content Library:**
```typescript
// Header icon
className="bg-gradient-to-br from-emerald-500 to-teal-600"

// Tab (active)
className="text-emerald-400 border-b-2 border-emerald-400 bg-emerald-500/5"

// Content card hover
className="hover:ring-2 hover:ring-emerald-500"

// Submit button
className="bg-gradient-to-r from-emerald-500 to-teal-600"
```

**Theater Mode:**
```typescript
// Mode badge
className="bg-gradient-to-r from-emerald-500 to-teal-600"

// PiP video border
className="ring-emerald-500/50"

// Empty state icon background
className="bg-emerald-500/10"
```

### Avatar Styling

```typescript
// Avatar with initials
<div className="bg-gradient-to-br from-emerald-500 to-teal-600
               flex items-center justify-center text-white
               shadow-lg shadow-emerald-500/20">
  {userName[0]?.toUpperCase()}
</div>
```

---

## Document Index

| Document | Location | Purpose |
|----------|----------|---------|
| **KIDCOMS.md** | `/docs/features/` | This document |
| kidcoms.py (endpoints) | `app/api/v1/endpoints/` | API routes |
| kidcoms.py (models) | `app/models/` | Database models |
| daily_video.py | `app/services/` | Daily.co integration |
| theater-mode.tsx | `components/kidcoms/` | Theater Mode component |
| content-library.tsx | `components/kidcoms/` | Content Library modal |
| video-call.tsx | `components/kidcoms/` | Video call component |
| theater-content.ts | `lib/` | Content catalog |

---

*Last Updated: January 12, 2026*
*Document Version: 1.2.0*
