"""add storage buckets

Revision ID: add_storage_buckets
Revises: add_pro_directory_fields
Create Date: 2026-02-11 12:05:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'add_storage_buckets'
down_revision: Union[str, Sequence[str], None] = 'add_pro_directory_fields'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # SQL to create buckets if they don't exist
    op.execute("""
    insert into storage.buckets (id, name, public)
    values 
        ('professional-videos', 'professional-videos', true),
        ('professional-logos', 'professional-logos', true),
        ('professional-headshots', 'professional-headshots', true)
    on conflict (id) do nothing;
    """)

    # SQL to create policies (idempotent-ish via DO block or just simple creation which might fail if exists)
    # We'll use a DO block to check existence or just rely on 'create policy if not exists' if supported, 
    # but Postgres 16+ supports 'create policy if not exists' - older ones might not. 
    # Safest is to drop and recreate or catch exception. 
    # Simple approach: Drop then create.
    
    op.execute("""
    do $$
    begin
      if not exists (
        select 1 from pg_policies 
        where schemaname = 'storage' 
        and tablename = 'objects' 
        and policyname = 'Public Access Professionals'
      ) then
        create policy "Public Access Professionals"
        on storage.objects for select
        using ( bucket_id in ('professional-videos', 'professional-logos', 'professional-headshots') );
      end if;
      
      if not exists (
        select 1 from pg_policies 
        where schemaname = 'storage' 
        and tablename = 'objects' 
        and policyname = 'Authenticated Upload Professionals'
      ) then
        create policy "Authenticated Upload Professionals"
        on storage.objects for insert
        with check ( bucket_id in ('professional-videos', 'professional-logos', 'professional-headshots') and auth.role() = 'authenticated' );
      end if;
      
      -- OR ensure authenticated users can update/delete their own files if needed, but for now just upload/read.
    end
    $$;
    """)


def downgrade() -> None:
    # We generally don't delete buckets in downgrade to prevent data loss, 
    # but we can remove the policies.
    op.execute("""
    drop policy if exists "Public Access Professionals" on storage.objects;
    drop policy if exists "Authenticated Upload Professionals" on storage.objects;
    """)
    # op.execute("delete from storage.buckets where id in ('professional-videos', 'professional-logos', 'professional-headshots');")
