#!/usr/bin/env python3
"""
Verification script for Professional Case Assignment scopes.
"""

import asyncio
import os
import sys

# Add backend directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select

from app.models.professional import CaseAssignment, AssignmentStatus

async def main():
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        print("❌ DATABASE_URL environment variable not set")
        return

    engine = create_async_engine(database_url, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as session:
        print("Fetching active case assignments...")
        result = await session.execute(
            select(CaseAssignment).where(
                CaseAssignment.status == AssignmentStatus.ACTIVE.value
            )
        )
        assignments = result.scalars().all()
        
        print(f"Found {len(assignments)} active assignments.")
        
        for assignment in assignments:
            scopes = assignment.access_scopes or []
            print(f"Assignment {assignment.id} (Prof: {assignment.professional_id}): {len(scopes)} scopes")
            if "compliance" in scopes and "messages" in scopes:
                print("  ✅ Has compliance and messages")
            else:
                print(f"  ❌ MISSING SCOPES: {scopes}")

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except RuntimeError:
        pass # Ignore event loop closed error
