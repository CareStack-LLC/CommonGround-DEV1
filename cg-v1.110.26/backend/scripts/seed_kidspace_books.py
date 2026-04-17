"""
Seed the KidSpace library with public-domain classics.

Downloads scanned-original PDFs from the Internet Archive and mirrors
them to the public `kidspace-books` Supabase Storage bucket. Gutenberg
/ Archive.org cross-origin fetches aren't reliable for react-pdf's
`<Document file={url}>` loader (CORS varies, redirects, rate limits),
so we keep the binaries on infrastructure we control.

Idempotent:
  - Existing books matched on `title` are left alone if `pdf_url`
    already points at our Supabase bucket.
  - Missing `kidspace_authors` rows are created once per author.

Usage:
  cd backend
  source .venv/bin/activate
  DATABASE_URL=postgresql+asyncpg://... \
  SUPABASE_URL=https://<ref>.supabase.co \
  SUPABASE_SERVICE_KEY=eyJ... \
  python scripts/seed_kidspace_books.py
"""

from __future__ import annotations

import asyncio
import logging
import os
import sys
import uuid
from dataclasses import dataclass
from typing import Optional

import httpx

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from app.core.config import settings
from app.models.kidspace_media import KidSpaceAuthor, KidSpaceBook, KidSpaceGenre

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)


BUCKET = "kidspace-books"  # public bucket, already exists in Supabase


@dataclass
class BookItem:
    title: str
    author_name: str
    description: str
    archive_item: str
    archive_file: str
    year: int
    page_count: int  # approximate; react-pdf fills in true count at load
    age_min: int
    age_max: int
    is_featured: bool = False
    genre_name: str = "Classic Stories"

    @property
    def slug(self) -> str:
        return (
            self.title.lower()
            .replace("'", "")
            .replace(":", "")
            .replace(",", "")
            .replace(" ", "-")
        )

    @property
    def source_pdf_url(self) -> str:
        return f"https://archive.org/download/{self.archive_item}/{self.archive_file}"

    @property
    def cover_url(self) -> str:
        return f"https://archive.org/services/img/{self.archive_item}"

    @property
    def storage_key(self) -> str:
        return f"pdfs/{self.slug}.pdf"


CATALOG: list[BookItem] = [
    BookItem(
        title="Alice's Adventures in Wonderland",
        author_name="Lewis Carroll",
        description=(
            "A girl named Alice falls through a rabbit hole into a fantasy "
            "world of peculiar, anthropomorphic creatures. The 1911 edition "
            "with John Tenniel's original illustrations."
        ),
        archive_item="alicesadventures00carr",
        archive_file="alicesadventures00carr_bw.pdf",
        year=1911,
        page_count=250,
        age_min=7,
        age_max=12,
        is_featured=True,
    ),
    BookItem(
        title="The Wonderful Wizard of Oz",
        author_name="L. Frank Baum",
        description=(
            "Dorothy and her little dog Toto are swept away by a tornado to "
            "the magical land of Oz, where she must journey to find her way "
            "home. First edition, with W.W. Denslow's illustrations."
        ),
        archive_item="wonderfulwizardo00baumiala",
        archive_file="wonderfulwizardo00baumiala_bw.pdf",
        year=1900,
        page_count=220,
        age_min=6,
        age_max=11,
        is_featured=True,
    ),
    BookItem(
        title="The Jungle Book",
        author_name="Rudyard Kipling",
        description=(
            "The story of Mowgli, a boy raised by wolves in the Indian "
            "jungle, and his adventures with Bagheera the panther, Baloo "
            "the bear, and Shere Khan the tiger."
        ),
        archive_item="junglebook00kipl",
        archive_file="junglebook00kipl_bw.pdf",
        year=1913,
        page_count=300,
        age_min=8,
        age_max=13,
    ),
    BookItem(
        title="The Adventures of Tom Sawyer",
        author_name="Mark Twain",
        description=(
            "A mischievous boy growing up along the Mississippi River in "
            "the mid-1800s. Tom, his friend Huck Finn, and Becky Thatcher "
            "get into all kinds of scrapes together."
        ),
        archive_item="adventuresoftoms00twaiiala",
        archive_file="adventuresoftoms00twaiiala_bw.pdf",
        year=1876,
        page_count=340,
        age_min=9,
        age_max=13,
    ),
    BookItem(
        title="Anne of Green Gables",
        author_name="L.M. Montgomery",
        description=(
            "An imaginative orphan girl named Anne Shirley is mistakenly "
            "sent to live with the Cuthberts on Prince Edward Island. Her "
            "adventures and misadventures win everyone's heart."
        ),
        archive_item="cu31924013243963",
        archive_file="cu31924013243963.pdf",
        year=1908,
        page_count=400,
        age_min=9,
        age_max=13,
    ),
    BookItem(
        title="Heidi",
        author_name="Johanna Spyri",
        description=(
            "A cheerful orphan girl goes to live with her grandfather high "
            "in the Swiss Alps, where she makes friends with the goatherd "
            "Peter and discovers a love for mountain life."
        ),
        archive_item="heidi00spyr",
        archive_file="heidi00spyr_bw.pdf",
        year=1899,
        page_count=280,
        age_min=7,
        age_max=12,
    ),
]


async def _ensure_genre(db: AsyncSession, name: str) -> str:
    res = await db.execute(select(KidSpaceGenre).where(KidSpaceGenre.name == name))
    existing = res.scalar_one_or_none()
    if existing:
        return existing.id
    new = KidSpaceGenre(id=str(uuid.uuid4()), name=name)
    db.add(new)
    await db.commit()
    logger.info("  [genre created] %s", name)
    return new.id


async def _ensure_author(db: AsyncSession, name: str) -> str:
    res = await db.execute(select(KidSpaceAuthor).where(KidSpaceAuthor.name == name))
    existing = res.scalar_one_or_none()
    if existing:
        return existing.id
    new = KidSpaceAuthor(id=str(uuid.uuid4()), name=name)
    db.add(new)
    await db.commit()
    logger.info("  [author created] %s", name)
    return new.id


async def _download_and_upload(item: BookItem) -> Optional[str]:
    """Fetch the PDF from Archive.org, push it to Supabase Storage, return
    the public URL. Raises only if the download is literally unreachable —
    callers should skip the DB write on None but the job continues."""
    url = settings.SUPABASE_URL.rstrip("/") if settings.SUPABASE_URL else ""
    key = settings.SUPABASE_SERVICE_KEY
    if not url or not key:
        logger.error("SUPABASE_URL / SUPABASE_SERVICE_KEY missing")
        return None

    # Idempotency: if the object already exists in the bucket, skip the
    # download step entirely. A HEAD against the CDN URL will return 200
    # if present and 400 if missing (Supabase's behavior for private/
    # missing objects differs by bucket; kidspace-books is public so 200
    # on present, 400 on missing).
    public_url = f"{url}/storage/v1/object/public/{BUCKET}/{item.storage_key}"
    try:
        async with httpx.AsyncClient(timeout=15.0) as c:
            head = await c.head(public_url)
        if head.status_code == 200:
            logger.info("  [cached] %s — already in bucket", item.title)
            return public_url
    except Exception:
        # Fall through to download
        pass

    logger.info("  [download] %s (%s)", item.title, item.source_pdf_url)
    headers = {"User-Agent": "CommonGround/1.0 (KidSpace seed)"}
    try:
        async with httpx.AsyncClient(
            timeout=120.0, follow_redirects=True, headers=headers
        ) as c:
            resp = await c.get(item.source_pdf_url)
    except Exception as exc:
        logger.error("  [download failed] %s: %s", item.title, exc)
        return None
    if resp.status_code != 200:
        logger.error(
            "  [download non-200] %s: HTTP %s", item.title, resp.status_code
        )
        return None
    payload = resp.content
    logger.info("    got %d KB", len(payload) // 1024)

    upload_url = f"{url}/storage/v1/object/{BUCKET}/{item.storage_key}"
    upload_headers = {
        "Authorization": f"Bearer {key}",
        "apikey": key,
        "Content-Type": "application/pdf",
        "x-upsert": "true",
    }
    try:
        async with httpx.AsyncClient(timeout=120.0) as c:
            up = await c.post(upload_url, content=payload, headers=upload_headers)
    except Exception as exc:
        logger.error("  [upload failed] %s: %s", item.title, exc)
        return None
    if up.status_code not in (200, 201):
        logger.error("  [upload non-2xx] %s: %s %s", item.title, up.status_code, up.text[:200])
        return None
    logger.info("    uploaded → %s", public_url)
    return public_url


async def _ingest_one(session_factory, item: BookItem, genre_id: str) -> bool:
    # Check whether a populated row already exists; skip if so.
    async with session_factory() as db:
        res = await db.execute(
            select(KidSpaceBook).where(KidSpaceBook.title == item.title)
        )
        existing = res.scalar_one_or_none()
        if existing and existing.pdf_url and "supabase.co" in (existing.pdf_url or ""):
            logger.info("  [skip] %s — already seeded", item.title)
            return True

    pdf_url = await _download_and_upload(item)
    if not pdf_url:
        return False

    async with session_factory() as db:
        author_id = await _ensure_author(db, item.author_name)

    async with session_factory() as db:
        res = await db.execute(
            select(KidSpaceBook).where(KidSpaceBook.title == item.title)
        )
        existing = res.scalar_one_or_none()
        if existing:
            existing.author_id = author_id
            existing.description = item.description
            existing.page_count = item.page_count
            existing.age_min = item.age_min
            existing.age_max = item.age_max
            existing.genre_id = genre_id
            existing.cover_url = item.cover_url
            existing.pdf_url = pdf_url
            existing.is_featured = item.is_featured
            existing.is_visible = True
            existing.is_approved = True
        else:
            db.add(
                KidSpaceBook(
                    id=str(uuid.uuid4()),
                    title=item.title,
                    author_id=author_id,
                    description=item.description,
                    page_count=item.page_count,
                    age_min=item.age_min,
                    age_max=item.age_max,
                    genre_id=genre_id,
                    cover_url=item.cover_url,
                    pdf_url=pdf_url,
                    is_featured=item.is_featured,
                    is_visible=True,
                    is_approved=True,
                )
            )
        await db.commit()

    logger.info("  [done] %s", item.title)
    return True


async def main() -> int:
    db_url = os.environ.get("DATABASE_URL") or settings.DATABASE_URL
    if not db_url:
        logger.error("DATABASE_URL not set")
        return 2
    if db_url.startswith("postgresql://"):
        db_url = db_url.replace("postgresql://", "postgresql+asyncpg://", 1)
    if not (settings.SUPABASE_URL and settings.SUPABASE_SERVICE_KEY):
        logger.error("SUPABASE_URL and SUPABASE_SERVICE_KEY must be set")
        return 2

    engine = create_async_engine(db_url, connect_args={"statement_cache_size": 0})
    Session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    # Single genre up front — serial is fine here, one row.
    async with Session() as db:
        genre_id = await _ensure_genre(db, "Classic Stories")

    tasks = [_ingest_one(Session, item, genre_id) for item in CATALOG]
    results = await asyncio.gather(*tasks, return_exceptions=True)

    successes = 0
    failures = 0
    for item, r in zip(CATALOG, results):
        if isinstance(r, Exception):
            logger.error("  [exception] %s: %s", item.title, r)
            failures += 1
        elif r:
            successes += 1
        else:
            failures += 1

    await engine.dispose()
    logger.info("Seed complete: %d OK, %d failed", successes, failures)
    return 0 if failures == 0 else 1


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
