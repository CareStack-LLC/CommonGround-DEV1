"""
KidComs models for child communication sessions.

KidComs enables children to have video calls, chat, watch movies together,
play games, and use collaborative whiteboards with their approved circle.
"""

from datetime import datetime
from typing import Optional, List
from enum import Enum

from sqlalchemy import Boolean, DateTime, ForeignKey, String, Text, Integer, Index, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDMixin
from app.models.circle import ApprovalMode


class SessionType(str, Enum):
    """Types of KidComs sessions."""
    VIDEO_CALL = "video_call"
    THEATER = "theater"
    ARCADE = "arcade"
    WHITEBOARD = "whiteboard"
    MIXED = "mixed"  # Multiple features active


class SessionStatus(str, Enum):
    """Status of a KidComs session."""
    SCHEDULED = "scheduled"
    WAITING = "waiting"  # Room created, waiting for participants
    RINGING = "ringing"  # Call initiated, waiting for recipient to answer
    ACTIVE = "active"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    REJECTED = "rejected"  # Recipient declined the call
    MISSED = "missed"  # Call timed out without answer


class ParticipantType(str, Enum):
    """Types of participants in a session."""
    CHILD = "child"
    PARENT = "parent"
    CIRCLE_CONTACT = "circle_contact"


class KidComsSettings(Base, UUIDMixin, TimestampMixin):
    """
    KidComsSettings - Per-family configuration for KidComs features.

    Controls approval modes, availability schedules, feature access,
    and session limits for children's communication.
    """

    __tablename__ = "kidcoms_settings"

    # Foreign key
    family_file_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("family_files.id", ondelete="CASCADE"), unique=True, index=True
    )

    # Circle approval settings
    circle_approval_mode: Mapped[str] = mapped_column(
        String(20), default=ApprovalMode.BOTH_PARENTS.value
    )

    # Availability schedule (JSON)
    # Format: {"monday": {"start": "09:00", "end": "20:00"}, ...}
    availability_schedule: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    enforce_availability: Mapped[bool] = mapped_column(Boolean, default=True)

    # Notifications
    require_parent_notification: Mapped[bool] = mapped_column(Boolean, default=True)
    notify_on_session_start: Mapped[bool] = mapped_column(Boolean, default=True)
    notify_on_session_end: Mapped[bool] = mapped_column(Boolean, default=True)
    notify_on_aria_flag: Mapped[bool] = mapped_column(Boolean, default=True)

    # Feature toggles (JSON)
    # Format: {"video": true, "chat": true, "theater": true, "arcade": true, "whiteboard": true}
    allowed_features: Mapped[dict] = mapped_column(
        JSON, default=lambda: {
            "video": True,
            "chat": True,
            "theater": True,
            "arcade": True,
            "whiteboard": True
        }
    )

    # Session limits
    max_session_duration_minutes: Mapped[int] = mapped_column(Integer, default=60)
    max_daily_sessions: Mapped[int] = mapped_column(Integer, default=5)
    max_participants_per_session: Mapped[int] = mapped_column(Integer, default=4)

    # Parental controls
    require_parent_in_call: Mapped[bool] = mapped_column(Boolean, default=False)
    allow_child_to_initiate: Mapped[bool] = mapped_column(Boolean, default=True)
    record_sessions: Mapped[bool] = mapped_column(Boolean, default=False)

    # Relationships
    family_file = relationship("FamilyFile", back_populates="kidcoms_settings")

    def __repr__(self) -> str:
        return f"<KidComsSettings for family {self.family_file_id}>"

    def is_feature_allowed(self, feature: str) -> bool:
        """Check if a specific feature is allowed."""
        return self.allowed_features.get(feature, False)

    def is_within_availability(self, check_time: Optional[datetime] = None) -> bool:
        """
        Check if the current time is within availability schedule.

        Args:
            check_time: Time to check (defaults to now)

        Returns:
            True if within schedule or schedule not enforced
        """
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


class KidComsSession(Base, UUIDMixin, TimestampMixin):
    """
    KidComsSession - A video/communication session in KidComs.

    Tracks session metadata, participants, Daily.co room info,
    and session history for parental visibility.
    """

    __tablename__ = "kidcoms_sessions"

    # Foreign keys
    family_file_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("family_files.id", ondelete="CASCADE"), index=True
    )
    child_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("children.id", ondelete="CASCADE"), index=True
    )
    # Circle contact involved in the call (if any)
    circle_contact_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("circle_contacts.id", ondelete="SET NULL"), nullable=True, index=True
    )

    # Session info
    session_type: Mapped[str] = mapped_column(String(20), default=SessionType.VIDEO_CALL.value)
    title: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default=SessionStatus.WAITING.value, index=True)

    # Daily.co room info
    daily_room_name: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    daily_room_url: Mapped[str] = mapped_column(String(500))
    daily_room_token: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)  # Owner token

    # Initiation
    initiated_by_id: Mapped[str] = mapped_column(String(36))  # User or contact ID
    initiated_by_type: Mapped[str] = mapped_column(String(20))  # child, parent, circle_contact

    # Participants (JSON array)
    # Format: [{"id": "uuid", "type": "child|parent|circle_contact", "name": "...", "joined_at": "..."}]
    participants: Mapped[List[dict]] = mapped_column(JSON, default=list)

    # Timing
    scheduled_for: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    ringing_started_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)  # For call timeout
    started_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    ended_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    duration_seconds: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    # Features used during session (JSON)
    features_used: Mapped[List[str]] = mapped_column(JSON, default=list)

    # ARIA stats
    total_messages: Mapped[int] = mapped_column(Integer, default=0)
    flagged_messages: Mapped[int] = mapped_column(Integer, default=0)

    # Notes (for parent review)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationships
    family_file = relationship("FamilyFile", back_populates="kidcoms_sessions")
    child = relationship("Child", back_populates="kidcoms_sessions")
    circle_contact = relationship("CircleContact")
    messages = relationship("KidComsMessage", back_populates="session", cascade="all, delete-orphan")

    # Indexes
    __table_args__ = (
        Index("ix_kidcoms_sessions_family_status", "family_file_id", "status"),
        Index("ix_kidcoms_sessions_child_date", "child_id", "started_at"),
    )

    def __repr__(self) -> str:
        return f"<KidComsSession {self.id} ({self.session_type}) - {self.status}>"

    def start(self) -> None:
        """Mark session as started."""
        self.status = SessionStatus.ACTIVE.value
        self.started_at = datetime.utcnow()

    def end(self) -> None:
        """Mark session as ended and calculate duration."""
        self.status = SessionStatus.COMPLETED.value
        self.ended_at = datetime.utcnow()
        if self.started_at:
            self.duration_seconds = int((self.ended_at - self.started_at).total_seconds())

    def add_participant(self, participant_id: str, participant_type: str, name: str) -> None:
        """Add a participant to the session."""
        participant = {
            "id": participant_id,
            "type": participant_type,
            "name": name,
            "joined_at": datetime.utcnow().isoformat()
        }
        if self.participants is None:
            self.participants = []
        self.participants.append(participant)

    def add_feature_used(self, feature: str) -> None:
        """Track that a feature was used during the session."""
        if self.features_used is None:
            self.features_used = []
        if feature not in self.features_used:
            self.features_used.append(feature)


class KidComsMessage(Base, UUIDMixin):
    """
    KidComsMessage - Chat messages within a KidComs session.

    All messages are analyzed by ARIA for safety before display.
    Flagged messages are stored for parent review.
    """

    __tablename__ = "kidcoms_messages"

    # Foreign key
    session_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("kidcoms_sessions.id", ondelete="CASCADE"), index=True
    )

    # Sender info
    sender_id: Mapped[str] = mapped_column(String(36), index=True)
    sender_type: Mapped[str] = mapped_column(String(20))  # child, parent, circle_contact
    sender_name: Mapped[str] = mapped_column(String(100))

    # Message content
    content: Mapped[str] = mapped_column(Text)
    original_content: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # If modified

    # ARIA analysis
    aria_analyzed: Mapped[bool] = mapped_column(Boolean, default=False)
    aria_flagged: Mapped[bool] = mapped_column(Boolean, default=False)
    aria_category: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    aria_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    aria_score: Mapped[Optional[float]] = mapped_column(nullable=True)

    # Status
    is_delivered: Mapped[bool] = mapped_column(Boolean, default=True)
    is_hidden: Mapped[bool] = mapped_column(Boolean, default=False)  # Hidden due to flag

    # Timestamp
    sent_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    session = relationship("KidComsSession", back_populates="messages")

    # Indexes
    __table_args__ = (
        Index("ix_kidcoms_messages_session_time", "session_id", "sent_at"),
        Index("ix_kidcoms_messages_flagged", "session_id", "aria_flagged"),
    )

    def __repr__(self) -> str:
        flag_status = " [FLAGGED]" if self.aria_flagged else ""
        return f"<KidComsMessage from {self.sender_name}{flag_status}>"


class KidComsSessionInvite(Base, UUIDMixin, TimestampMixin):
    """
    KidComsSessionInvite - Invitation to join a KidComs session.

    Used when a child or parent invites a circle contact to join a session.
    """

    __tablename__ = "kidcoms_session_invites"

    # Foreign keys
    session_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("kidcoms_sessions.id", ondelete="CASCADE"), index=True
    )
    circle_contact_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("circle_contacts.id", ondelete="CASCADE"), nullable=True
    )

    # Invite info
    invited_by_id: Mapped[str] = mapped_column(String(36))
    invited_by_type: Mapped[str] = mapped_column(String(20))
    invite_token: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    invite_url: Mapped[str] = mapped_column(String(500))

    # Status
    status: Mapped[str] = mapped_column(String(20), default="pending")  # pending, accepted, declined, expired
    expires_at: Mapped[datetime] = mapped_column(DateTime)
    accepted_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # Relationships
    session = relationship("KidComsSession")
    circle_contact = relationship("CircleContact")

    def __repr__(self) -> str:
        return f"<KidComsSessionInvite for session {self.session_id} - {self.status}>"

    @property
    def is_expired(self) -> bool:
        """Check if invite has expired."""
        return datetime.utcnow() > self.expires_at

    def accept(self) -> None:
        """Mark invite as accepted."""
        self.status = "accepted"
        self.accepted_at = datetime.utcnow()


class RoomType(str, Enum):
    """Types of KidComs rooms."""
    PARENT_A = "parent_a"
    PARENT_B = "parent_b"
    CIRCLE = "circle"


class KidComsRoom(Base, UUIDMixin, TimestampMixin):
    """
    KidComsRoom - Persistent communication room for a family.

    Each family gets 10 rooms:
    - Room 1: Parent A (Mom) ↔ Child (reserved)
    - Room 2: Parent B (Dad) ↔ Child (reserved)
    - Rooms 3-10: Assignable to circle contacts
    """

    __tablename__ = "kidcoms_rooms"

    # Foreign key
    family_file_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("family_files.id", ondelete="CASCADE"), index=True
    )

    # Room info
    room_number: Mapped[int] = mapped_column(Integer)  # 1-10
    room_type: Mapped[str] = mapped_column(String(20))  # parent_a, parent_b, circle
    room_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)  # Custom name

    # Assignment
    assigned_to_id: Mapped[Optional[str]] = mapped_column(
        String(36), nullable=True, index=True
    )  # circle_contact_id

    # Daily.co room (persistent)
    daily_room_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    daily_room_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    # Status
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    # Relationships
    family_file = relationship("FamilyFile", back_populates="kidcoms_rooms")
    assigned_contact = relationship(
        "CircleContact",
        foreign_keys=[assigned_to_id],
        primaryjoin="KidComsRoom.assigned_to_id == CircleContact.id"
    )

    __table_args__ = (
        Index("ix_kidcoms_rooms_family_room", "family_file_id", "room_number"),
    )

    def __repr__(self) -> str:
        return f"<KidComsRoom {self.room_number} ({self.room_type}) for family {self.family_file_id}>"

    @property
    def is_reserved(self) -> bool:
        """Check if this is a reserved parent room."""
        return self.room_type in [RoomType.PARENT_A.value, RoomType.PARENT_B.value]

    @property
    def is_assigned(self) -> bool:
        """Check if room is assigned to someone."""
        return self.assigned_to_id is not None


class CircleUser(Base, UUIDMixin, TimestampMixin):
    """
    CircleUser - Login credentials for a circle contact.

    When a circle contact accepts their invitation, they create
    an account with email/password to access the My Circle portal.
    """

    __tablename__ = "circle_users"

    # Link to circle contact
    circle_contact_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("circle_contacts.id", ondelete="CASCADE"), unique=True
    )

    # Login credentials
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    # Invitation
    invite_token: Mapped[Optional[str]] = mapped_column(String(100), unique=True, index=True)
    invite_expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    invite_accepted_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # Status
    email_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    last_login: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    # Relationships
    circle_contact = relationship("CircleContact", back_populates="user_account")

    def __repr__(self) -> str:
        return f"<CircleUser {self.email}>"

    @property
    def is_invite_pending(self) -> bool:
        """Check if invite is still pending."""
        return self.invite_accepted_at is None

    @property
    def is_invite_expired(self) -> bool:
        """Check if invite has expired."""
        if self.invite_expires_at is None:
            return False
        return datetime.utcnow() > self.invite_expires_at

    def accept_invite(self, password_hash: str) -> None:
        """Accept invitation and set password."""
        self.password_hash = password_hash
        self.invite_accepted_at = datetime.utcnow()
        self.invite_token = None  # Clear token after use


class ChildUser(Base, UUIDMixin, TimestampMixin):
    """
    ChildUser - Simple PIN-based login for children.

    Children log in with a kid-friendly username and simple PIN
    to access their communication portal.
    """

    __tablename__ = "child_users"

    # Links
    child_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("children.id", ondelete="CASCADE"), unique=True
    )
    family_file_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("family_files.id", ondelete="CASCADE"), index=True
    )

    # Login credentials
    username: Mapped[str] = mapped_column(String(50))  # Kid-friendly like "SuperMax"
    pin_hash: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    # Profile
    avatar_id: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)

    # Status
    last_login: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    # Relationships
    child = relationship("Child", back_populates="user_account")
    family_file = relationship("FamilyFile", back_populates="child_users")

    __table_args__ = (
        Index("ix_child_users_family_username", "family_file_id", "username"),
    )

    def __repr__(self) -> str:
        return f"<ChildUser {self.username}>"


class CirclePermission(Base, UUIDMixin, TimestampMixin):
    """
    CirclePermission - Granular permissions for a circle contact to communicate with a child.

    Parents control exactly what each contact can do:
    - Which communication features (video, voice, chat, theater)
    - When they can communicate (days, hours)
    - How long sessions can be
    - Whether parent presence is required
    """

    __tablename__ = "circle_permissions"

    # Links
    circle_contact_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("circle_contacts.id", ondelete="CASCADE"), index=True
    )
    child_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("children.id", ondelete="CASCADE"), index=True
    )
    family_file_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("family_files.id", ondelete="CASCADE"), index=True
    )

    # Feature permissions
    can_video_call: Mapped[bool] = mapped_column(Boolean, default=True)
    can_voice_call: Mapped[bool] = mapped_column(Boolean, default=True)
    can_chat: Mapped[bool] = mapped_column(Boolean, default=True)
    can_theater: Mapped[bool] = mapped_column(Boolean, default=True)

    # Time restrictions
    allowed_days: Mapped[Optional[List[int]]] = mapped_column(
        JSON, nullable=True
    )  # [0, 1, 2, 3, 4, 5, 6] for Sun-Sat
    allowed_start_time: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)  # "09:00"
    allowed_end_time: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)  # "20:00"

    # Session restrictions
    max_call_duration_minutes: Mapped[int] = mapped_column(Integer, default=60)
    require_parent_present: Mapped[bool] = mapped_column(Boolean, default=False)

    # Audit
    set_by_parent_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=True
    )

    # Relationships
    circle_contact = relationship("CircleContact", back_populates="permissions")
    child = relationship("Child", back_populates="circle_permissions")
    set_by = relationship("User", foreign_keys=[set_by_parent_id])

    __table_args__ = (
        Index("ix_circle_permissions_contact_child", "circle_contact_id", "child_id"),
    )

    def __repr__(self) -> str:
        return f"<CirclePermission contact={self.circle_contact_id} child={self.child_id}>"

    def is_within_allowed_time(self, check_time: Optional[datetime] = None) -> bool:
        """
        Check if current time is within allowed communication window.

        Args:
            check_time: Time to check (defaults to now)

        Returns:
            True if within allowed window or no restrictions set
        """
        check_time = check_time or datetime.utcnow()

        # Check day of week
        if self.allowed_days is not None:
            current_day = check_time.weekday()  # Monday=0, Sunday=6
            # Convert to our format (Sunday=0)
            current_day = (current_day + 1) % 7
            if current_day not in self.allowed_days:
                return False

        # Check time of day
        if self.allowed_start_time and self.allowed_end_time:
            current_time = check_time.strftime("%H:%M")
            if not (self.allowed_start_time <= current_time <= self.allowed_end_time):
                return False

        return True

    def can_use_feature(self, feature: str) -> bool:
        """Check if a specific feature is allowed."""
        feature_map = {
            "video": self.can_video_call,
            "video_call": self.can_video_call,
            "voice": self.can_voice_call,
            "voice_call": self.can_voice_call,
            "chat": self.can_chat,
            "theater": self.can_theater,
        }
        return feature_map.get(feature, False)


class KidComsCommunicationLog(Base, UUIDMixin):
    """
    KidComsCommunicationLog - Log of all communications for audit and parental review.

    Tracks every call, chat session, and theater session between children
    and their contacts. Includes ARIA monitoring flags.
    """

    __tablename__ = "kidcoms_communication_logs"

    # Links
    room_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("kidcoms_rooms.id", ondelete="SET NULL"), nullable=True
    )
    session_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("kidcoms_sessions.id", ondelete="SET NULL"), nullable=True
    )
    family_file_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("family_files.id", ondelete="CASCADE"), index=True
    )
    child_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("children.id", ondelete="CASCADE"), index=True
    )

    # Contact info
    contact_type: Mapped[str] = mapped_column(String(20))  # parent_a, parent_b, circle
    contact_id: Mapped[Optional[str]] = mapped_column(String(36), index=True)
    contact_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    # Communication details
    communication_type: Mapped[str] = mapped_column(String(20))  # video, voice, chat, theater
    started_at: Mapped[datetime] = mapped_column(DateTime)
    ended_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    duration_seconds: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    # ARIA monitoring
    aria_flags: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    total_messages: Mapped[int] = mapped_column(Integer, default=0)
    flagged_messages: Mapped[int] = mapped_column(Integer, default=0)

    # Recording
    recording_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    # Timestamp
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    room = relationship("KidComsRoom")
    session = relationship("KidComsSession")
    family_file = relationship("FamilyFile")
    child = relationship("Child")

    __table_args__ = (
        Index("ix_kidcoms_comm_logs_family_date", "family_file_id", "started_at"),
    )

    def __repr__(self) -> str:
        return f"<KidComsCommunicationLog {self.communication_type} child={self.child_id}>"

    def end_communication(self) -> None:
        """Mark communication as ended and calculate duration."""
        self.ended_at = datetime.utcnow()
        if self.started_at:
            self.duration_seconds = int((self.ended_at - self.started_at).total_seconds())
