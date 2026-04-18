"""pytest configuration for the E2E suite.

Registers custom markers used by `test_full_system_e2e.py` so pytest
collection is clean even if `pytest-order` / `pytest-dependency` aren't
installed (in which case the markers still exist but don't enforce ordering
— the suite must then be run manually in the right order).
"""
from __future__ import annotations


def pytest_configure(config):
    config.addinivalue_line(
        "markers",
        "order(n): declare execution order for the orchestrated E2E suite "
        "(requires pytest-order to actually enforce)",
    )
    config.addinivalue_line(
        "markers",
        "dependency(name, depends): skip this stage if a named upstream "
        "stage failed (requires pytest-dependency to actually enforce)",
    )
