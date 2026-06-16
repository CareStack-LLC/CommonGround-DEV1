"""add storage buckets

Revision ID: add_storage_buckets
Revises: add_pro_directory_fields
Create Date: 2026-02-11 12:05:00.000000

Supabase-only: the `storage` schema (and `auth.role()`) exist only on
Supabase-hosted Postgres. On vanilla Postgres (local dev, CI) this
migration is a guarded no-op so a fresh database can bootstrap.
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
    op.execute("""
    do $$
    begin
      if to_regclass('storage.buckets') is null then
        raise notice 'storage.buckets not present (not Supabase) - skipping bucket/policy setup';
        return;
      end if;

      insert into storage.buckets (id, name, public)
      values
          ('professional-videos', 'professional-videos', true),
          ('professional-logos', 'professional-logos', true),
          ('professional-headshots', 'professional-headshots', true)
      on conflict (id) do nothing;

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
    end
    $$;
    """)


def downgrade() -> None:
    # We generally don't delete buckets in downgrade to prevent data loss,
    # but we can remove the policies. Guarded for non-Supabase Postgres.
    op.execute("""
    do $$
    begin
      if to_regclass('storage.objects') is null then
        return;
      end if;
      drop policy if exists "Public Access Professionals" on storage.objects;
      drop policy if exists "Authenticated Upload Professionals" on storage.objects;
    end
    $$;
    """)
