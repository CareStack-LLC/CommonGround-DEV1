"""
Blog post model for CommonGround content marketing.
"""

from datetime import datetime
from typing import Optional, List

from sqlalchemy import DateTime, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, UUIDMixin


class BlogPost(Base, UUIDMixin, TimestampMixin):
    """
    Blog post for the CommonGround marketing site.

    Supports draft/published workflow, SEO metadata, and AI generation.
    """

    __tablename__ = "blog_posts"

    title: Mapped[str] = mapped_column(String(500))
    slug: Mapped[str] = mapped_column(String(500), unique=True, index=True)
    content: Mapped[str] = mapped_column(Text)
    excerpt: Mapped[str] = mapped_column(String(1000))

    author: Mapped[str] = mapped_column(String(200), default="CommonGround Team")
    category: Mapped[str] = mapped_column(String(100))
    tags: Mapped[list] = mapped_column(JSON, default=list)

    featured_image_url: Mapped[Optional[str]] = mapped_column(String(2048), nullable=True)

    # Workflow
    status: Mapped[str] = mapped_column(String(20), default="draft")  # draft, published
    published_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # SEO
    seo_title: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    seo_description: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    def __repr__(self) -> str:
        return f"<BlogPost {self.slug}>"
