"""
Seed the KidSpace theater with public-domain cartoons, streamed via Mux.

For each item in CATALOG we:
  1. Create a KidSpaceGenre if missing.
  2. Create a Mux asset from an Archive.org public-domain MP4.
  3. Poll Mux until the asset is `ready` (usually 30s–2min per 10-min short).
  4. Upsert a KidSpaceMovie row with playback_provider='mux',
     mux_asset_id + mux_playback_id set, is_approved=true.

Idempotent:
  - Re-runs skip movies that already have a populated mux_playback_id.
  - Existing rows without Mux IDs (e.g. from a prior abandoned run) get
    re-ingested; the old asset is deleted first.

All items are curated from the Internet Archive `classic_cartoons`
collection, which hosts public-domain titles where copyright lapsed
or was never renewed. Kid-appropriate vintage animation.

Usage:
  cd backend
  source .venv/bin/activate
  DATABASE_URL=postgresql+asyncpg://... \
  MUX_TOKEN_ID=...  MUX_TOKEN_SECRET=... \
  python scripts/seed_kidspace_media.py
"""

from __future__ import annotations

import asyncio
import logging
import os
import sys
import uuid
from dataclasses import dataclass
from typing import Optional

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from app.core.config import settings
from app.models.kidspace_media import KidSpaceGenre, KidSpaceMovie
from app.services import mux as mux_service

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)


@dataclass
class CatalogItem:
    title: str
    description: str
    archive_item: str  # Internet Archive item id
    archive_file: str  # file name inside the item
    duration_minutes: int
    age_min: int
    age_max: int
    genre_name: str
    is_featured: bool = False

    @property
    def source_url(self) -> str:
        return f"https://archive.org/download/{self.archive_item}/{self.archive_file}"

    @property
    def poster_url(self) -> str:
        return f"https://archive.org/services/img/{self.archive_item}"


# Curated list. Short durations, mild content, pre-1960 Fleischer / Famous
# Studios / early Disney-adjacent public-domain animation.
CATALOG: list[CatalogItem] = [
    CatalogItem(
        title="Betty Boop: Snow-White",
        description=(
            "Betty Boop stars in a surreal 1933 reimagining of Snow White "
            "featuring Cab Calloway's 'St. James Infirmary Blues.' One of "
            "the most acclaimed Fleischer shorts."
        ),
        archive_item="bb_snow_white",
        archive_file="bb_snow_white_512kb.mp4",
        duration_minutes=7,
        age_min=5,
        age_max=12,
        genre_name="Classic Cartoons",
        is_featured=True,
    ),
    CatalogItem(
        title="Betty Boop: Minnie the Moocher",
        description=(
            "Betty Boop runs away from home and meets a ghostly Cab "
            "Calloway-inspired walrus in this 1932 Fleischer musical short."
        ),
        archive_item="bb_minnie_the_moocher",
        archive_file="bb_minnie_the_moocher_512kb.mp4",
        duration_minutes=8,
        age_min=5,
        age_max=12,
        genre_name="Classic Cartoons",
    ),
    CatalogItem(
        title="Flip the Frog: Fiddlesticks",
        description=(
            "Ub Iwerks' 1930 Flip the Frog short — the first commercially "
            "released cartoon in full two-strip Technicolor."
        ),
        archive_item="FLIP_FROG-FIDDLESTICKS",
        archive_file="FLIP_FROG-FIDDLESTICKS_64k_512kb.mp4",
        duration_minutes=7,
        age_min=4,
        age_max=10,
        genre_name="Classic Cartoons",
    ),
    CatalogItem(
        title="Popeye: I Don't Scare",
        description=(
            "Popeye and Bluto battle it out at a carnival haunted house in "
            "this Famous Studios Popeye short. Spinach saves the day."
        ),
        archive_item="popeye_i_dont_scare",
        archive_file="popeye_i_dont_scare_512kb.mp4",
        duration_minutes=7,
        age_min=5,
        age_max=12,
        genre_name="Adventure",
    ),
    CatalogItem(
        title="Popeye: Big Bad Sinbad",
        description=(
            "Popeye tells his nephews a tall tale about the time he "
            "tangled with Sindbad the Sailor. Swashbuckling fun."
        ),
        archive_item="popeye_big_bad_sinbad",
        archive_file="popeye_big_bad_sinbad_512kb.mp4",
        duration_minutes=8,
        age_min=5,
        age_max=12,
        genre_name="Adventure",
        is_featured=True,
    ),
    CatalogItem(
        title="Popeye: Patriotic Popeye",
        description=(
            "Popeye's nephews play with fireworks on the Fourth of July — "
            "Popeye keeps them out of trouble the hard way."
        ),
        archive_item="popeye_patriotic_popeye",
        archive_file="popeye_patriotic_popeye_512kb.mp4",
        duration_minutes=7,
        age_min=5,
        age_max=12,
        genre_name="Adventure",
    ),
]


async def _ensure_genre(
    db: AsyncSession, name: str, cache: dict[str, str]
) -> str:
    if name in cache:
        return cache[name]
    res = await db.execute(select(KidSpaceGenre).where(KidSpaceGenre.name == name))
    existing = res.scalar_one_or_none()
    if existing:
        cache[name] = existing.id
        return existing.id
    new = KidSpaceGenre(id=str(uuid.uuid4()), name=name)
    db.add(new)
    await db.flush()
    cache[name] = new.id
    logger.info("  [genre created] %s", name)
    return new.id


async def _ingest_one(
    session_factory,
    item: CatalogItem,
    genre_cache: dict[str, str],
    genre_lock: asyncio.Lock,
) -> bool:
    """Ensure this item's Mux asset exists and is recorded. Returns True if
    the row is now populated with a Mux playback id (either pre-existing
    or newly ingested).

    Uses its own AsyncSession — SQLAlchemy async sessions are NOT safe
    for concurrent use, so one-session-per-task is the cheapest way to
    keep `asyncio.gather` correct across CATALOG entries.
    """
    async with session_factory() as db:
        res = await db.execute(
            select(KidSpaceMovie).where(KidSpaceMovie.title == item.title)
        )
        existing: Optional[KidSpaceMovie] = res.scalar_one_or_none()
        existing_mux_id = existing.mux_asset_id if existing else None
        existing_playback_id = existing.mux_playback_id if existing else None

    if existing and existing_playback_id:
        logger.info("  [skip] %s — already ingested", item.title)
        return True

    # Clean up a half-ingested asset from a prior run, if any.
    if existing and existing_mux_id and not existing_playback_id:
        logger.info(
            "  [cleanup] %s — deleting orphaned Mux asset %s",
            item.title,
            existing_mux_id,
        )
        try:
            await mux_service.delete_asset(existing_mux_id)
        except mux_service.MuxError as exc:
            logger.warning("    delete failed: %s", exc)

    # Create a fresh Mux asset. Seed movies go `public` playback — the
    # catalog is kid-safe and meant to be listed openly. When we later
    # host parent-uploaded content we'll create `signed` assets instead.
    logger.info("  [ingest] %s", item.title)
    try:
        asset = await mux_service.create_asset_from_url(
            source_url=item.source_url,
            playback_policy="public",
            video_quality="basic",
            passthrough=f"seed:{item.archive_item}",
        )
    except mux_service.MuxError as exc:
        logger.error("    create failed: %s", exc)
        return False

    logger.info(
        "    created asset %s (status=%s) — polling for ready…",
        asset.asset_id,
        asset.status,
    )
    try:
        ready = await mux_service.wait_until_ready(
            asset.asset_id,
            timeout_seconds=600,  # 10 min — some ingests run long
            poll_interval=8,
        )
    except mux_service.MuxError as exc:
        logger.error("    ingest failed: %s", exc)
        return False

    # Genre lookup/insert is contended across concurrent tasks; serialise.
    async with genre_lock:
        async with session_factory() as db:
            genre_id = await _ensure_genre(db, item.genre_name, genre_cache)
            await db.commit()

    async with session_factory() as db:
        # Re-fetch existing row inside this session so we can mutate it.
        res = await db.execute(
            select(KidSpaceMovie).where(KidSpaceMovie.title == item.title)
        )
        existing = res.scalar_one_or_none()

        duration_minutes = (
            int(ready.duration_seconds / 60)
            if ready.duration_seconds
            else item.duration_minutes
        )

        if existing:
            existing.description = item.description
            existing.duration_minutes = duration_minutes
            existing.age_min = item.age_min
            existing.age_max = item.age_max
            existing.genre_id = genre_id
            existing.poster_url = item.poster_url
            existing.video_url = item.source_url  # keep original for audit
            existing.is_featured = item.is_featured
            existing.is_visible = True
            existing.is_approved = True
            existing.mux_asset_id = ready.asset_id
            existing.mux_playback_id = ready.playback_id
            existing.playback_provider = "mux"
        else:
            db.add(
                KidSpaceMovie(
                    id=str(uuid.uuid4()),
                    title=item.title,
                    description=item.description,
                    duration_minutes=duration_minutes,
                    age_min=item.age_min,
                    age_max=item.age_max,
                    genre_id=genre_id,
                    poster_url=item.poster_url,
                    video_url=item.source_url,
                    is_featured=item.is_featured,
                    is_visible=True,
                    is_approved=True,
                    mux_asset_id=ready.asset_id,
                    mux_playback_id=ready.playback_id,
                    playback_provider="mux",
                )
            )

        await db.commit()

    logger.info(
        "    [done] %s → playback_id=%s duration=%ss",
        item.title,
        ready.playback_id,
        round(ready.duration_seconds or 0, 1),
    )
    return True


async def main() -> int:
    # Sanity — we need both a DB URL and Mux credentials.
    db_url = os.environ.get("DATABASE_URL") or settings.DATABASE_URL
    if not db_url:
        logger.error("DATABASE_URL not set")
        return 2
    if not (settings.MUX_TOKEN_ID and settings.MUX_TOKEN_SECRET):
        logger.error("MUX_TOKEN_ID and MUX_TOKEN_SECRET must be set")
        return 2

    # Normalise to async driver — seed_partner_landings does the same.
    if db_url.startswith("postgresql://"):
        db_url = db_url.replace("postgresql://", "postgresql+asyncpg://", 1)

    engine = create_async_engine(db_url, connect_args={"statement_cache_size": 0})
    Session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    genre_cache: dict[str, str] = {}
    genre_lock = asyncio.Lock()
    successes = 0
    failures = 0

    # Kick off every ingest in parallel. Each task owns its own session
    # (see _ingest_one) — no shared state besides the genre cache, which
    # is guarded by `genre_lock`. Mux ingest runs server-side regardless
    # of how we submit, so parallel is a meaningful win (≈10 min total
    # vs. ≈30 min if serialised).
    tasks = [
        _ingest_one(Session, item, genre_cache, genre_lock)
        for item in CATALOG
    ]
    results = await asyncio.gather(*tasks, return_exceptions=True)
    for item, result in zip(CATALOG, results):
        if isinstance(result, Exception):
            logger.error("  [exception] %s: %s", item.title, result)
            failures += 1
        elif result:
            successes += 1
        else:
            failures += 1

    await engine.dispose()
    logger.info("Seed complete: %d OK, %d failed", successes, failures)
    return 0 if failures == 0 else 1


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
