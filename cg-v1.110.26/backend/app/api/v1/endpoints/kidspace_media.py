"""
KidSpace Media API - admin CRUD and public read for movies, books, authors, genres.

Admin endpoints handle file uploads to Supabase kidspace-media bucket.
Public endpoints serve visible content for the KidSpace frontend.
"""

import logging
from datetime import datetime
from typing import Optional
from uuid import uuid4

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, Request, UploadFile, status
from pydantic import BaseModel, Field
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_admin_user, decode_token
from app.models.user import User
from app.models.child import Child
from app.models.kidspace_media import KidSpaceGenre, KidSpaceAuthor, KidSpaceMovie, KidSpaceBook
from app.services.storage import SupabaseStorageService

logger = logging.getLogger(__name__)
router = APIRouter()

KIDSPACE_MEDIA_BUCKET = "kidspace-media"


async def _optional_child_age(
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> Optional[int]:
    """If the caller is an authenticated child, return their actual age.

    Used to ENFORCE age-appropriate media for children: when present, this
    overrides the client-supplied ``age`` filter so a child can't request older
    content. Returns None for public/marketing (non-child) callers, leaving the
    optional ``age`` query param in effect.
    """
    auth = request.headers.get("authorization") or ""
    if not auth.lower().startswith("bearer "):
        return None
    token = auth.split(" ", 1)[1].strip()
    try:
        payload = decode_token(token)
        if payload.get("type") != "child_user":
            return None
        child_id = payload.get("child_id")
        if not child_id:
            return None
        child = (
            await db.execute(select(Child).where(Child.id == child_id))
        ).scalar_one_or_none()
        if child and child.date_of_birth:
            return child.age
    except Exception:
        return None
    return None


# =============================================================================
# Helper serializers
# =============================================================================

def _genre_to_dict(g: KidSpaceGenre) -> dict:
    return {
        "id": str(g.id),
        "name": g.name,
        "description": g.description,
        "icon_emoji": g.icon_emoji,
        "created_at": g.created_at.isoformat() if g.created_at else None,
    }


def _author_to_dict(a: KidSpaceAuthor) -> dict:
    return {
        "id": str(a.id),
        "name": a.name,
        "bio": a.bio,
        "photo_url": a.photo_url,
        "is_featured": a.is_featured,
        "showcase_book_id": a.showcase_book_id,
        "created_at": a.created_at.isoformat() if a.created_at else None,
    }


def _movie_to_dict(m: KidSpaceMovie) -> dict:
    return {
        "id": str(m.id),
        "title": m.title,
        "description": m.description,
        "duration_minutes": m.duration_minutes,
        "age_min": m.age_min,
        "age_max": m.age_max,
        "genre_id": m.genre_id,
        "poster_url": m.poster_url,
        "video_url": m.video_url,
        "trailer_url": m.trailer_url,
        # Frontend chooses <MuxPlayer> vs <video> based on playback_provider.
        # `mux_asset_id` is NOT included here — asset_id is an admin-facing
        # internal identifier; only `mux_playback_id` is playback-relevant.
        "playback_provider": getattr(m, "playback_provider", "direct"),
        "mux_playback_id": getattr(m, "mux_playback_id", None),
        "is_featured": m.is_featured,
        "is_visible": m.is_visible,
        "view_count": m.view_count,
        "total_minutes_watched": m.total_minutes_watched,
        "created_at": m.created_at.isoformat() if m.created_at else None,
    }


def _book_to_dict(b: KidSpaceBook) -> dict:
    # `b.author` is loaded via the relationship when the query eager-loads
    # (`selectinload`) or lazy-loads inside an async session. When neither
    # is set up, fall back to None so the UI can still render.
    author_name: Optional[str] = None
    try:
        if b.author is not None:
            author_name = b.author.name
    except Exception:  # pragma: no cover — relationship not loaded
        author_name = None
    return {
        "id": str(b.id),
        "title": b.title,
        "author_id": b.author_id,
        "author_name": author_name,
        "description": b.description,
        "page_count": b.page_count,
        "age_min": b.age_min,
        "age_max": b.age_max,
        "genre_id": b.genre_id,
        "cover_url": b.cover_url,
        "pdf_url": b.pdf_url,
        "is_featured": b.is_featured,
        "is_visible": b.is_visible,
        "read_count": b.read_count,
        "total_pages_turned": b.total_pages_turned,
        "created_at": b.created_at.isoformat() if b.created_at else None,
    }


# =============================================================================
# PUBLIC ENDPOINTS
# =============================================================================

@router.get(
    "/movies",
    summary="List visible movies (public)",
)
async def list_visible_movies(
    genre_id: Optional[str] = Query(None),
    age: Optional[int] = Query(None, ge=1, le=18),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    child_age: Optional[int] = Depends(_optional_child_age),
) -> dict:
    """List visible and approved movies for the KidSpace theater."""
    query = select(KidSpaceMovie).where(
        KidSpaceMovie.is_visible == True,
        KidSpaceMovie.is_approved == True,
    )

    if genre_id:
        query = query.where(KidSpaceMovie.genre_id == genre_id)
    # A child's real age (from their profile) overrides any client-supplied age,
    # so children only ever see age-appropriate content.
    effective_age = child_age if child_age is not None else age
    if effective_age is not None:
        query = query.where(
            KidSpaceMovie.age_min <= effective_age,
            KidSpaceMovie.age_max >= effective_age,
        )

    query = query.order_by(desc(KidSpaceMovie.is_featured), desc(KidSpaceMovie.created_at))
    query = query.offset(offset).limit(limit)

    result = await db.execute(query)
    movies = result.scalars().all()

    return {"movies": [_movie_to_dict(m) for m in movies]}


@router.get(
    "/books",
    summary="List visible books (public)",
)
async def list_visible_books(
    genre_id: Optional[str] = Query(None),
    age: Optional[int] = Query(None, ge=1, le=18),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    child_age: Optional[int] = Depends(_optional_child_age),
) -> dict:
    """List visible and approved books for the KidSpace reading section."""
    query = select(KidSpaceBook).where(
        KidSpaceBook.is_visible == True,
        KidSpaceBook.is_approved == True,
    )

    if genre_id:
        query = query.where(KidSpaceBook.genre_id == genre_id)
    # A child's real age (from their profile) overrides any client-supplied age.
    effective_age = child_age if child_age is not None else age
    if effective_age is not None:
        query = query.where(
            KidSpaceBook.age_min <= effective_age,
            KidSpaceBook.age_max >= effective_age,
        )

    query = query.order_by(desc(KidSpaceBook.is_featured), desc(KidSpaceBook.created_at))
    query = query.offset(offset).limit(limit)

    result = await db.execute(query)
    books = result.scalars().all()

    return {"books": [_book_to_dict(b) for b in books]}


@router.get(
    "/authors/featured",
    summary="Get featured author (public)",
)
async def get_featured_author(
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Get the current featured author for the KidSpace spotlight."""
    result = await db.execute(
        select(KidSpaceAuthor)
        .where(KidSpaceAuthor.is_featured == True)
        .order_by(desc(KidSpaceAuthor.created_at))
        .limit(1)
    )
    author = result.scalar_one_or_none()

    if not author:
        return {"author": None}

    return {"author": _author_to_dict(author)}


# =============================================================================
# ADMIN ENDPOINTS - Genres
# =============================================================================

@router.post(
    "/admin/genres",
    summary="Create a genre (admin)",
    status_code=status.HTTP_201_CREATED,
)
async def create_genre(
    name: str = Form(...),
    description: Optional[str] = Form(None),
    icon_emoji: Optional[str] = Form(None),
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user),
) -> dict:
    """Create a new KidSpace genre."""
    genre = KidSpaceGenre(
        name=name,
        description=description,
        icon_emoji=icon_emoji,
    )
    db.add(genre)
    await db.commit()
    await db.refresh(genre)

    return _genre_to_dict(genre)


@router.get(
    "/admin/genres",
    summary="List all genres (admin)",
)
async def list_genres(
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user),
) -> dict:
    """List all KidSpace genres."""
    result = await db.execute(
        select(KidSpaceGenre).order_by(KidSpaceGenre.name)
    )
    genres = result.scalars().all()

    return {"genres": [_genre_to_dict(g) for g in genres]}


@router.put(
    "/admin/genres/{genre_id}",
    summary="Update a genre (admin)",
)
async def update_genre(
    genre_id: str,
    name: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    icon_emoji: Optional[str] = Form(None),
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user),
) -> dict:
    """Update a KidSpace genre."""
    result = await db.execute(
        select(KidSpaceGenre).where(KidSpaceGenre.id == genre_id)
    )
    genre = result.scalar_one_or_none()
    if not genre:
        raise HTTPException(status_code=404, detail="Genre not found")

    if name is not None:
        genre.name = name
    if description is not None:
        genre.description = description
    if icon_emoji is not None:
        genre.icon_emoji = icon_emoji

    await db.commit()
    await db.refresh(genre)

    return _genre_to_dict(genre)


@router.delete(
    "/admin/genres/{genre_id}",
    summary="Delete a genre (admin)",
)
async def delete_genre(
    genre_id: str,
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user),
) -> dict:
    """Delete a KidSpace genre."""
    result = await db.execute(
        select(KidSpaceGenre).where(KidSpaceGenre.id == genre_id)
    )
    genre = result.scalar_one_or_none()
    if not genre:
        raise HTTPException(status_code=404, detail="Genre not found")

    await db.delete(genre)
    await db.commit()

    return {"deleted": True, "id": genre_id}


# =============================================================================
# ADMIN ENDPOINTS - Authors
# =============================================================================

@router.post(
    "/admin/authors",
    summary="Create an author (admin)",
    status_code=status.HTTP_201_CREATED,
)
async def create_author(
    name: str = Form(...),
    bio: Optional[str] = Form(None),
    is_featured: bool = Form(False),
    showcase_book_id: Optional[str] = Form(None),
    photo: Optional[UploadFile] = File(None),
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user),
) -> dict:
    """Create a new KidSpace author with optional photo upload."""
    photo_url = None
    try:
        if photo and photo.filename:
            storage = SupabaseStorageService()
            file_content = await photo.read()
            ext = photo.filename.rsplit(".", 1)[-1] if "." in photo.filename else "jpg"
            path = f"authors/{uuid4()}.{ext}"
            photo_url = await storage.upload_file(
                bucket=KIDSPACE_MEDIA_BUCKET,
                path=path,
                file_content=file_content,
                content_type=photo.content_type or "image/jpeg",
            )
            logger.info(f"Uploaded author photo: {photo_url}")
    except Exception as e:
        logger.error(f"Author photo upload failed: {e}")
        raise HTTPException(status_code=500, detail=f"Photo upload failed: {str(e)}")

    resolved_book_id = showcase_book_id if showcase_book_id and showcase_book_id.strip() else None

    try:
        author = KidSpaceAuthor(
            name=name,
            bio=bio,
            photo_url=photo_url,
            is_featured=is_featured,
            showcase_book_id=resolved_book_id,
        )
        db.add(author)
        await db.commit()
        await db.refresh(author)
    except Exception as e:
        logger.error(f"Author DB insert failed: {e}")
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

    return _author_to_dict(author)


@router.get(
    "/admin/authors",
    summary="List all authors (admin)",
)
async def list_authors(
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user),
) -> dict:
    """List all KidSpace authors."""
    result = await db.execute(
        select(KidSpaceAuthor).order_by(KidSpaceAuthor.name)
    )
    authors = result.scalars().all()

    return {"authors": [_author_to_dict(a) for a in authors]}


@router.put(
    "/admin/authors/{author_id}",
    summary="Update an author (admin)",
)
async def update_author(
    author_id: str,
    name: Optional[str] = Form(None),
    bio: Optional[str] = Form(None),
    is_featured: Optional[bool] = Form(None),
    showcase_book_id: Optional[str] = Form(None),
    photo: Optional[UploadFile] = File(None),
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user),
) -> dict:
    """Update a KidSpace author."""
    result = await db.execute(
        select(KidSpaceAuthor).where(KidSpaceAuthor.id == author_id)
    )
    author = result.scalar_one_or_none()
    if not author:
        raise HTTPException(status_code=404, detail="Author not found")

    if name is not None:
        author.name = name
    if bio is not None:
        author.bio = bio
    if is_featured is not None:
        author.is_featured = is_featured
    if showcase_book_id is not None:
        author.showcase_book_id = showcase_book_id

    if photo and photo.filename:
        storage = SupabaseStorageService()
        file_content = await photo.read()
        ext = photo.filename.rsplit(".", 1)[-1] if "." in photo.filename else "jpg"
        path = f"authors/{uuid4()}.{ext}"
        author.photo_url = await storage.upload_file(
            bucket=KIDSPACE_MEDIA_BUCKET,
            path=path,
            file_content=file_content,
            content_type=photo.content_type or "image/jpeg",
        )

    await db.commit()
    await db.refresh(author)

    return _author_to_dict(author)


@router.delete(
    "/admin/authors/{author_id}",
    summary="Delete an author (admin)",
)
async def delete_author(
    author_id: str,
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user),
) -> dict:
    """Delete a KidSpace author."""
    result = await db.execute(
        select(KidSpaceAuthor).where(KidSpaceAuthor.id == author_id)
    )
    author = result.scalar_one_or_none()
    if not author:
        raise HTTPException(status_code=404, detail="Author not found")

    await db.delete(author)
    await db.commit()

    return {"deleted": True, "id": author_id}


# =============================================================================
# ADMIN ENDPOINTS - Movies
# =============================================================================

@router.post(
    "/admin/movies",
    summary="Create a movie (admin)",
    status_code=status.HTTP_201_CREATED,
)
async def create_movie(
    title: str = Form(...),
    description: Optional[str] = Form(None),
    duration_minutes: Optional[int] = Form(None),
    age_min: int = Form(3),
    age_max: int = Form(12),
    genre_id: Optional[str] = Form(None),
    genre_name: Optional[str] = Form(None),
    is_featured: bool = Form(False),
    is_visible: bool = Form(True),
    trailer_url: Optional[str] = Form(None),
    video: Optional[UploadFile] = File(None),
    poster: Optional[UploadFile] = File(None),
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user),
) -> dict:
    """Create a new KidSpace movie with optional video and poster uploads."""
    movie_id = str(uuid4())

    video_url = None
    poster_url = None

    try:
        storage = SupabaseStorageService()

        if video and video.filename:
            file_content = await video.read()
            ext = video.filename.rsplit(".", 1)[-1] if "." in video.filename else "mp4"
            path = f"movies/{movie_id}/video.{ext}"
            video_url = await storage.upload_file(
                bucket=KIDSPACE_MEDIA_BUCKET,
                path=path,
                file_content=file_content,
                content_type=video.content_type or "video/mp4",
            )
            logger.info(f"Uploaded video for movie {movie_id}: {video_url}")

        if poster and poster.filename:
            file_content = await poster.read()
            ext = poster.filename.rsplit(".", 1)[-1] if "." in poster.filename else "jpg"
            path = f"movies/{movie_id}/poster.{ext}"
            poster_url = await storage.upload_file(
                bucket=KIDSPACE_MEDIA_BUCKET,
                path=path,
                file_content=file_content,
                content_type=poster.content_type or "image/jpeg",
            )
            logger.info(f"Uploaded poster for movie {movie_id}: {poster_url}")

    except Exception as e:
        logger.error(f"File upload failed for movie {movie_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"File upload failed: {str(e)}",
        )

    # Don't pass genre_id if it's empty or the genres table doesn't have entries
    resolved_genre_id = genre_id if genre_id and genre_id.strip() else None

    try:
        movie = KidSpaceMovie(
            id=movie_id,
            title=title,
            description=description,
            duration_minutes=duration_minutes,
            age_min=age_min,
            age_max=age_max,
            genre_id=resolved_genre_id,
            poster_url=poster_url,
            video_url=video_url,
            trailer_url=trailer_url,
            is_featured=is_featured,
            is_visible=is_visible,
        )
        db.add(movie)
        await db.commit()
        await db.refresh(movie)
    except Exception as e:
        logger.error(f"DB insert failed for movie {movie_id}: {e}")
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}",
        )

    return _movie_to_dict(movie)


@router.get(
    "/admin/movies",
    summary="List all movies (admin)",
)
async def list_all_movies(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user),
) -> dict:
    """List all KidSpace movies (including hidden)."""
    result = await db.execute(
        select(KidSpaceMovie)
        .order_by(desc(KidSpaceMovie.created_at))
        .offset(offset)
        .limit(limit)
    )
    movies = result.scalars().all()

    return {"movies": [_movie_to_dict(m) for m in movies]}


@router.put(
    "/admin/movies/{movie_id}",
    summary="Update a movie (admin)",
)
async def update_movie(
    movie_id: str,
    title: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    duration_minutes: Optional[int] = Form(None),
    age_min: Optional[int] = Form(None),
    age_max: Optional[int] = Form(None),
    genre_id: Optional[str] = Form(None),
    is_featured: Optional[bool] = Form(None),
    is_visible: Optional[bool] = Form(None),
    trailer_url: Optional[str] = Form(None),
    video: Optional[UploadFile] = File(None),
    poster: Optional[UploadFile] = File(None),
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user),
) -> dict:
    """Update a KidSpace movie."""
    result = await db.execute(
        select(KidSpaceMovie).where(KidSpaceMovie.id == movie_id)
    )
    movie = result.scalar_one_or_none()
    if not movie:
        raise HTTPException(status_code=404, detail="Movie not found")

    if title is not None:
        movie.title = title
    if description is not None:
        movie.description = description
    if duration_minutes is not None:
        movie.duration_minutes = duration_minutes
    if age_min is not None:
        movie.age_min = age_min
    if age_max is not None:
        movie.age_max = age_max
    if genre_id is not None:
        movie.genre_id = genre_id
    if is_featured is not None:
        movie.is_featured = is_featured
    if is_visible is not None:
        movie.is_visible = is_visible
    if trailer_url is not None:
        movie.trailer_url = trailer_url

    storage = SupabaseStorageService()

    if video and video.filename:
        file_content = await video.read()
        ext = video.filename.rsplit(".", 1)[-1] if "." in video.filename else "mp4"
        path = f"movies/{movie_id}/video.{ext}"
        movie.video_url = await storage.upload_file(
            bucket=KIDSPACE_MEDIA_BUCKET,
            path=path,
            file_content=file_content,
            content_type=video.content_type or "video/mp4",
        )

    if poster and poster.filename:
        file_content = await poster.read()
        ext = poster.filename.rsplit(".", 1)[-1] if "." in poster.filename else "jpg"
        path = f"movies/{movie_id}/poster.{ext}"
        movie.poster_url = await storage.upload_file(
            bucket=KIDSPACE_MEDIA_BUCKET,
            path=path,
            file_content=file_content,
            content_type=poster.content_type or "image/jpeg",
        )

    await db.commit()
    await db.refresh(movie)

    return _movie_to_dict(movie)


@router.delete(
    "/admin/movies/{movie_id}",
    summary="Delete a movie (admin)",
)
async def delete_movie(
    movie_id: str,
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user),
) -> dict:
    """Delete a KidSpace movie."""
    result = await db.execute(
        select(KidSpaceMovie).where(KidSpaceMovie.id == movie_id)
    )
    movie = result.scalar_one_or_none()
    if not movie:
        raise HTTPException(status_code=404, detail="Movie not found")

    await db.delete(movie)
    await db.commit()

    return {"deleted": True, "id": movie_id}


# =============================================================================
# ADMIN ENDPOINTS - Books
# =============================================================================

@router.post(
    "/admin/books",
    summary="Create a book (admin)",
    status_code=status.HTTP_201_CREATED,
)
async def create_book(
    title: str = Form(...),
    author_id: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    page_count: Optional[int] = Form(None),
    age_min: int = Form(3),
    age_max: int = Form(12),
    genre_id: Optional[str] = Form(None),
    is_featured: bool = Form(False),
    is_visible: bool = Form(True),
    pdf: Optional[UploadFile] = File(None),
    cover: Optional[UploadFile] = File(None),
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user),
) -> dict:
    """Create a new KidSpace book with optional PDF and cover uploads."""
    book_id = str(uuid4())
    pdf_url = None
    cover_url = None

    try:
        storage = SupabaseStorageService()

        if pdf and pdf.filename:
            file_content = await pdf.read()
            path = f"books/{book_id}/book.pdf"
            pdf_url = await storage.upload_file(
                bucket=KIDSPACE_MEDIA_BUCKET, path=path,
                file_content=file_content, content_type="application/pdf",
            )
            logger.info(f"Uploaded PDF for book {book_id}: {pdf_url}")

        if cover and cover.filename:
            file_content = await cover.read()
            ext = cover.filename.rsplit(".", 1)[-1] if "." in cover.filename else "jpg"
            path = f"books/{book_id}/cover.{ext}"
            cover_url = await storage.upload_file(
                bucket=KIDSPACE_MEDIA_BUCKET, path=path,
                file_content=file_content, content_type=cover.content_type or "image/jpeg",
            )
            logger.info(f"Uploaded cover for book {book_id}: {cover_url}")

    except Exception as e:
        logger.error(f"File upload failed for book {book_id}: {e}")
        raise HTTPException(status_code=500, detail=f"File upload failed: {str(e)}")

    resolved_genre_id = genre_id if genre_id and genre_id.strip() else None
    resolved_author_id = author_id if author_id and author_id.strip() else None

    try:
        book = KidSpaceBook(
            id=book_id, title=title, author_id=resolved_author_id,
            description=description, page_count=page_count,
            age_min=age_min, age_max=age_max, genre_id=resolved_genre_id,
            cover_url=cover_url, pdf_url=pdf_url,
            is_featured=is_featured, is_visible=is_visible,
        )
        db.add(book)
        await db.commit()
        await db.refresh(book)
    except Exception as e:
        logger.error(f"DB insert failed for book {book_id}: {e}")
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

    return _book_to_dict(book)


@router.get(
    "/admin/books",
    summary="List all books (admin)",
)
async def list_all_books(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user),
) -> dict:
    """List all KidSpace books (including hidden)."""
    result = await db.execute(
        select(KidSpaceBook)
        .order_by(desc(KidSpaceBook.created_at))
        .offset(offset)
        .limit(limit)
    )
    books = result.scalars().all()

    return {"books": [_book_to_dict(b) for b in books]}


@router.put(
    "/admin/books/{book_id}",
    summary="Update a book (admin)",
)
async def update_book(
    book_id: str,
    title: Optional[str] = Form(None),
    author_id: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    page_count: Optional[int] = Form(None),
    age_min: Optional[int] = Form(None),
    age_max: Optional[int] = Form(None),
    genre_id: Optional[str] = Form(None),
    is_featured: Optional[bool] = Form(None),
    is_visible: Optional[bool] = Form(None),
    pdf: Optional[UploadFile] = File(None),
    cover: Optional[UploadFile] = File(None),
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user),
) -> dict:
    """Update a KidSpace book."""
    result = await db.execute(
        select(KidSpaceBook).where(KidSpaceBook.id == book_id)
    )
    book = result.scalar_one_or_none()
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")

    if title is not None:
        book.title = title
    if author_id is not None:
        book.author_id = author_id
    if description is not None:
        book.description = description
    if page_count is not None:
        book.page_count = page_count
    if age_min is not None:
        book.age_min = age_min
    if age_max is not None:
        book.age_max = age_max
    if genre_id is not None:
        book.genre_id = genre_id
    if is_featured is not None:
        book.is_featured = is_featured
    if is_visible is not None:
        book.is_visible = is_visible

    storage = SupabaseStorageService()

    if pdf and pdf.filename:
        file_content = await pdf.read()
        path = f"books/{book_id}/book.pdf"
        book.pdf_url = await storage.upload_file(
            bucket=KIDSPACE_MEDIA_BUCKET,
            path=path,
            file_content=file_content,
            content_type="application/pdf",
        )

    if cover and cover.filename:
        file_content = await cover.read()
        ext = cover.filename.rsplit(".", 1)[-1] if "." in cover.filename else "jpg"
        path = f"books/{book_id}/cover.{ext}"
        book.cover_url = await storage.upload_file(
            bucket=KIDSPACE_MEDIA_BUCKET,
            path=path,
            file_content=file_content,
            content_type=cover.content_type or "image/jpeg",
        )

    await db.commit()
    await db.refresh(book)

    return _book_to_dict(book)


@router.delete(
    "/admin/books/{book_id}",
    summary="Delete a book (admin)",
)
async def delete_book(
    book_id: str,
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user),
) -> dict:
    """Delete a KidSpace book."""
    result = await db.execute(
        select(KidSpaceBook).where(KidSpaceBook.id == book_id)
    )
    book = result.scalar_one_or_none()
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")

    await db.delete(book)
    await db.commit()

    return {"deleted": True, "id": book_id}


# =============================================================================
# CONTENT APPROVAL ENDPOINTS
# =============================================================================

@router.post(
    "/admin/movies/{movie_id}/approve",
    summary="Approve a movie for child viewing (admin)",
)
async def approve_movie(
    movie_id: str,
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user),
) -> dict:
    """Approve a movie so it becomes visible to children."""
    result = await db.execute(
        select(KidSpaceMovie).where(KidSpaceMovie.id == movie_id)
    )
    movie = result.scalar_one_or_none()
    if not movie:
        raise HTTPException(status_code=404, detail="Movie not found")

    movie.is_approved = True
    await db.commit()
    return {"approved": True, "id": movie_id, "title": movie.title}


@router.post(
    "/admin/books/{book_id}/approve",
    summary="Approve a book for child viewing (admin)",
)
async def approve_book(
    book_id: str,
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user),
) -> dict:
    """Approve a book so it becomes visible to children."""
    result = await db.execute(
        select(KidSpaceBook).where(KidSpaceBook.id == book_id)
    )
    book = result.scalar_one_or_none()
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")

    book.is_approved = True
    await db.commit()
    return {"approved": True, "id": book_id, "title": book.title}


# =============================================================================
# UNIFIED THEATER CONTENT ENDPOINT
# =============================================================================

@router.get(
    "/theater/content",
    summary="List all theater content (unified movies + books)",
)
async def list_theater_content(
    category: Optional[str] = Query(None),
    content_type: Optional[str] = Query(None, pattern=r"^(video|story|all)$"),
    search: Optional[str] = Query(None),
    age: Optional[int] = Query(None, ge=1, le=18),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    Unified content endpoint that aggregates movies and books.

    Returns content in the TheaterContent format expected by the API client.
    """
    items = []

    # Fetch movies (unless type is "story")
    if content_type != "story":
        movie_query = select(KidSpaceMovie).where(
            KidSpaceMovie.is_visible == True,
            KidSpaceMovie.is_approved == True,
        )
        if age is not None:
            movie_query = movie_query.where(
                KidSpaceMovie.age_min <= age,
                KidSpaceMovie.age_max >= age,
            )
        if search:
            movie_query = movie_query.where(
                KidSpaceMovie.title.ilike(f"%{search}%")
            )
        movie_query = movie_query.order_by(
            desc(KidSpaceMovie.is_featured), desc(KidSpaceMovie.created_at)
        )
        result = await db.execute(movie_query)
        for movie in result.scalars().all():
            items.append({
                "id": movie.id,
                "title": movie.title,
                "description": movie.description or "",
                "thumbnail_url": movie.poster_url or "",
                "content_url": movie.video_url or "",
                "content_type": "video",
                "category": "fun",  # Could map from genre
                "duration_seconds": (movie.duration_minutes or 0) * 60,
                "age_rating": f"{movie.age_min}-{movie.age_max}",
                "is_approved": movie.is_approved,
                "created_at": movie.created_at.isoformat() if movie.created_at else "",
            })

    # Fetch books (unless type is "video")
    if content_type != "video":
        book_query = select(KidSpaceBook).where(
            KidSpaceBook.is_visible == True,
            KidSpaceBook.is_approved == True,
        )
        if age is not None:
            book_query = book_query.where(
                KidSpaceBook.age_min <= age,
                KidSpaceBook.age_max >= age,
            )
        if search:
            book_query = book_query.where(
                KidSpaceBook.title.ilike(f"%{search}%")
            )
        book_query = book_query.order_by(
            desc(KidSpaceBook.is_featured), desc(KidSpaceBook.created_at)
        )
        result = await db.execute(book_query)
        for book in result.scalars().all():
            items.append({
                "id": book.id,
                "title": book.title,
                "description": book.description or "",
                "thumbnail_url": book.cover_url or "",
                "content_url": book.pdf_url or "",
                "content_type": "story",
                "category": "stories",
                "duration_seconds": (book.page_count or 0) * 60,  # Estimate reading time
                "age_rating": f"{book.age_min}-{book.age_max}",
                "is_approved": book.is_approved,
                "created_at": book.created_at.isoformat() if book.created_at else "",
            })

    # Apply pagination
    total = len(items)
    items = items[offset:offset + limit]

    return {"items": items, "total": total}


# =============================================================================
# ANALYTICS ENDPOINTS
# =============================================================================

@router.post(
    "/movies/{movie_id}/view",
    summary="Record a movie view",
)
async def record_movie_view(
    movie_id: str,
    minutes_watched: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Increment view count and total minutes watched for a movie."""
    result = await db.execute(
        select(KidSpaceMovie).where(KidSpaceMovie.id == movie_id)
    )
    movie = result.scalar_one_or_none()
    if not movie:
        raise HTTPException(status_code=404, detail="Movie not found")

    movie.view_count += 1
    movie.total_minutes_watched += minutes_watched
    await db.commit()

    return {"view_count": movie.view_count, "total_minutes_watched": movie.total_minutes_watched}


@router.post(
    "/books/{book_id}/read",
    summary="Record a book read",
)
async def record_book_read(
    book_id: str,
    pages_turned: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Increment read count and total pages turned for a book."""
    result = await db.execute(
        select(KidSpaceBook).where(KidSpaceBook.id == book_id)
    )
    book = result.scalar_one_or_none()
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")

    book.read_count += 1
    book.total_pages_turned += pages_turned
    await db.commit()

    return {"read_count": book.read_count, "total_pages_turned": book.total_pages_turned}
