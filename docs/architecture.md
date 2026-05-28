# Architecture

`kforge` is a filesystem protocol plus a deterministic CLI. It does not call an
LLM by itself. Instead, it gives humans and agents a shared contract for
maintaining a local-first Markdown knowledge repo.

The implementation stack is TypeScript on Node.js. Rust can be introduced later
as an optional native acceleration layer for measured performance hotspots, but
the default CLI and MCP server should remain TypeScript and should not require a
Rust toolchain. Python is not part of the implementation stack.

This is enforced as a project invariant, not just a preference. The package
ships a stack check that rejects Python implementation files, Python packaging
manifests, and npm scripts that invoke Python tooling. A knowledge repo can still
store Python files under `raw/` as source evidence.

## Core Idea

```text
raw evidence -> compiled wiki -> claims/reviews/outputs -> indexes/context
```

Humans collect source material. Agents compile, inspect, search, propose, and
audit changes through repo-local files.

## Directories

```text
raw/        original evidence; agents should not silently rewrite it
wiki/       compiled Markdown pages intended for human reading
claims/     durable assertions with explicit source references
reviews/    proposed broad/risky edits before they touch wiki pages
outputs/    task packs, answers, reports, charts, slides, and other artifacts
indexes/    generated maps and agent context files
```

## Command Layers

### Repo Contract

- `kforge init`
- `kforge init --example`
- `kforge demo`
- `kforge source add`
- `kforge source import`
- `kforge source list`
- `kforge source inspect`
- `kforge index`
- `kforge doctor`
- `kforge score`

These commands make the repo concrete and checkable.

### Agent Entry

- `kforge context`
- `kforge handoff`
- `kforge workflow`
- `kforge agent`
- `kforge graph`
- `kforge search`
- `kforge inspect`
- `kforge compile`
- `kforge ask`
- `kforge pack`
- `kforge promote`

These commands help an agent enter a repo without reading everything.
Agent templates install client-specific instruction files such as `AGENTS.md`,
`CLAUDE.md`, and `.cursor/rules/kforge.mdc` while keeping the repo protocol
plain Markdown.

### Trust Artifacts

- `kforge claim new`
- `kforge claim audit`
- `kforge claim review-drift`
- `kforge review queue`
- `kforge review next`
- `kforge review new`
- `kforge review status`
- `kforge review apply`

These commands separate durable facts from proposed changes.
Review status changes are explicit lifecycle events; they do not silently apply
wiki edits.
Review apply is deliberately constrained to accepted, single-target wiki edits
with structured proposed content.

### MCP Bridge

- `kforge-mcp`

The MCP server exposes the same deterministic operations to agent clients over
stdio. It is intentionally a thin wrapper around the CLI API, so behavior stays
aligned between humans, scripts, and LLM tools.

## Trust Model

`kforge` treats unsupported synthesis as review debt.

The CLI can deterministically check:

- required directories and root files
- broken Obsidian wikilinks
- wiki source references
- claim source references
- review source references
- review target paths
- missing claim or review evidence
- claim sources that changed after the claim was created

It cannot prove that a source truly supports a claim. That remains a human or
LLM review task. The point is to make the evidence trail visible and testable.
The trust score also penalizes open review artifacts, so a repo with unresolved
proposed edits does not look healthier than it is.

## Why No Mandatory Vector Database

The base protocol is designed to work with files, Git, Obsidian, shell tools,
and any LLM agent. Vector search can be added later, but the durable state should
remain inspectable Markdown.

The deterministic search command is intentionally simple. It is a routing tool,
not a semantic retrieval engine.

## Agent Loop

Recommended loop:

```text
1. kforge context
2. kforge source add --file ... or kforge source import --dir ...
3. kforge source list
4. kforge source inspect --file ...
5. kforge graph
6. kforge search --query ...
7. kforge inspect --file ...
8. kforge compile plan
9. kforge compile review --limit ...
10. kforge review queue
11. kforge agent next --agent ...
12. kforge agent step --agent ...
13. kforge agent draft --agent ...
14. edit outputs/...-draft.md
15. kforge review content --file reviews/... --from outputs/...
16. kforge review status --file reviews/... --status accepted|rejected
17. kforge review apply --file reviews/...
18. kforge agent finish --agent ... --task-done
19. kforge ask --question ... --write
20. kforge pack --task ...
21. kforge promote --file outputs/... --target wiki/...
22. kforge refresh
23. kforge doctor
24. kforge score
```

This keeps agent work auditable and reduces broad, unreviewable rewrites.

## Future Integration Points

- Obsidian plugin or command palette bridge
- model-provider adapters for compile and ask workflows
- optional vector index for larger repos
- CI reports for provenance coverage and review debt
