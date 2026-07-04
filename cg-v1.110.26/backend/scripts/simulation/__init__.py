"""
CommonGround Two-Week Family Simulation.

Runs the platform like a real user base for 14 consecutive days — ~100 parent
testers across ~50 family files, each family living out a coherent, scripted
co-parenting life (messages, custody exchanges, expenses, child support,
TimeBridge events) — and collects a daily system report.

Design doc:  docs/SIMULATION_2WEEK.md  (authoritative)
Run:         python -m scripts.simulation.run --mode {seed|day|report}
Selftest:    python -m scripts.simulation.selftest   (pure computation, no network)

NO-FIX POLICY: the runner only records; failures become report lines, never
aborts. Nothing gets fixed until the 14-day run completes.
"""
