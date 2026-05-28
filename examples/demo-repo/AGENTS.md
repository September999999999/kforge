# AGENTS.md

This is a kforge knowledge repo.

## Rules for LLM Agents

1. Preserve `raw/` as source evidence. Do not rewrite original source files.
2. Compile human-readable articles into `wiki/`.
3. Keep generated inventories and maps in `indexes/`.
4. Put important assertions that need traceability into `claims/`.
5. Save answers, reports, charts, and slides in `outputs/`.
6. Put risky edits, conflicts, and uncertain changes in `reviews/`.
7. Use `tasks/` to coordinate parallel agents; claim a task before editing.
8. Use `runs/` to log agent execution and success or failure state.
9. Mark unsupported or inferred claims explicitly.
10. Prefer small, reviewable edits over broad rewrites.
11. Keep local source references valid so `kforge doctor` can verify them.
12. For broad wiki rewrites, create a review artifact before changing target
    pages.
13. Run `kforge context` when entering an unfamiliar knowledge repo.
14. Use `kforge search` to locate relevant local files before broad reading.
15. Use `kforge inspect` before reading large or highly connected files in full.
16. Use `kforge task seed`, `kforge task list`, and `kforge task claim`
    when multiple agents are working from the same review queue.
17. Use `kforge run start`, `kforge run log`, and `kforge run finish`
    to leave an auditable trail for task work.
18. Use `kforge compile` to prepare source-to-wiki handoff briefs.
19. Use `kforge ask` to create answer packs for question-driven research.
20. Use `kforge pack` when handing a focused task to another LLM agent.
21. Use `kforge output list` and `kforge output inspect` before promoting outputs.
22. Use `kforge promote` to stage useful `outputs/` artifacts as reviews.
23. Use `kforge score` to summarize trust metrics before larger handoffs.
