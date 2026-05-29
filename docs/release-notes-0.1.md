# kforge 0.1 Release Notes

`kforge` 0.1 is the first public prototype of a local-first Markdown repo
protocol for LLM-maintained knowledge bases.

The release proves the core loop:

```text
raw evidence -> agent draft -> review -> wiki/claims -> health checks
```

It is not a RAG framework, not an Obsidian plugin, not a hosted AI app, and not
a model wrapper. It gives those tools a shared filesystem contract: raw sources,
compiled wiki pages, sourced claims, review artifacts, generated outputs,
claimable tasks, auditable runs, and deterministic indexes.

## Who This Is For

Use this release if you want:

- a local repo that Obsidian, Git, CLIs, MCP tools, and LLM agents can all read
- source evidence protected under `raw/`
- generated drafts and answers that can be filed back into durable Markdown
- review gates before broad wiki or claim edits land
- deterministic health checks instead of hidden application state
- provider-neutral tooling that works without a hosted model or vector database

## What Ships

### Repo Protocol

- Canonical directories:
  `raw/`, `wiki/`, `claims/`, `indexes/`, `outputs/`, `reviews/`, `tasks/`,
  and `runs/`.
- `kb.yaml` protocol manifest validation.
- Demo repo generation with refreshed indexes and derived reports.
- Obsidian-friendly Markdown files throughout the durable state, including an
  `indexes/obsidian.md` vault entry note.

### Agent Draft Loop

- `kforge agent next` claims the next review-backed task and starts a run.
- `kforge agent step` returns a focused work packet for one agent.
- `kforge agent draft` writes an editable compile draft under `outputs/`.
- `kforge review content` attaches edited output back to a review.
- `kforge review status` and `kforge review apply` gate accepted writes.
- `kforge agent finish` closes the run and can mark the task done.
- `kforge agent reconcile` dry-runs or repairs recoverable multi-agent board
  drift.
- The ten-minute walkthrough in `docs/examples.md` covers this full path.

### Local Web Workbench

- `kforge web` opens a localhost dashboard for repo health, trust score, claim
  audit, review queue, task queue, runs, active agents, file previews, search,
  answer packs, compile-review drafts, and output promotion.
- The dashboard can ingest a single URL, pasted URL list, or local directory
  into `raw/`.
- Safe Web actions can save Proposed Content, accept or reject reviews,
  dry-run and apply accepted reviews, preview or apply agent reconcile, refresh
  indexes, bootstrap review-first work, plan multi-agent runs, write launcher
  scripts, log runs, finish runs as success or failure, mark linked tasks done
  on success, and release claimed tasks back to the queue.
- `kforge agent dispatch` combines bootstrap, multi-agent run assignment, and
  launcher preparation for newly ingested research queues.

### Ingest, Compile, And Filing

- `kforge source add` and `kforge source import` copy local source material into
  `raw/` with metadata sidecars.
- `kforge compile plan`, `compile review`, `compile`, and `compile draft`
  stage raw-to-wiki work without calling a model provider.
- `kforge ask` and `kforge pack` generate provider-neutral answer and task
  packs.
- `kforge output list`, `output inspect`, and `promote` keep generated output
  reviewable before it becomes durable wiki or claim content.

### Trust And Health

- `kforge doctor` checks repo structure, source references, review targets,
  broken wikilinks, stale generated indexes, and symlink boundaries.
- `kforge score` summarizes provenance, review debt, target coverage, and
  doctor health, with JSON output and minimum-score gates for Trust CI
  thresholds.
- `kforge ci` combines doctor and trust score gates for CI and agent handoff.
- `kforge claim audit` and `claim review-drift` surface source drift and review
  debt, with JSON output for stale-review automation.
- Review quality gates block acceptance, apply, and accepted output promotion
  when draft TODO markers remain.

### Automation Surfaces

- JSON output for ingest, planning, review routing, task coordination, runs,
  outputs, doctor checks, and review lifecycle commands.
- `kforge-mcp` stdio MCP server exposing deterministic repo operations.
- TypeScript ESM package entrypoint with declarations.
- Agent instruction templates for Codex, Claude Code, Cursor, and generic
  local assistants.

### Release Guards

- TypeScript-first Node.js implementation.
- No Python runtime or implementation scripts in the core project.
- No mandatory vector database, hosted model, network service, or background
  worker.
- `npm test`, `npm run smoke`, `npm run check:package`, `npm run check:install`, `npm run check:launch`, `npm run check:surface`, `npm run check:walkthrough`, `npm run check:release`, and `npm pack --dry-run` cover the v0.1 publish path.

## Try It

```bash
npm install -g kforge
kforge demo ./kforge-demo
cd ./kforge-demo
kforge agent next . --agent local-agent --json
kforge agent step . --agent local-agent --json
kforge agent draft . --agent local-agent --json
```

Then follow the exact output and review paths from the JSON payloads, or use
the full walkthrough:

```text
docs/examples.md#ten-minute-agent-draft-walkthrough
```

## Known Boundaries

- This release does not call LLM providers directly.
- Search is deterministic text routing, not semantic retrieval.
- The Obsidian experience is file-based; there is no Obsidian plugin yet.
- Rust acceleration is reserved for future measured hotspots.
- Repository metadata should be added only when the real public repository URL
  is known.

## Upgrade Notes

This is the first public prototype. There are no migration steps yet.

The repo protocol is intentionally conservative, but future 0.x releases may
still refine file formats as the project learns from real use.
