"""
Blog post model and social media marketing content for CommonGround content marketing.
"""

from datetime import datetime
from typing import Optional, List

from sqlalchemy import DateTime, ForeignKey, JSON, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

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

    # Relationships
    marketing_content: Mapped[List["BlogMarketingContent"]] = relationship(
        "BlogMarketingContent", back_populates="blog_post", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<BlogPost {self.slug}>"


class BlogMarketingContent(Base, UUIDMixin, TimestampMixin):
    """
    Platform-specific marketing content generated alongside a blog post.

    One entry per platform per blog post (facebook, instagram, tiktok, linkedin, newsletter).
    """

    __tablename__ = "blog_marketing_content"
    __table_args__ = (
        UniqueConstraint("blog_post_id", "platform", name="uq_blog_marketing_platform"),
    )

    blog_post_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("blog_posts.id", ondelete="CASCADE"), index=True
    )
    platform: Mapped[str] = mapped_column(String(50))  # facebook, instagram, tiktok, linkedin, newsletter

    headline: Mapped[str] = mapped_column(String(500))
    body: Mapped[str] = mapped_column(Text)
    hashtags: Mapped[list] = mapped_column(JSON, default=list)
    cta_text: Mapped[str] = mapped_column(String(500))
    cta_url: Mapped[str] = mapped_column(String(2048))

    # Relationships
    blog_post: Mapped["BlogPost"] = relationship("BlogPost", back_populates="marketing_content")

    def __repr__(self) -> str:
        return f"<BlogMarketingContent {self.platform} for {self.blog_post_id}>"
