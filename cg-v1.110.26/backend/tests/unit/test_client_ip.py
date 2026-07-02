"""Unit tests for rate-limit client-IP derivation (X-Forwarded-For spoofing).

The scenarios below are the EXACT chains observed against the live
Cloudflare -> Render edge on 2026-07-02, with real IP 69.75.69.154:
  no spoof:                    "69.75.69.154, 104.23.251.4"
  spoof "9.9.9.9":             "9.9.9.9,69.75.69.154, 172.68.174.71"
  spoof "1.1.1.1, 2.2.2.2":    "1.1.1.1, 2.2.2.2,69.75.69.154, 172.70.206.116"
In every case the trustworthy client IP is the 2nd entry from the right.
"""
from types import SimpleNamespace

from app.core.rate_limit import _get_client_ip

REAL = "69.75.69.154"


def _req(xff: str | None, client_host: str | None = "10.0.0.1"):
    headers = {}
    if xff is not None:
        headers["x-forwarded-for"] = xff
    return SimpleNamespace(
        headers=SimpleNamespace(get=headers.get),
        client=SimpleNamespace(host=client_host) if client_host else None,
    )


def test_no_spoof_returns_real_client():
    assert _get_client_ip(_req("69.75.69.154, 104.23.251.4")) == REAL


def test_single_spoof_is_ignored():
    assert _get_client_ip(_req("9.9.9.9,69.75.69.154, 172.68.174.71")) == REAL


def test_multi_spoof_is_ignored():
    assert _get_client_ip(_req("1.1.1.1, 2.2.2.2,69.75.69.154, 172.70.206.116")) == REAL


def test_attacker_cannot_forge_client_ip():
    # Attacker crams many fake IPs to try to land one at position -2.
    spoof = "6.6.6.6, 7.7.7.7, 8.8.8.8," + REAL + ", 172.70.1.1"
    got = _get_client_ip(_req(spoof))
    assert got == REAL
    assert got not in {"6.6.6.6", "7.7.7.7", "8.8.8.8"}


def test_short_chain_falls_back_to_leftmost():
    # Fewer entries than trusted hops (e.g. misconfig) — don't index out of range.
    assert _get_client_ip(_req("203.0.113.9")) == "203.0.113.9"


def test_no_header_uses_socket_peer():
    assert _get_client_ip(_req(None, client_host="198.51.100.7")) == "198.51.100.7"


def test_no_header_no_client_returns_unknown():
    assert _get_client_ip(_req(None, client_host=None)) == "unknown"
