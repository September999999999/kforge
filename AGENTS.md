# AGENTS.md

This repository contains `kforge`, a protocol and CLI for LLM-maintained
Markdown knowledge repos.

## Development Rules

- Keep the core CLI deterministic and provider-neutral.
- Prefer TypeScript with Node standard-library APIs unless a dependency removes
  real complexity.
- Do not add Python runtime dependencies or Python implementation scripts.
- Treat Rust as an optional future acceleration layer only after a measured
  performance need appears.
- Do not add network calls to core commands without an explicit opt-in flag.
- Treat generated knowledge repo files as user data. Never delete or rewrite
  them without reviewable intent.
- Keep docs, tests, and CLI behavior aligned when changing the protocol.
- Keep MCP tools aligned with the equivalent CLI/API behavior.
- Keep compile workflows model-agnostic; the core CLI should prepare handoff
  artifacts, not silently call a hosted LLM.
- Follow `CONTRIBUTING.md` and `docs/release-checklist.md` when changing public
  CLI, MCP, protocol, or package behavior.

## Knowledge Repo Maintenance Rules

When acting inside a `kforge` knowledge repo:

1. Preserve `raw/` as source evidence. Do not rewrite original source files.
2. Put human-readable compiled articles in `wiki/`.
3. Put generated inventories and maps in `indexes/`.
4. Put important sourced assertions in `claims/`.
5. Put answers, reports, charts, and slides in `outputs/`.
6. Put proposed large edits, conflicts, and uncertain changes in `reviews/`.
7. Mark unsupported or inferred claims explicitly instead of presenting them as
   source facts.
8. Prefer small, reviewable edits over broad rewrites.
9. Keep local source references valid so `kforge doctor` can verify them.
10. For broad wiki rewrites, create a review artifact before changing target
    pages.
11. Run `kforge context` when entering an unfamiliar knowledge repo.
12. Use `kforge source add` to copy new local evidence into `raw/` with
    metadata.
13. Use `kforge source list` and `kforge source inspect` to check source
    metadata before compiling from new evidence.
14. Use `kforge graph` to inspect wiki backlinks, orphans, and broken links.
15. Use `kforge search` to locate relevant local files before broad reading.
16. Use `kforge inspect` before reading large or highly connected files in full.
17. Use `kforge compile` to prepare source-to-wiki handoff briefs.
18. Use `kforge ask` to create answer packs for question-driven research.
19. Use `kforge pack` when handing a focused task to another LLM agent.
20. Use `kforge output list` and `kforge output inspect` before promoting
    generated outputs.
21. Use `kforge promote` to stage useful `outputs/` artifacts as reviews
    before filing them into `wiki/` or `claims/`.
22. Use `kforge review status` to mark reviewed artifacts as accepted,
    rejected, or applied.
23. Use `kforge review apply` only for accepted reviews with structured
    Proposed Content and a single wiki or claim target.
24. Use `kforge score` to summarize trust metrics before larger handoffs.
