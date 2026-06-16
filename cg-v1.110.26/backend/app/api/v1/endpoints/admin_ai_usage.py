"""Admin AI usage endpoint — daily token counters from Redis.

GET /admin/ai-usage          — today's usage by provider/model + budget state
GET /admin/ai-usage?day=YYYYMMDD — a specific day (last 7 days retained)
"""

import re
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query

from app.core.ai_usage import get_usage_summary
from app.core.security import get_current_admin_user
from app.models.user import User

router = APIRouter()

_DAY_RE = re.compile(r"^\d{8}$")


@router.get("/ai-usage")
async def get_ai_usage(
    day: Optional[str] = Query(None, description="UTC day as YYYYMMDD; defaults to today"),
    admin: User = Depends(get_current_admin_user),
) -> dict:
    if day and not _DAY_RE.match(day):
        raise HTTPException(status_code=400, detail="day must be YYYYMMDD")
    return await get_usage_summary(day)
