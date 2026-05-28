# Roadmap

## Milestone 0: Repo Contract

Goal: make the knowledge repo shape concrete enough for humans, agents, and
tools to share.

- `kforge init`
- `kforge source add`
- `kforge source fetch`
- `kforge source fetch-list`
- `kforge source import`
- source ingest JSON output for agent automation
- `kforge source list`
- `kforge source inspect`
- `kforge index`
- `kforge graph`
- `kforge doctor`
- root `AGENTS.md` template
- protocol docs
- smoke tests
- TypeScript-first CLI package
- no Python runtime or implementation scripts

## Milestone 1: Agent Compiler Loop

Goal: let an LLM agent compile new source material into reviewable wiki changes.

- agent context pack generation
- deterministic wiki graph and backlinks report
- compile prompt templates
- source-to-wiki compile brief command
- wiki draft template generation through `kforge compile draft`, including
  JSON output for automation
- source-to-page planning through `kforge compile plan`, including JSON output
  for automation
- queued source staging through `kforge compile review`, including JSON output
  for automation
- research bootstrap pipeline through `kforge bootstrap` for review staging,
  refresh, task seeding, and optional agent run assignment after ingest
- manual review artifact generation
- Proposed Content writeback through `kforge review content`, including JSON
  output for automation
- review index generation
- protected raw evidence policy
- generated change summaries

## Milestone 2: Provenance and Claims

Goal: make trust the center of the project.

- manual claim creation command
- claim index generation
- claim-level source references
- missing-source detection for wiki and claim files
- deterministic claim audit report
- source-newer-than-claim drift signals
- conflict detection
- stale claim audits
- human review states
- review status lifecycle command with JSON output for automation
- constrained review apply command for accepted wiki and claim edits, including
  dry-run/apply JSON output

## Milestone 3: Query and Filing

Goal: make answers accumulate instead of disappearing.

- deterministic text search command
- structured file inspection command
- agent task pack generation
- `kforge ask` answer pack
- output listing and inspection commands, including JSON output for automation
- output filing templates
- `kforge promote` review flow from `outputs/` toward `wiki/` and `claims/`,
  including JSON output for automation
- Obsidian-friendly answer pages

## Milestone 4: Integrations

Goal: make the protocol usable from common AI and PKM environments.

- Codex/Claude Code/Cursor agent templates through `kforge agent` and MCP tools
- MCP server for read/search/write/review operations
- stdio `kforge-mcp` server wrapping current CLI operations
- task seeding, next-task claiming, completion, and release for parallel agent
  runs, including JSON and MCP tools
- multi-agent run planning from one review queue, including JSON and MCP tools
- multi-agent board state with active runs, claimed tasks, and coordination gap
  detection
- auditable run records with next/start/log/finish lifecycle, success/failure
  state, JSON output, and MCP tools
- high-level agent draft loop with `agent next`, `agent step`, `agent draft`,
  review writeback, accepted apply, and finish smoke coverage
- Obsidian helper plugin or command palette bridge
- local search service
- optional Rust search/index acceleration only if profiling shows it is needed

## Milestone 5: Trust CI

Goal: make knowledge quality testable.

- CI-friendly doctor checks
- trust score command
- link integrity checks
- provenance coverage score
- review debt score
- drift reports
- regression fixtures for compiler behavior
