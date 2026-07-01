"""AI layer: narrator (parent voice), judge (soft-bug review), daily rollup.

All AI is additive. The hard Oracle asserts always run; if the Anthropic key is
absent, disabled, or the token budget is exhausted, every AI call degrades to a
templated fallback and the campaign continues.
"""
