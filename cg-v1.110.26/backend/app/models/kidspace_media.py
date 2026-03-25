"""
KidSpace media models - movies, books, authors, and genres for the KidSpace portal.
"""

from datetime import datetime
from typing import Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDMixin


class KidSpaceGenre(Base, UUIDMixin):
    """Genre/category for KidSpace media content."""

    __tablename__ = "kidspace_genres"

    name: Mapped[str] = mapped_column(String(100))
    description: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    icon_emoji: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )

    # Relationships
    movies: Mapped[list["KidSpaceMovie"]] = relationship(
        "KidSpaceMovie", back_populates="genre"
    )
    books: Mapped[list["KidSpaceBook"]] = relationship(
        "KidSpaceBook", back_populates="genre"
    )

    def __repr__(self) -> str:
        return f"<KidSpaceGenre {self.name}>"


class KidSpaceAuthor(Base, UUIDMixin):
    """Author of KidSpace books."""

    __tablename__ = "kidspace_authors"

    name: Mapped[str] = mapped_column(String(200))
    bio: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    photo_url: Mapped[Optional[str]] = mapped_column(String(2048), nullable=True)
    is_featured: Mapped[bool] = mapped_column(Boolean, default=False)
    showcase_book_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("kidspace_books.id"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )

    # Relationships
    books: Mapped[list["KidSpaceBook"]] = relationship(
        "KidSpaceBook", back_populates="author", foreign_keys="KidSpaceBook.author_id"
    )

    def __repr__(self) -> str:
        return f"<KidSpaceAuthor {self.name}>"


class KidSpaceMovie(Base, UUIDMixin):
    """Movie/video content for KidSpace theater."""

    __tablename__ = "kidspace_movies"

    title: Mapped[str] = mapped_column(String(300))
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    duration_minutes: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    age_min: Mapped[int] = mapped_column(Integer, default=3)
    age_max: Mapped[int] = mapped_column(Integer, default=12)

    genre_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("kidspace_genres.id"), nullable=True
    )

    poster_url: Mapped[Optional[str]] = mapped_column(String(2048), nullable=True)
    video_url: Mapped[Optional[str]] = mapped_column(String(2048), nullable=True)
    trailer_url: Mapped[Optional[str]] = mapped_column(String(2048), nullable=True)

    is_featured: Mapped[bool] = mapped_column(Boolean, default=False)
    is_visible: Mapped[bool] = mapped_column(Boolean, default=True)
    is_approved: Mapped[bool] = mapped_column(Boolean, default=False)  # Requires admin approval before visible to children
    view_count: Mapped[int] = mapped_column(Integer, default=0)
    total_minutes_watched: Mapped[int] = mapped_column(Integer, default=0)

    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )

    # Relationships
    genre: Mapped[Optional["KidSpaceGenre"]] = relationship(
        "KidSpaceGenre", back_populates="movies"
    )

    def __repr__(self) -> str:
        return f"<KidSpaceMovie {self.title}>"


class KidSpaceBook(Base, UUIDMixin):
    """Book/story content for KidSpace reading."""

    __tablename__ = "kidspace_books"

    title: Mapped[str] = mapped_column(String(300))
    author_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("kidspace_authors.id"), nullable=True
    )
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    page_count: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    age_min: Mapped[int] = mapped_column(Integer, default=3)
    age_max: Mapped[int] = mapped_column(Integer, default=12)

    genre_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("kidspace_genres.id"), nullable=True
    )

    cover_url: Mapped[Optional[str]] = mapped_column(String(2048), nullable=True)
    pdf_url: Mapped[Optional[str]] = mapped_column(String(2048), nullable=True)

    is_featured: Mapped[bool] = mapped_column(Boolean, default=False)
    is_visible: Mapped[bool] = mapped_column(Boolean, default=True)
    is_approved: Mapped[bool] = mapped_column(Boolean, default=False)  # Requires admin approval before visible to children
    read_count: Mapped[int] = mapped_column(Integer, default=0)
    total_pages_turned: Mapped[int] = mapped_column(Integer, default=0)

    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )

    # Relationships
    author: Mapped[Optional["KidSpaceAuthor"]] = relationship(
        "KidSpaceAuthor", back_populates="books", foreign_keys=[author_id]
    )
    genre: Mapped[Optional["KidSpaceGenre"]] = relationship(
        "KidSpaceGenre", back_populates="books"
    )

    def __repr__(self) -> str:
        return f"<KidSpaceBook {self.title}>"
