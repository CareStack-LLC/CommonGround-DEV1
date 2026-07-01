"""
CommonGround AI-Agent Bug Campaign.

A standalone harness that drives the real parent-facing API as synthetic
families, independently recomputes the expected results (the Oracle), and
auto-files any mismatch as a bug into the existing bug-hunt system.

See docs: /Users/tj/.claude/plans/that-worked-now-we-serene-jellyfish.md
Run:      python -m scripts.bug_campaign.run --mode {smoke|fast|soak}
"""
