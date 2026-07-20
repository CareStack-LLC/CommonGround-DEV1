"""Shared Pydantic field types.

The persistence layer stores all timestamps as *naive UTC* (SQLAlchemy
``DateTime`` columns without ``timezone=True``, populated from
``datetime.utcnow()``, and compared against naive ``datetime.utcnow()`` in
model properties such as ``Obligation.is_overdue``).

Clients — including any browser that serializes a ``Date`` to ISO 8601 with a
``Z`` / offset suffix — send *timezone-aware* datetimes. Inserting a tz-aware
value into a ``timestamp without time zone`` column raises asyncpg
``DataError``, and mixing it into naive comparisons raises ``TypeError``. This
was a 100% failure on event/obligation creation from any tz-aware caller.

``NaiveUTCDatetime`` normalizes an incoming datetime to naive UTC at the API
boundary, matching the storage convention without a risky column-type
migration across dozens of tables.
"""

from datetime import datetime, timezone
from typing import Annotated

from pydantic import AfterValidator


def to_naive_utc(value: datetime) -> datetime:
    """Coerce a tz-aware datetime to naive UTC; pass naive datetimes through."""
    if isinstance(value, datetime) and value.tzinfo is not None:
        return value.astimezone(timezone.utc).replace(tzinfo=None)
    return value


# Use on request/input datetime fields that land in naive DateTime columns.
NaiveUTCDatetime = Annotated[datetime, AfterValidator(to_naive_utc)]
