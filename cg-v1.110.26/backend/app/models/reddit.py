"""Reddit integration config model — key/value store for credentials and settings."""

from typing import Optional

from sqlalchemy import String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, UUIDMixin


class RedditConfig(Base, UUIDMixin, TimestampMixin):
    """Key-value config for Reddit API credentials and settings."""

    __tablename__ = "reddit_config"

    key: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    value: Mapped[Optional[str]] = mapped_column(Text, default="", nullable=True)

    def __repr__(self) -> str:
        return f"<RedditConfig {self.key}>"
