import asyncio
from sqlalchemy import select
from app.db.session import async_session_maker
from app.models.firm import Firm

async def main():
    async with async_session_maker() as session:
        result = await session.execute(select(Firm).where(Firm.slug == 'holstrom-block-parke'))
        firm = result.scalar_one_or_none()
        if firm:
            print(f"Name: {firm.name}")
            print(f"Logo: {firm.logo_url}")
            print(f"Video: {firm.video_url}")
        else:
            print("Firm not found")

asyncio.run(main())
