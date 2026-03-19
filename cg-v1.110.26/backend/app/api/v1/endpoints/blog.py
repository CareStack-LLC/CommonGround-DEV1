"""
Blog API endpoints - admin CRUD and public read access.

Admin endpoints require get_current_admin_user.
Public endpoint serves published posts for the /blog page.
"""

import logging
import re
from datetime import datetime
from typing import Optional
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_admin_user
from app.models.user import User
from app.models.blog import BlogPost

logger = logging.getLogger(__name__)
router = APIRouter()


# =============================================================================
# Pydantic Schemas
# =============================================================================

class BlogPostCreate(BaseModel):
    title: str = Field(..., max_length=500)
    slug: Optional[str] = Field(None, max_length=500)
    content: str
    excerpt: str = Field(..., max_length=1000)
    author: str = Field(default="CommonGround Team", max_length=200)
    category: str = Field(..., max_length=100)
    tags: list[str] = Field(default_factory=list)
    featured_image_url: Optional[str] = None
    seo_title: Optional[str] = None
    seo_description: Optional[str] = None


class BlogPostUpdate(BaseModel):
    title: Optional[str] = Field(None, max_length=500)
    slug: Optional[str] = Field(None, max_length=500)
    content: Optional[str] = None
    excerpt: Optional[str] = Field(None, max_length=1000)
    author: Optional[str] = Field(None, max_length=200)
    category: Optional[str] = Field(None, max_length=100)
    tags: Optional[list[str]] = None
    featured_image_url: Optional[str] = None
    seo_title: Optional[str] = None
    seo_description: Optional[str] = None


class BlogGenerateRequest(BaseModel):
    topic: str
    keywords: Optional[list[str]] = None


def _slugify(text: str) -> str:
    """Generate a URL-safe slug from text."""
    slug = text.lower().strip()
    slug = re.sub(r"[^\w\s-]", "", slug)
    slug = re.sub(r"[\s_]+", "-", slug)
    slug = re.sub(r"-+", "-", slug)
    return slug.strip("-")


def _post_to_dict(post: BlogPost) -> dict:
    return {
        "id": str(post.id),
        "title": post.title,
        "slug": post.slug,
        "content": post.content,
        "excerpt": post.excerpt,
        "author": post.author,
        "category": post.category,
        "tags": post.tags or [],
        "featured_image_url": post.featured_image_url,
        "status": post.status,
        "published_at": post.published_at.isoformat() if post.published_at else None,
        "seo_title": post.seo_title,
        "seo_description": post.seo_description,
        "created_at": post.created_at.isoformat() if post.created_at else None,
        "updated_at": post.updated_at.isoformat() if post.updated_at else None,
    }


# =============================================================================
# PUBLIC ENDPOINTS
# =============================================================================

@router.get(
    "/posts",
    summary="List published blog posts (public)",
)
async def list_published_posts(
    category: Optional[str] = Query(None),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    List published blog posts for the public /blog page.
    No authentication required.
    """
    query = select(BlogPost).where(BlogPost.status == "published")

    if category:
        query = query.where(BlogPost.category == category)

    query = query.order_by(desc(BlogPost.published_at))

    # Count total
    from sqlalchemy import func
    count_query = select(func.count()).select_from(
        query.subquery()
    )
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    # Paginate
    query = query.offset(offset).limit(limit)
    result = await db.execute(query)
    posts = result.scalars().all()

    return {
        "posts": [_post_to_dict(p) for p in posts],
        "total": total,
        "limit": limit,
        "offset": offset,
    }


# =============================================================================
# ADMIN ENDPOINTS
# =============================================================================

@router.post(
    "/admin/posts",
    summary="Create a blog post (admin)",
    status_code=status.HTTP_201_CREATED,
)
async def create_blog_post(
    data: BlogPostCreate,
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user),
) -> dict:
    """Create a new blog post (draft by default)."""
    slug = data.slug or _slugify(data.title)

    # Check slug uniqueness
    existing = await db.execute(
        select(BlogPost).where(BlogPost.slug == slug)
    )
    if existing.scalar_one_or_none():
        slug = f"{slug}-{str(uuid4())[:8]}"

    post = BlogPost(
        title=data.title,
        slug=slug,
        content=data.content,
        excerpt=data.excerpt,
        author=data.author,
        category=data.category,
        tags=data.tags,
        featured_image_url=data.featured_image_url,
        seo_title=data.seo_title,
        seo_description=data.seo_description,
        status="draft",
    )
    db.add(post)
    await db.commit()
    await db.refresh(post)

    return _post_to_dict(post)


@router.get(
    "/admin/posts",
    summary="List all blog posts (admin)",
)
async def list_all_posts(
    status_filter: Optional[str] = Query(None, alias="status"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user),
) -> dict:
    """List all blog posts including drafts (admin view)."""
    query = select(BlogPost)

    if status_filter:
        query = query.where(BlogPost.status == status_filter)

    query = query.order_by(desc(BlogPost.created_at))

    from sqlalchemy import func
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    query = query.offset(offset).limit(limit)
    result = await db.execute(query)
    posts = result.scalars().all()

    return {
        "posts": [_post_to_dict(p) for p in posts],
        "total": total,
        "limit": limit,
        "offset": offset,
    }


@router.get(
    "/admin/posts/{post_id}",
    summary="Get a blog post (admin)",
)
async def get_blog_post(
    post_id: str,
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user),
) -> dict:
    """Get a single blog post by ID."""
    result = await db.execute(
        select(BlogPost).where(BlogPost.id == post_id)
    )
    post = result.scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=404, detail="Blog post not found")

    return _post_to_dict(post)


@router.put(
    "/admin/posts/{post_id}",
    summary="Update a blog post (admin)",
)
async def update_blog_post(
    post_id: str,
    data: BlogPostUpdate,
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user),
) -> dict:
    """Update an existing blog post."""
    result = await db.execute(
        select(BlogPost).where(BlogPost.id == post_id)
    )
    post = result.scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=404, detail="Blog post not found")

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(post, field, value)

    await db.commit()
    await db.refresh(post)

    return _post_to_dict(post)


@router.delete(
    "/admin/posts/{post_id}",
    summary="Delete a blog post (admin)",
)
async def delete_blog_post(
    post_id: str,
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user),
) -> dict:
    """Delete a blog post permanently."""
    result = await db.execute(
        select(BlogPost).where(BlogPost.id == post_id)
    )
    post = result.scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=404, detail="Blog post not found")

    await db.delete(post)
    await db.commit()

    return {"deleted": True, "id": post_id}


@router.post(
    "/admin/posts/{post_id}/publish",
    summary="Publish a blog post (admin)",
)
async def publish_blog_post(
    post_id: str,
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user),
) -> dict:
    """Set a blog post to published status."""
    result = await db.execute(
        select(BlogPost).where(BlogPost.id == post_id)
    )
    post = result.scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=404, detail="Blog post not found")

    post.status = "published"
    post.published_at = datetime.utcnow()
    await db.commit()
    await db.refresh(post)

    return _post_to_dict(post)


@router.post(
    "/admin/posts/{post_id}/unpublish",
    summary="Unpublish a blog post (admin)",
)
async def unpublish_blog_post(
    post_id: str,
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user),
) -> dict:
    """Revert a blog post to draft status."""
    result = await db.execute(
        select(BlogPost).where(BlogPost.id == post_id)
    )
    post = result.scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=404, detail="Blog post not found")

    post.status = "draft"
    await db.commit()
    await db.refresh(post)

    return _post_to_dict(post)


@router.post(
    "/admin/generate",
    summary="Generate blog post content with AI (admin)",
)
async def generate_blog_post(
    data: BlogGenerateRequest,
    admin_user: User = Depends(get_current_admin_user),
) -> dict:
    """
    Generate a blog post using the Anthropic API.

    Returns generated content (title, body, excerpt, SEO fields)
    without saving to database. Admin can review and then create.
    """
    import anthropic
    from app.core.config import settings

    client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)

    keywords_text = ""
    if data.keywords:
        keywords_text = f"\nKeywords to incorporate: {', '.join(data.keywords)}"

    system_prompt = (
        "You are a content writer for CommonGround, an AI-powered co-parenting platform. "
        "Your brand voice is warm, supportive, professional, and empathetic. "
        "You focus on helping separated and divorced parents collaborate effectively "
        "for the well-being of their children. "
        "You never take sides, and you always center the child's best interests. "
        "Write in plain language at an 8th grade reading level. "
        "Use gender-neutral terms like 'co-parent' instead of 'ex'."
    )

    user_prompt = (
        f"Write a blog post about: {data.topic}\n"
        f"{keywords_text}\n\n"
        "Return a JSON object with these fields:\n"
        '- "title": compelling blog title (under 80 chars)\n'
        '- "content": full blog post in HTML (1000-2000 words, use <h2>, <h3>, <p>, <ul>, <li>, <strong>, <em> tags)\n'
        '- "excerpt": 1-2 sentence summary (under 200 chars)\n'
        '- "seo_title": SEO-optimized title (under 60 chars)\n'
        '- "seo_description": meta description (under 160 chars)\n'
        '- "suggested_slug": URL slug\n'
        '- "suggested_category": one of: co-parenting, communication, legal, children, wellness, technology\n'
        '- "suggested_tags": array of 3-5 relevant tags\n\n'
        "Return ONLY valid JSON, no markdown code fences."
    )

    try:
        response = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=4096,
            system=system_prompt,
            messages=[{"role": "user", "content": user_prompt}],
        )

        import json
        content_text = response.content[0].text
        generated = json.loads(content_text)

        return {
            "generated": True,
            "title": generated.get("title", ""),
            "content": generated.get("content", ""),
            "excerpt": generated.get("excerpt", ""),
            "seo_title": generated.get("seo_title", ""),
            "seo_description": generated.get("seo_description", ""),
            "suggested_slug": generated.get("suggested_slug", ""),
            "suggested_category": generated.get("suggested_category", ""),
            "suggested_tags": generated.get("suggested_tags", []),
        }

    except json.JSONDecodeError:
        # If Claude doesn't return valid JSON, return raw text
        return {
            "generated": True,
            "title": "",
            "content": content_text,
            "excerpt": "",
            "seo_title": "",
            "seo_description": "",
            "suggested_slug": "",
            "suggested_category": "",
            "suggested_tags": [],
            "parse_error": "AI response was not valid JSON. Content returned as raw text.",
        }
    except Exception as e:
        logger.error(f"Blog generation failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Blog generation failed. Check API key and try again.",
        )
