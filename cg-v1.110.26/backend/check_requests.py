import asyncio
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from app.db.session import async_session_maker
from app.models.professional import ProfessionalAccessRequest
from sqlalchemy import select

async def main():
    async with async_session_maker() as session:
        result = await session.execute(
            select(ProfessionalAccessRequest).where(
                ProfessionalAccessRequest.family_file_id == 'efc1b35e-7153-4622-ac16-784a5aef13ea'
            )
        )
        reqs = result.scalars().all()
        for r in reqs:
            print(f"ID: {r.id}, Status: {r.status}, ProfEmail: {r.professional_email}, ProfName: {r.professional_name}, FirmID: {r.firm_id}")

if __name__ == "__main__":
    asyncio.run(main())
