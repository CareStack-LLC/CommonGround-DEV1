# ADR-001: Percentage Contract on the Wire

**Status:** Accepted (2026-04-17)

## Context

Custody-tracking and compliance percentages (GPS-verified rate, on-time rate,
flag rate, funding rate, completion rate, etc.) were inconsistently represented
across service boundaries. The court endpoint returned values in `[0, 100]`
while the professional endpoint returned the same logical field in `[0, 1]`.
Frontend code multiplied by 100 at the render edge without knowing which
contract was in force, producing visible failures like "GPS Verified: 4000%"
and "9450% on-time" in email digests.

## Decision

**All percentage / rate fields on the JSON wire are `float` in `[0, 100]` with
at most one decimal place.**

- "Rate" fields (`gps_verified_rate`, `on_time_rate`, `flag_rate`,
  `acceptance_rate`, `completion_rate`, `funding_rate`,
  `geofence_compliance_rate`, `compliance_rate`, …) are `0–100`, not `0–1`.
- "Percentage" fields (`parent_a_percentage`, `funding_percentage`,
  `completion_percentage`, `progress_percentage`) are `0–100`.
- Variance fields (`variance.parent_a`, `variance.parent_b`) are the signed
  difference of two 0–100 values.
- The frontend renders with `.toFixed(0)` / `.toFixed(1)` and never multiplies.
- Internal ratio math may use 0–1 within a single function scope but must
  convert to 0–100 before returning.

## Enforcement

- `backend/app/schemas/exchange_compliance.py` defines
  `Rate = Annotated[float, Field(ge=0, le=100)]` and every rate field uses it.
  A service that returns 0–1 by mistake raises 422 on serialization.
- `frontend/components/schedule/custody-dashboard.tsx` uses a shared `pct()`
  helper that clamps `[0, 100]` before rendering — silent defense if the
  contract ever slips.
- Module docstring at the top of `backend/app/services/exchange_compliance.py`
  points readers to this ADR.

## Consequences

- One endpoint changes shape: `app/services/professional/compliance_service.py`
  previously returned 0–1; it now returns 0–100. Consumer at
  `frontend/app/professional/cases/[familyFileId]/compliance/page.tsx` stops
  multiplying by 100.
- Email digest at `backend/app/services/email.py` stops multiplying by 100.
- Any future rate field must be annotated `Rate` and return 0–100.

## Out of scope

- Stripe money amounts (`amount / 100` for cents → dollars) are monetary, not
  percentages — unaffected.
- Latency fields in `* 1000` for seconds → milliseconds are time, not
  percentages — unaffected.
- `chart_builder.py` uses percentages internally for SVG arc math; intermediate
  `(pct / 100) * circumference` is fine because it never crosses the wire.
