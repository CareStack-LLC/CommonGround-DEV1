import asyncio
import os
from sqlalchemy import select, delete, text
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from app.models import Agreement, AgreementSection

async def delete_agreements():
    engine = create_async_engine(os.environ["DATABASE_URL"], connect_args={"statement_cache_size": 0})
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with async_session() as db:
        leo_ff_id = "b9c6031c-8084-4d72-b0ca-080358b7f711"
        stacy_ff_id = "d6f08c5a-e65c-4dbe-8b65-f128167c9f3f"
        
        for ff_id in [leo_ff_id, stacy_ff_id]:
            print(f"Finding agreements for FF: {ff_id}...")
            result = await db.execute(select(Agreement).where(Agreement.family_file_id == ff_id))
            agreements = result.scalars().all()
            
            for a in agreements:
                print(f" Deleting side effects for {a.id} ({a.title})...")
                # Clear Obligation children first
                await db.execute(
                    text("DELETE FROM obligation_funding WHERE obligation_id IN (SELECT id FROM obligations WHERE agreement_id = :aid)"),
                    {"aid": a.id}
                )
                
                # Clear Obligations
                await db.execute(
                    text("DELETE FROM obligations WHERE agreement_id = :aid"),
                    {"aid": a.id}
                )
                
                # Clear Custody Exchanges
                await db.execute(
                    text("DELETE FROM custody_exchanges WHERE agreement_id = :aid"),
                    {"aid": a.id}
                )

                print(f" Deleting agreement {a.id} ({a.title})...")
                # Delete sections
                await db.execute(delete(AgreementSection).where(AgreementSection.agreement_id == a.id))
                # Delete agreement
                await db.execute(delete(Agreement).where(Agreement.id == a.id))
            
        await db.commit()
        print("Cleanup completed successfully.")

if __name__ == "__main__":
    asyncio.run(delete_agreements())
