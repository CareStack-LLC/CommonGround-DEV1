"""Append-only JSONL run ledger + persisted campaign day-state."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Optional

from .config import STATE_DIR

LEDGER_PATH = STATE_DIR / "ledger.jsonl"
STATE_PATH = STATE_DIR / "day_state.json"


def append_ledger(record: dict) -> None:
    STATE_DIR.mkdir(parents=True, exist_ok=True)
    with LEDGER_PATH.open("a", encoding="utf-8") as f:
        f.write(json.dumps(record, default=str) + "\n")


def load_state() -> dict:
    if STATE_PATH.exists():
        try:
            return json.loads(STATE_PATH.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            return {}
    return {}


def save_state(state: dict) -> None:
    STATE_DIR.mkdir(parents=True, exist_ok=True)
    STATE_PATH.write_text(json.dumps(state, indent=2, default=str), encoding="utf-8")


def run_key(day: int, family_id: str, scenario_id: str) -> str:
    return f"{day}:{family_id}:{scenario_id}"
