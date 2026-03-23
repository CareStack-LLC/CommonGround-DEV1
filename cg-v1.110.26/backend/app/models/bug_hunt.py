"""Bug Hunt Cohort models for organized QA testing sessions."""

from datetime import datetime
from typing import Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDMixin


class BugHuntCohort(Base, UUIDMixin, TimestampMixin):
    """A bug hunt testing session with generated test data."""

    __tablename__ = "bug_hunt_cohorts"

    name: Mapped[str] = mapped_column(String(200))
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    target_feature: Mapped[str] = mapped_column(String(50), default="general")
    status: Mapped[str] = mapped_column(String(20), default="draft")
    family_count: Mapped[int] = mapped_column(Integer, default=3)
    test_instructions: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_by: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"))
    started_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    seed_config: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    summary_json: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)

    # Relationships
    families = relationship("BugHuntFamily", back_populates="cohort", cascade="all, delete-orphan")
    checklist_items = relationship("BugHuntChecklistItem", back_populates="cohort", cascade="all, delete-orphan")
    notes = relationship("BugHuntNote", back_populates="cohort", cascade="all, delete-orphan")
    bug_reports = relationship("BugHuntBugReport", back_populates="cohort", cascade="all, delete-orphan")
    feedback = relationship("BugHuntFeedback", back_populates="cohort", cascade="all, delete-orphan")
    testers = relationship("BugHuntTester", back_populates="cohort", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<BugHuntCohort {self.name} ({self.status})>"


class BugHuntFamily(Base, UUIDMixin, TimestampMixin):
    """A seeded test family within a bug hunt cohort."""

    __tablename__ = "bug_hunt_families"

    cohort_id: Mapped[str] = mapped_column(String(36), ForeignKey("bug_hunt_cohorts.id"), index=True)
    family_file_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("family_files.id"), nullable=True)
    parent_a_email: Mapped[str] = mapped_column(String(255))
    parent_a_password: Mapped[str] = mapped_column(String(100))
    parent_b_email: Mapped[str] = mapped_column(String(255))
    parent_b_password: Mapped[str] = mapped_column(String(100))
    parent_a_name: Mapped[str] = mapped_column(String(200))
    parent_b_name: Mapped[str] = mapped_column(String(200))
    children_names: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True, default=list)
    test_status: Mapped[str] = mapped_column(String(20), default="pending")
    tester_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationships
    cohort = relationship("BugHuntCohort", back_populates="families")
    tester = relationship("BugHuntTester", back_populates="family", uselist=False, cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<BugHuntFamily {self.parent_a_name} & {self.parent_b_name} ({self.test_status})>"


class BugHuntChecklistItem(Base, UUIDMixin, TimestampMixin):
    """A checklist item to verify during a bug hunt."""

    __tablename__ = "bug_hunt_checklist_items"

    cohort_id: Mapped[str] = mapped_column(String(36), ForeignKey("bug_hunt_cohorts.id"), index=True)
    title: Mapped[str] = mapped_column(String(500))
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    display_order: Mapped[int] = mapped_column(Integer, default=0)
    is_completed: Mapped[bool] = mapped_column(Boolean, default=False)
    completed_by: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("users.id"), nullable=True)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    tester_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("bug_hunt_testers.id", ondelete="SET NULL"), nullable=True)

    # Relationships
    cohort = relationship("BugHuntCohort", back_populates="checklist_items")

    def __repr__(self) -> str:
        return f"<BugHuntChecklistItem {self.title[:40]} ({'done' if self.is_completed else 'pending'})>"


class BugHuntNote(Base, UUIDMixin, TimestampMixin):
    """A tester note or observation during a bug hunt."""

    __tablename__ = "bug_hunt_notes"

    cohort_id: Mapped[str] = mapped_column(String(36), ForeignKey("bug_hunt_cohorts.id"), index=True)
    family_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("bug_hunt_families.id"), nullable=True)
    author_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("users.id"), nullable=True)
    tester_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("bug_hunt_testers.id", ondelete="SET NULL"), nullable=True)
    content: Mapped[str] = mapped_column(Text)
    note_type: Mapped[str] = mapped_column(String(20), default="observation")

    # Relationships
    cohort = relationship("BugHuntCohort", back_populates="notes")

    def __repr__(self) -> str:
        return f"<BugHuntNote {self.note_type}>"


class BugHuntBugReport(Base, UUIDMixin, TimestampMixin):
    """A bug report filed during a bug hunt cohort."""

    __tablename__ = "bug_hunt_bug_reports"

    cohort_id: Mapped[str] = mapped_column(String(36), ForeignKey("bug_hunt_cohorts.id"), index=True)
    family_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("bug_hunt_families.id"), nullable=True)
    reported_by: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("users.id"), nullable=True)
    tester_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("bug_hunt_testers.id", ondelete="SET NULL"), nullable=True)
    title: Mapped[str] = mapped_column(String(500))
    description: Mapped[str] = mapped_column(Text)
    severity: Mapped[str] = mapped_column(String(20), default="medium")
    status: Mapped[str] = mapped_column(String(20), default="open")
    sentry_issue_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    steps_to_reproduce: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    screenshot_urls: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True, default=list)

    # Relationships
    cohort = relationship("BugHuntCohort", back_populates="bug_reports")

    def __repr__(self) -> str:
        return f"<BugHuntBugReport {self.title[:40]} [{self.severity}] ({self.status})>"


class BugHuntFeedback(Base, UUIDMixin, TimestampMixin):
    """User feedback submitted during a bug hunt cohort."""

    __tablename__ = "bug_hunt_feedback"

    cohort_id: Mapped[str] = mapped_column(String(36), ForeignKey("bug_hunt_cohorts.id"), index=True)
    family_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("bug_hunt_families.id"), nullable=True)
    submitted_by: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("users.id"), nullable=True)
    tester_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("bug_hunt_testers.id", ondelete="SET NULL"), nullable=True)
    rating: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    category: Mapped[str] = mapped_column(String(50), default="other")
    content: Mapped[str] = mapped_column(Text)
    feature_area: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    # Relationships
    cohort = relationship("BugHuntCohort", back_populates="feedback")

    def __repr__(self) -> str:
        return f"<BugHuntFeedback [{self.category}] rating={self.rating}>"


class BugHuntTester(Base, UUIDMixin, TimestampMixin):
    """A real-world tester assigned to a bug hunt test family."""

    __tablename__ = "bug_hunt_testers"

    cohort_id: Mapped[str] = mapped_column(String(36), ForeignKey("bug_hunt_cohorts.id"), index=True)
    family_id: Mapped[str] = mapped_column(String(36), ForeignKey("bug_hunt_families.id"), index=True)
    tester_name: Mapped[str] = mapped_column(String(200))
    tester_email: Mapped[str] = mapped_column(String(255))
    access_token: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    token_expires_at: Mapped[datetime] = mapped_column(DateTime)
    status: Mapped[str] = mapped_column(String(20), default="invited")
    first_accessed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    last_accessed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    email_sent_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # Relationships
    cohort = relationship("BugHuntCohort", back_populates="testers")
    family = relationship("BugHuntFamily", back_populates="tester")

    def __repr__(self) -> str:
        return f"<BugHuntTester {self.tester_name} ({self.status})>"
