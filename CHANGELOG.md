# Changelog

All notable changes to `kforge` will be documented in this file.

The format follows the spirit of Keep a Changelog. The project will use
semantic versioning once public releases begin.

## 0.1.0 - Unreleased

Initial public prototype.

### Added

- Canonical local knowledge repo layout:
  `raw/`, `wiki/`, `claims/`, `indexes/`, `outputs/`, `reviews/`, and
  `tasks/`, and `runs/`.
- TypeScript-first Node.js CLI with `kforge` and `kforge-mcp` binaries.
- Repo initialization with optional example content.
- Demo command and MCP tool for creating a ready-to-browse example knowledge
  repo without remembering `init --example`.
- Example repos initialize with refreshed indexes and derived reports.
- Source ingest with `kforge source add`, metadata sidecars under `raw/_meta/`,
  and source browsing with `source list` and `source inspect`.
- Collision-safe source metadata sidecars for raw sources that share a base
  name across extensions.
- Machine-readable source ingest with `kforge source add --json`,
  `kforge source import --json`, and matching MCP options.
- Deterministic indexing for source inventory, wiki map, backlinks, claims, and
  reviews.
- Claim provenance, source-drift, and review-debt audits with `kforge claim audit`.
- Stale review generation from claim source-drift warnings with
  `kforge claim review-drift`, including agent handoff steps and proposed claim
  content.
- Prioritized review queues with `kforge review queue`, `kforge review next`,
  and matching MCP tools for agent routing.
- Machine-readable review routing with `kforge review queue --json`,
  `kforge review next --json`, and matching MCP options.
- High-level agent work entrypoints with `kforge agent next`, `agent step`,
  `agent draft`, `agent status`, `agent finish`, `kforge_agent_next`,
  `kforge_agent_step`, `kforge_agent_draft`, `kforge_agent_status`, and
  `kforge_agent_finish`, backed by task claiming, compile draft generation, and
  auditable run records.
- Parallel-agent task coordination with `kforge task seed`, `task list`,
  `task claim`, `task next`, `task done`, `task release`, JSON output, and
  matching MCP tools.
- Auditable agent run records with `kforge run next`, `run start`, `run list`,
  `run inspect`, `run log`, `run finish`, JSON output, and matching MCP tools.
- Machine-readable compile planning and review staging with
  `kforge compile plan --json`, `kforge compile review --json`, and matching
  MCP options.
- Agent handoff packets with `kforge handoff`.
- Refresh command for regenerating indexes plus context, workflow, doctor, and
  score reports.
- Wiki graph reports for backlinks, orphan pages, and broken wikilinks.
- Structural health checks with `kforge doctor`.
- Trust score reports with provenance, review-target coverage, review debt, and
  doctor health.
- Agent workflow runbooks with repo-specific next steps and copyable CLI loops.
- Deterministic text search and structured file inspection.
- Source-to-wiki compile briefs for model handoff without calling a provider.
- Wiki draft template generation with `kforge compile draft`, including source
  metadata, source excerpts, and existing target context.
- Machine-readable compile draft output with `kforge compile draft --json`,
  including written output refs and review writeback commands.
- Review quality gates that block acceptance, apply, and accepted output
  promotion while Proposed Content still contains draft markers such as `TODO`.
- Compile review generation with `kforge compile review` for staging queued raw
  sources as proposed review artifacts before wiki edits, including dry-run JSON
  results.
- Compile review queue guidance that prints source inspection, compile brief,
  and Proposed Content writeback commands.
- Question-focused answer packs with `kforge ask`.
- Agent task packs with `kforge pack`.
- Output listing and inspection before filing generated artifacts.
- Output promotion into review artifacts with `kforge promote`.
- Machine-readable output filing flow with `kforge output list --json`,
  `kforge output inspect --json`, `kforge promote --json`, and matching MCP
  options.
- Claim artifacts and review artifacts.
- Review lifecycle commands:
  `review new`, `review content`, `review status`, and constrained
  `review apply`.
- Machine-readable review lifecycle updates with `review content --json`,
  `review status --json`, `review apply --json`, and matching MCP options.
- Review apply support for accepted single-target wiki and claim edits with
  structured proposed content.
- Symlink-aware repo boundary checks for repo-local reads, source references,
  promotions, and review application.
- Doctor reporting for symlinks under canonical repo directories that resolve
  outside the repo.
- Doctor detection for stale canonical generated index files.
- Doctor validation for the `kb.yaml` protocol name, version, and canonical
  directory mapping.
- Writable doctor reports under `indexes/doctor.md`.
- Machine-readable doctor output with `kforge doctor --json` for CI and shell
  automation.
- Stdio MCP server exposing deterministic repo operations.
- ESM package entrypoint with TypeScript declarations.
- Local Web dashboard for repo health, trust score, claim audit, review queues,
  task queues, runs, active agents, file previews, source ingest, search,
  answer packs, output promotion, multi-agent run planning, launcher script
  writing, run logging and finishing, agent reconcile, and releasing claimed
  tasks back to the queue.
- End-to-end examples for CLI, MCP, and TypeScript API usage.
- Vision documentation defining the TypeScript-first implementation stance,
  optional Rust acceleration boundary, and no-Python core constraint.
- Stack guard check that fails release/test workflows if Python implementation
  files, Python packaging manifests, or Python runtime commands enter the core.
- Reusable TypeScript smoke checks used by CI and release preflight, covering
  real CLI workflows, compile plan/review JSON, review queues, output
  promotion, doctor JSON, MCP help, and package imports.
- npm publication prep with public publish config, package-manager metadata,
  expanded discovery keywords, install docs, and a publishing checklist that
  avoids placeholder repository URLs.
- Package metadata guard that verifies npm publish fields, bin entries,
  packaged files, scripts, keywords, and placeholder repository metadata.
- Browsable `examples/demo-repo` fixture generated from the built-in example,
  with a `demo:sync` script and smoke coverage.
- README positioning and workflow diagram clarifying that `kforge` is the
  local repo protocol and deterministic tool layer, not a note app, hosted AI
  platform, workspace wiki, RAG framework, or orchestration framework.
- Comparison documentation clarifying boundaries with PKM apps, AI app
  builders, chat-with-docs tools, RAG systems, and LLM app frameworks.
- CI, contributor guide, security policy, code of conduct, issue templates, PR
  template, and release checklist.

### Design Constraints

- Local-first and Markdown-first.
- Provider-neutral core commands.
- No mandatory vector database.
- No Python runtime or implementation scripts.
- Rust reserved for future optional acceleration only after profiling shows a
  need.
