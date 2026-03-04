from logging.config import fileConfig

from sqlalchemy import engine_from_config
from sqlalchemy import pool

from alembic import context

# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config

# Interpret the config file for Python logging.
# This line sets up loggers basically.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

from app.core.config import settings
from sqlalchemy import create_engine

# Get database URL and convert to sync driver for alembic
db_url = settings.DATABASE_URL
# Convert asyncpg to psycopg2 for sync migrations
if "+asyncpg" in db_url:
    db_url = db_url.replace("postgresql+asyncpg://", "postgresql://")
elif "postgres://" in db_url:
    db_url = db_url.replace("postgres://", "postgresql://", 1)

# Add SSL mode for Supabase connections
if "supabase.co" in db_url and "sslmode=" not in db_url:
    separator = "&" if "?" in db_url else "?"
    db_url = f"{db_url}{separator}sslmode=require"

# Store the URL for later use (don't use config.set_main_option to avoid % interpolation issues)
_database_url = db_url

# add your model's MetaData object here
# for 'autogenerate' support
# from myapp import mymodel
# target_metadata = mymodel.Base.metadata
import sys
from pathlib import Path

# Add the parent directory to the path so we can import app modules
sys.path.append(str(Path(__file__).parent.parent))

from app.models import Base
target_metadata = Base.metadata

# other values from the config, defined by the needs of env.py,
# can be acquired:
# my_important_option = config.get_main_option("my_important_option")
# ... etc.


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode.

    This configures the context with just a URL
    and not an Engine, though an Engine is acceptable
    here as well.  By skipping the Engine creation
    we don't even need a DBAPI to be available.

    Calls to context.execute() here emit the given string to the
    script output.

    """
    context.configure(
        url=_database_url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def include_object(object, name, type_, reflected, compare_to):
    """
    Ignore certain tables that are managed outside of Alembic.
    """
    if type_ == "table" and name.startswith("aria_"):
        return False
    return True


def run_migrations_online() -> None:
    """Run migrations in 'online' mode.

    In this scenario we need to create an Engine
    and associate a connection with the context.

    """
    # Create engine directly to avoid configparser % interpolation issues
    connectable = create_engine(_database_url, poolclass=pool.NullPool)

    with connectable.connect() as connection:
        context.configure(
            connection=connection, 
            target_metadata=target_metadata,
            include_object=include_object
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
