"""Generic CSV export utility for admin endpoints.

Stream rows as CSV via FastAPI's StreamingResponse so we don't buffer the full
result set in memory — important for tables that can get large (leads, audit
logs, users).

Usage:
    from app.utils.csv_export import stream_csv_rows

    async def row_generator():
        for lead in await get_leads(...):
            yield {"email": lead.email, "name": lead.full_name, ...}

    return stream_csv_rows(
        rows=row_generator(),
        columns=["email", "name", "source", "stage"],
        filename="leads_2026-04-17.csv",
    )
"""

import csv
import io
from datetime import datetime, date
from typing import Any, AsyncIterator, Iterable, Optional, Union

from fastapi.responses import StreamingResponse


def _stringify(value: Any) -> str:
    """Normalize a value for CSV output.

    - None → empty string
    - datetime → ISO-8601
    - dict / list → JSON
    - everything else → str(value)
    """
    if value is None:
        return ""
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    if isinstance(value, (dict, list)):
        import json
        return json.dumps(value, default=str, separators=(",", ":"))
    if isinstance(value, bool):
        return "true" if value else "false"
    return str(value)


def _row_to_line(row: dict, columns: list[str]) -> str:
    """Serialize one row to a single CSV line (with trailing \\n)."""
    buf = io.StringIO()
    w = csv.writer(buf, quoting=csv.QUOTE_MINIMAL, lineterminator="\n")
    w.writerow([_stringify(row.get(col)) for col in columns])
    return buf.getvalue()


async def _async_gen_from_iterable(rows: Iterable[dict]) -> AsyncIterator[dict]:
    """Adapt a sync iterable into an async one so callers can pass either."""
    for row in rows:
        yield row


async def _csv_stream(
    rows: Union[Iterable[dict], AsyncIterator[dict]],
    columns: list[str],
    header: Optional[list[str]] = None,
) -> AsyncIterator[str]:
    """Yield the CSV header line followed by each row as a CSV line."""
    # Header row
    header_labels = header or columns
    buf = io.StringIO()
    csv.writer(buf, quoting=csv.QUOTE_MINIMAL, lineterminator="\n").writerow(header_labels)
    yield buf.getvalue()

    # Body rows — support both sync and async iterables
    if hasattr(rows, "__aiter__"):
        async for row in rows:  # type: ignore[union-attr]
            yield _row_to_line(row, columns)
    else:
        async for row in _async_gen_from_iterable(rows):  # type: ignore[arg-type]
            yield _row_to_line(row, columns)


def stream_csv_rows(
    rows: Union[Iterable[dict], AsyncIterator[dict]],
    columns: list[str],
    filename: str,
    header: Optional[list[str]] = None,
) -> StreamingResponse:
    """Return a StreamingResponse that serializes `rows` as CSV.

    Args:
        rows: Iterable (sync or async) of dicts. Each dict is one row.
        columns: List of column keys — each must match a key in each row dict.
            Values are looked up via `row.get(col)` so missing keys become
            empty cells (no error).
        filename: Filename for the Content-Disposition header.
        header: Optional human-readable header labels; defaults to `columns`.

    Notes:
        - Content-Type: text/csv
        - Does NOT include a UTF-8 BOM. Excel handles UTF-8 CSV fine on macOS
          but Windows Excel may prefer BOM; if that ever matters, we can
          prepend "\\ufeff" to the first yielded chunk.
    """
    stream = _csv_stream(rows, columns, header=header)
    safe_filename = filename.replace('"', "").replace("\n", "").replace("\r", "")
    return StreamingResponse(
        stream,
        media_type="text/csv; charset=utf-8",
        headers={
            "Content-Disposition": f'attachment; filename="{safe_filename}"',
            "Cache-Control": "no-store",
        },
    )


def today_suffix() -> str:
    """Return a date suffix for filenames, e.g. '2026-04-17'."""
    return datetime.utcnow().date().isoformat()
