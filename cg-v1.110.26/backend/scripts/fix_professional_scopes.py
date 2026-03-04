#!/usr/bin/env python3
"""
Fix script to update Professional Case Assignment scopes.

Adds missing scopes (compliance, messages, etc.) to all active case assignments.
This resolves 403 errors and missing data in the Professional Portal.
"""

import asyncio
import os
import sys

# Add backend directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select, update

from app.models.professional import CaseAssignment, AssignmentStatus

# Full set of scopes a professional should have
REQUIRED_SCOPES = [
    "overview",
    "timeline",
    "calendar",
    "schedule",
    "checkins",
    "messages",
    "agreement",
    "financials",
    "documents",
    "compliance",
    "aria_control"
]

async def main():
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        print("❌ DATABASE_URL environment variable not set")
        return

    print(f"Connecting to database...")
    engine = create_async_engine(database_url, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as session:
        # Get all active assignments
        print("Fetching active case assignments...")
        result = await session.execute(
            select(CaseAssignment).where(
                CaseAssignment.status == AssignmentStatus.ACTIVE.value
            )
        )
        assignments = result.scalars().all()
        
        print(f"Found {len(assignments)} active assignments.")
        
        updated_count = 0
        for assignment in assignments:
            current_scopes = set(assignment.access_scopes or [])
            new_scopes = set(REQUIRED_SCOPES)
            
            # check if any are missing
            if not new_scopes.issubset(current_scopes):
                # Update scopes
                merged_scopes = list(current_scopes.union(new_scopes))
                assignment.access_scopes = merged_scopes
                updated_count += 1
                print(f"  Refreshed scopes for assignment {assignment.id} (Professional: {assignment.professional_id})")
        
        if updated_count > 0:
            await session.commit()
            print(f"\n✅ Updated {updated_count} assignments with full permissions.")
        else:
            print("\n✅ All assignments already have required permissions.")

if __name__ == "__main__":
    asyncio.run(main())
