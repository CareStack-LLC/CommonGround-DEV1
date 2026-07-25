"""
Blog API endpoints - admin CRUD and public read access.

Admin endpoints require get_current_admin_user.
Public endpoint serves published posts for the /blog page.
"""

import asyncio
import logging
import re
from datetime import datetime
from typing import Optional
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.security import get_current_admin_user
from app.models.user import User
from app.models.blog import BlogPost, BlogMarketingContent

logger = logging.getLogger(__name__)
router = APIRouter()

PLATFORMS = ["facebook", "instagram", "tiktok", "linkedin", "newsletter"]


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
    marketing_content: Optional[list[dict]] = None


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


class MarketingContentUpdate(BaseModel):
    headline: Optional[str] = Field(None, max_length=500)
    body: Optional[str] = None
    hashtags: Optional[list[str]] = None
    cta_text: Optional[str] = Field(None, max_length=500)
    cta_url: Optional[str] = Field(None, max_length=2048)


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


def _marketing_to_dict(mc: BlogMarketingContent) -> dict:
    return {
        "id": str(mc.id),
        "blog_post_id": str(mc.blog_post_id),
        "platform": mc.platform,
        "headline": mc.headline,
        "body": mc.body,
        "hashtags": mc.hashtags or [],
        "cta_text": mc.cta_text,
        "cta_url": mc.cta_url,
        "created_at": mc.created_at.isoformat() if mc.created_at else None,
        "updated_at": mc.updated_at.isoformat() if mc.updated_at else None,
    }


def _post_to_dict(post: BlogPost, include_marketing: bool = False) -> dict:
    result = {
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
    if include_marketing:
        try:
            result["marketing_content"] = [
                _marketing_to_dict(mc) for mc in (post.marketing_content or [])
            ]
        except Exception:
            result["marketing_content"] = []
    return result


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


@router.get(
    "/posts/{slug}",
    summary="Get a published blog post by slug (public)",
)
async def get_published_post_by_slug(
    slug: str,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Get a single published blog post by its URL slug. No auth required."""
    result = await db.execute(
        select(BlogPost).where(BlogPost.slug == slug, BlogPost.status == "published")
    )
    post = result.scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    return _post_to_dict(post)


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
    """Create a new blog post (draft by default). Optionally includes marketing content."""
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
    await db.flush()

    # Save marketing content if provided
    if data.marketing_content:
        blog_url = f"https://find-commonground.com/blog/{slug}"
        for mc_data in data.marketing_content:
            platform = mc_data.get("platform", "")
            if platform not in PLATFORMS:
                continue
            mc = BlogMarketingContent(
                blog_post_id=post.id,
                platform=platform,
                headline=mc_data.get("headline", ""),
                body=mc_data.get("body", ""),
                hashtags=mc_data.get("hashtags", []),
                cta_text=mc_data.get("cta_text", ""),
                cta_url=mc_data.get("cta_url", blog_url),
            )
            db.add(mc)

    await db.commit()
    await db.refresh(post)

    # Reload with marketing content
    result = await db.execute(
        select(BlogPost).options(selectinload(BlogPost.marketing_content)).where(BlogPost.id == post.id)
    )
    post = result.scalar_one()

    return _post_to_dict(post, include_marketing=True)


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
    query = select(BlogPost).options(selectinload(BlogPost.marketing_content))

    if status_filter:
        query = query.where(BlogPost.status == status_filter)

    query = query.order_by(desc(BlogPost.created_at))

    from sqlalchemy import func
    count_q = select(func.count()).select_from(
        select(BlogPost.id).where(BlogPost.status == status_filter).subquery()
        if status_filter else select(BlogPost.id).subquery()
    )
    total_result = await db.execute(count_q)
    total = total_result.scalar() or 0

    query = query.offset(offset).limit(limit)
    result = await db.execute(query)
    posts = result.scalars().unique().all()

    return {
        "posts": [_post_to_dict(p, include_marketing=True) for p in posts],
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
    """Get a single blog post by ID with marketing content."""
    result = await db.execute(
        select(BlogPost).options(selectinload(BlogPost.marketing_content)).where(BlogPost.id == post_id)
    )
    post = result.scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=404, detail="Blog post not found")

    return _post_to_dict(post, include_marketing=True)


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


# =============================================================================
# MARKETING CONTENT ENDPOINTS
# =============================================================================

@router.get(
    "/admin/posts/{post_id}/marketing",
    summary="Get marketing content for a blog post (admin)",
)
async def get_marketing_content(
    post_id: str,
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user),
) -> dict:
    """Get all platform marketing content for a blog post."""
    result = await db.execute(
        select(BlogMarketingContent).where(BlogMarketingContent.blog_post_id == post_id)
    )
    items = result.scalars().all()
    return {"marketing_content": [_marketing_to_dict(mc) for mc in items]}


@router.put(
    "/admin/posts/{post_id}/marketing/{platform}",
    summary="Update marketing content for a platform (admin)",
)
async def update_marketing_content(
    post_id: str,
    platform: str,
    data: MarketingContentUpdate,
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user),
) -> dict:
    """Update marketing content for a specific platform."""
    if platform not in PLATFORMS:
        raise HTTPException(status_code=400, detail=f"Invalid platform. Must be one of: {', '.join(PLATFORMS)}")

    result = await db.execute(
        select(BlogMarketingContent).where(
            BlogMarketingContent.blog_post_id == post_id,
            BlogMarketingContent.platform == platform,
        )
    )
    mc = result.scalar_one_or_none()
    if not mc:
        raise HTTPException(status_code=404, detail=f"No marketing content found for platform: {platform}")

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(mc, field, value)

    await db.commit()
    await db.refresh(mc)

    return _marketing_to_dict(mc)


# =============================================================================
# AI GENERATION
# =============================================================================

@router.post(
    "/admin/generate",
    summary="Generate blog post content with AI (admin)",
)
async def generate_blog_post(
    data: BlogGenerateRequest,
    admin_user: User = Depends(get_current_admin_user),
) -> dict:
    """
    Generate a blog post and platform-specific marketing content using AI.

    Returns generated content (title, body, excerpt, SEO fields, marketing content)
    without saving to database. Admin can review and then create.
    """
    import json
    import os
    from app.core.config import settings

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
        '- "suggested_category": one of: Co-Parenting Tips, Communication, Legal Insights, Family Wellness, ARIA & Technology, KidSpace\n'
        '- "suggested_tags": array of 3-5 relevant tags\n'
        '- "marketing": object with platform-specific social media content, each keyed by platform name:\n'
        '  - "facebook": { "headline": short hook for Facebook groups (under 100 chars), "body": community-oriented post (150-300 words, empathetic, shareable, question at end to drive comments), "hashtags": [5-8 hashtags for Facebook reach], "cta_text": CTA text }\n'
        '  - "instagram": { "headline": attention-grabbing first line (under 80 chars), "body": Instagram caption (150-200 words, emotional hook, line breaks for readability, engagement question), "hashtags": [20-30 mix of branded + discovery hashtags], "cta_text": CTA text }\n'
        '  - "tiktok": { "headline": hook-first caption (under 80 chars), "body": TikTok description (50-100 words, conversational, trend-aware), "hashtags": [8-12 mix of viral + niche hashtags], "cta_text": CTA text }\n'
        '  - "linkedin": { "headline": professional thought-leadership hook (under 100 chars), "body": LinkedIn post (200-400 words, professional tone targeting family law attorneys/mediators/GALs, data-driven, industry insight angle), "hashtags": [5-8 professional hashtags], "cta_text": CTA text }\n'
        '  - "newsletter": { "headline": email subject line (under 60 chars), "body": email body (200-300 words, warm personal tone, value-first, clear CTA to read blog), "hashtags": [], "cta_text": CTA button text }\n\n'
        "Return ONLY valid JSON, no markdown code fences."
    )

    content_text = ""

    # Try Anthropic first, fall back to OpenAI
    try:
        if settings.ANTHROPIC_API_KEY:
            import anthropic
            client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
            response = await asyncio.to_thread(
                client.messages.create,
                model="claude-sonnet-4-5",
                max_tokens=8192,
                system=system_prompt,
                messages=[{"role": "user", "content": user_prompt}],
            )
            content_text = response.content[0].text
            logger.info("Blog generated via Anthropic Claude")
        else:
            raise Exception("No Anthropic key, falling back to OpenAI")

    except Exception as anthropic_err:
        logger.warning(f"Anthropic failed ({anthropic_err}), trying OpenAI fallback")

        openai_key = os.environ.get("OPENAI_API_KEY") or getattr(settings, "OPENAI_API_KEY", None)
        if not openai_key:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Neither ANTHROPIC_API_KEY nor OPENAI_API_KEY configured.",
            )

        from openai import OpenAI
        openai_client = OpenAI(api_key=openai_key)
        response = await asyncio.to_thread(
            openai_client.chat.completions.create,
            model="gpt-4o",
            max_tokens=8192,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
        )
        content_text = response.choices[0].message.content or ""
        logger.info("Blog generated via OpenAI GPT-4o fallback")

    # Parse JSON response
    try:
        # Strip markdown fences if present
        cleaned = content_text.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.split("\n", 1)[1] if "\n" in cleaned else cleaned[3:]
            if cleaned.endswith("```"):
                cleaned = cleaned[:-3]
            cleaned = cleaned.strip()

        generated = json.loads(cleaned)

        # Generate feature image with DALL-E 3
        featured_image_url = None
        featured_image_alt = None
        try:
            featured_image_url, featured_image_alt = await _generate_blog_image(
                title=generated.get("title", data.topic),
                excerpt=generated.get("excerpt", ""),
                category=generated.get("suggested_category", ""),
                slug=generated.get("suggested_slug", _slugify(generated.get("title", data.topic))),
            )
        except Exception as img_err:
            logger.warning(f"Blog image generation failed (non-blocking): {img_err}")

        # Build marketing content with blog URL
        slug = generated.get("suggested_slug", _slugify(generated.get("title", data.topic)))
        blog_url = f"https://find-commonground.com/blog/{slug}"
        marketing_raw = generated.get("marketing", {})
        marketing_content = []
        for platform in PLATFORMS:
            platform_data = marketing_raw.get(platform, {})
            if platform_data:
                marketing_content.append({
                    "platform": platform,
                    "headline": platform_data.get("headline", ""),
                    "body": platform_data.get("body", ""),
                    "hashtags": platform_data.get("hashtags", []),
                    "cta_text": platform_data.get("cta_text", "Learn more"),
                    "cta_url": blog_url,
                })

        return {
            "generated": True,
            "title": generated.get("title", ""),
            "content": generated.get("content", ""),
            "excerpt": generated.get("excerpt", ""),
            "seo_title": generated.get("seo_title", ""),
            "seo_description": generated.get("seo_description", ""),
            "suggested_slug": slug,
            "suggested_category": generated.get("suggested_category", ""),
            "suggested_tags": generated.get("suggested_tags", []),
            "featured_image_url": featured_image_url,
            "featured_image_alt": featured_image_alt,
            "marketing_content": marketing_content,
        }

    except json.JSONDecodeError:
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
            "featured_image_url": None,
            "featured_image_alt": None,
            "marketing_content": [],
            "parse_error": "AI response was not valid JSON. Content returned as raw text.",
        }
    except Exception as e:
        logger.error(f"Blog generation failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Blog generation failed: {str(e)}",
        )


async def _generate_blog_image(
    title: str,
    excerpt: str,
    category: str,
    slug: str,
) -> tuple[Optional[str], Optional[str]]:
    """
    Generate a feature image for a blog post using DALL-E 3,
    upload it to Supabase storage, and return (url, alt_text).

    Returns (None, None) if generation fails.
    """
    import os
    import httpx
    from openai import OpenAI
    from app.core.config import settings
    from app.services.storage import storage_service, StorageBucket

    openai_key = os.environ.get("OPENAI_API_KEY") or getattr(settings, "OPENAI_API_KEY", None)
    if not openai_key:
        logger.info("No OPENAI_API_KEY configured — skipping blog image generation")
        return None, None

    # Build the DALL-E prompt with CommonGround brand style
    brand_style = (
        "Warm, organic illustration style with flowing teal (#3DAA8A) blob outlines "
        "and soft color-pencil texture. Soft white (#F4F8F7) background. "
        "Small coral-pink (#E85D75) hand-drawn accent icons floating nearby. "
        "Calm, child-centered, trustworthy mood. "
        "No text, no words, no letters, no numbers in the image."
    )

    subject = f"Blog topic: {title}"
    if excerpt:
        subject += f". {excerpt}"
    if category:
        subject += f" Category: {category}."

    dalle_prompt = (
        f"{brand_style}\n\n"
        f"Subject: Create an illustration for a co-parenting blog post. {subject}\n\n"
        "The image should feel warm and supportive, showing themes of family, "
        "cooperation, children's wellbeing, or peaceful co-parenting. "
        "Use diverse, inclusive representation."
    )

    # Generate image with DALL-E 3
    openai_client = OpenAI(api_key=openai_key)
    response = await asyncio.to_thread(
        openai_client.images.generate,
        model="dall-e-3",
        prompt=dalle_prompt,
        size="1792x1024",
        quality="standard",
        n=1,
    )

    image_url = response.data[0].url
    if not image_url:
        logger.warning("DALL-E 3 returned no image URL")
        return None, None

    # Download the image from OpenAI's temporary URL
    async with httpx.AsyncClient(timeout=30.0) as http_client:
        img_response = await http_client.get(image_url)
        img_response.raise_for_status()
        image_bytes = img_response.content

    # Upload to Supabase blog-images bucket
    storage_path = f"{slug}.png"
    public_url = await storage_service.upload_file(
        bucket=StorageBucket.BLOG_IMAGES,
        path=storage_path,
        file_content=image_bytes,
        content_type="image/png",
        upsert=True,
    )

    # Generate alt text from title
    alt_text = f"Illustration for blog post: {title}"

    logger.info(f"Blog image generated and uploaded: {public_url}")
    return public_url, alt_text
