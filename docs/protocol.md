# kforge Knowledge Repo Protocol

This document defines the first working contract for a `kforge` knowledge repo.
It is intentionally plain: Markdown files, stable directories, and generated
indexes that any LLM agent or shell tool can inspect.

## Canonical Directories

### `raw/`

Original evidence goes here: articles, papers, PDFs, source captures, exported
web pages, screenshots, datasets, code snapshots, transcripts, and notes copied
from external systems.

Rules:

- preserve original content whenever possible
- keep source filenames stable
- add sidecar metadata when the source needs URL, author, date, or license info
- do not let agents silently rewrite raw evidence

`kforge source add` copies a local file into `raw/` and writes source metadata
under `raw/_meta/`. The copied source file is the citeable evidence path; the
metadata sidecar records title, original path, URL, author, date, license, and
notes when provided. Sidecar names stay distinct when raw sources share a base
name across extensions, such as `article.md` and `article.txt`.

`kforge source fetch` fetches an explicit `http` or `https` URL into `raw/` and
writes the same metadata sidecar. Text responses are stored as-is. HTML
responses are converted into simple Markdown-like text with headings and links
preserved for source inspection. This is an opt-in network ingest command; the
repo protocol does not require network access.

`kforge source fetch-list` reads a local text file of URLs and fetches them into
`raw/`. Lines may be plain URLs, Markdown links, or simple `Title | URL` rows.
Use `--dry-run` to preview the URL plan before network calls are made.

`kforge source import` copies files from a local directory into `raw/` and
writes the same metadata sidecars. It recursively imports normal files, skips
hidden paths, symlinks, and common generated directories, and refuses to import
the repo root or a kforge canonical directory. Use `--dry-run` to preview the
import plan.

Ingest commands accept `--json` for agent and script handoff. `source add
--json` returns the created `source`, `metadata`, original path, and suggested
next commands. `source fetch --json` returns the fetched URL, status,
content-type, created refs, and next commands. `source fetch-list --json`
returns `dryRun`, `counts`, and one item per URL with fetch status and created
refs. `source import --json` returns `dryRun`, `counts`, and one item per
candidate with source and metadata refs; `--dry-run --json` reports
`would_import` items without copying files.

Examples:

```bash
kforge source add . --file ~/Downloads/article.md --title "Article"
kforge source add . --file ~/Downloads/article.md --url "https://example.com/article"
kforge source add . --file ~/Downloads/article.md --json
kforge source fetch . --url "https://example.com/article" --title "Article"
kforge source fetch . --url "https://example.com/article" --json
kforge source fetch-list . --file ~/Downloads/urls.txt --dry-run
kforge source fetch-list . --file ~/Downloads/urls.txt --json
kforge source import . --dir ~/Downloads/research-folder --title-prefix "Project A" --dry-run
kforge source import . --dir ~/Downloads/research-folder --title-prefix "Project A" --dry-run --json
kforge source import . --dir ~/Downloads/research-folder --title-prefix "Project A"
kforge source list .
kforge source inspect . --file raw/article.md
```

### `wiki/`

The compiled knowledge layer goes here. These files are written for humans and
linked like an Obsidian vault.

Rules:

- each page should state what source material it depends on
- use `[[wikilinks]]` for concepts and pages
- separate facts, synthesis, and speculation
- prefer incremental edits over full rewrites

### `claims/`

Important claims go here when they need explicit traceability or review. A claim
file should answer:

- what is being asserted
- which sources support it
- what confidence level it has
- what would falsify or weaken it
- whether a human has reviewed it

### `indexes/`

Generated maps and inventories go here. These files are allowed to be rewritten
by tools.

Recommended files:

- `source-inventory.md`
- `wiki-map.md`
- `claim-index.md`
- `claim-audit.md`
- `review-index.md`
- `context.md`
- `open-questions.md`
- `backlinks.md`
- `brief.md`

### `outputs/`

Generated answers and artifacts go here: Q&A results, reports, charts, Marp
slides, notebooks, exports, and decision memos.

Outputs can later be promoted into `reviews/` with `kforge promote`, then filed
into `wiki/` or `claims/` after review.
The Web dashboard exposes the same output list, inspect, and promote flow so a
useful answer can become a review artifact without leaving the local workbench.

Example:

```bash
kforge output list .
kforge output inspect . --file outputs/answer.md
kforge promote . --file outputs/answer.md --target wiki/Answer.md --source raw/source.md
```

Automation can add `--json` to all three commands. `output list --json`
returns output counts, titles, sizes, and review refs; `output inspect --json`
returns headings, source refs, reverse refs, and suggested promotion commands;
`promote --json` returns the created review artifact and next review/apply
commands.

### `reviews/`

Proposed large edits, conflicts, and uncertain changes go here before being
merged into the compiled wiki.

Examples:

### `tasks/`

Claimable agent work items go here. Tasks are Markdown files seeded from the
current review queue so multiple agents can take separate work without stepping
on the same review artifact.

Example:

```bash
kforge task seed . --json
kforge task list . --json
kforge task claim . --agent agent-a --json
kforge task done . --task tasks/2026-05-28-example.md --note "Review handled." --json
```

Agents can also use the one-step entrypoint:

```bash
kforge task next . --agent agent-a --json
```

`task next` claims the next open task. If none exists, it seeds tasks from the
current review queue first unless `--no-seed` is passed.

Use `task release` when an agent needs to hand work back:

```bash
kforge task release . --task tasks/2026-05-28-example.md --json
```

### `runs/`

Agent execution logs go here. A run records which task an agent worked on,
whether it is still running, and whether it finished with success or failure.
Runs are append-only Markdown evidence for debugging parallel work.

Example:

```bash
kforge run next . --agent agent-a --json
kforge run start . --task tasks/2026-05-28-example.md --agent agent-a --json
kforge run log . --run runs/2026-05-28-example-agent-a.md --message "Drafted Proposed Content." --json
kforge run inspect . --run runs/2026-05-28-example-agent-a.md --json
kforge run finish . --run runs/2026-05-28-example-agent-a.md --status success --note "Review updated." --json
kforge run list . --status all --json
```

`run next` is the one-step agent entrypoint: it claims the next task, seeding
from reviews if needed, and starts the run record.
`run inspect` is the one-run status packet for agents and humans: it returns the
run metadata, linked task, log entries, and suggested next commands.

- source conflict report
- proposed concept split
- stale claim audit
- hallucination risk report
- pending article candidates

## Minimal Root Files

### `kb.yaml`

Declares that a directory follows the `kforge` protocol.

Minimal shape:

```yaml
protocol: kforge
version: 0.1
title: Untitled Knowledge Repo
language: en
directories:
  raw: raw
  wiki: wiki
  claims: claims
  indexes: indexes
  outputs: outputs
  reviews: reviews
```

`kforge doctor` verifies the protocol name, protocol version, and canonical
directory mapping. The current protocol intentionally keeps custom directory
names out of the baseline contract so humans, shell tools, and agents can share
the same repo layout.

## Refresh

`kforge refresh` is the standard handoff command after meaningful repo changes.
It regenerates canonical indexes and writes the derived reports that agents and
humans usually read first:

- `indexes/source-inventory.md`
- `indexes/wiki-map.md`
- `indexes/backlinks.md`
- `indexes/claim-index.md`
- `indexes/claim-audit.md`
- `indexes/review-index.md`
- `indexes/context.md`
- `indexes/dashboard.md`
- `indexes/obsidian.md`
- `indexes/workflow.md`
- `indexes/doctor.md`
- `indexes/score.md`

It does not call an LLM provider and does not rewrite `raw/`, `wiki/`,
`claims/`, `outputs/`, or `reviews/`.

`kforge dashboard --write` can also be run directly. It writes an
Obsidian-friendly `indexes/dashboard.md` entry point with health, work queue,
agent board, and index links.

`kforge obsidian --write` writes `indexes/obsidian.md`, a vault home note for
people opening the repo in Obsidian. It links the dashboard, workflow, indexes,
wiki home, reviews, outputs, tasks, and runs, and includes the local workbench
commands an agent or human should reach for first.
`kforge obsidian --bridge --write` writes `.obsidian/kforge/commands.md` plus a
machine-readable `.obsidian/kforge/commands.json` manifest. The bridge is a
lightweight command-palette contract that Obsidian shell-command helpers, future
plugins, or local agents can read without needing a hosted service.

`kforge web` runs a local browser dashboard over the same deterministic repo
operations. It binds to `127.0.0.1` by default and serves a health panel with
doctor messages, trust score, claim audit status, agent gaps, and next actions,
plus a file navigator for canonical repo directories. It can preview repo files
through the same inspect path checks as the CLI. Its write actions intentionally
stay narrow: save structured Proposed Content, accept or reject review artifacts,
preview review apply as a dry run, explicitly apply accepted review content,
create compile-review draft outputs and attach them back to reviews, fetch URL
sources, pasted URL lists, or local directories into `raw/`, refresh derived
indexes, bootstrap review-first work, write an agent launcher script, and append
or finish running agent runs as success or failure, optionally marking linked
tasks done on success or releasing claimed tasks back to the queue.
It can also plan multi-agent runs from the same review queue before a launcher
is generated. The apply path uses the same accepted-review checks as `kforge
review apply`.

`kforge bootstrap` is the deterministic startup pipeline for a newly ingested
research repo. It runs the review-first setup steps in order: stage queued raw
sources with `compile review`, refresh indexes and the dashboard, seed tasks
from the review queue, and optionally start one auditable run per requested
agent. It can be previewed with `--dry-run --json`. Like the lower-level
commands it composes, it does not call a model and does not write compiled
`wiki/` pages directly.

### `AGENTS.md`

Tells LLM agents how to safely read, write, compile, and review the repo.
Use `kforge agent list`, `kforge agent print`, and `kforge agent install` to
work with built-in templates for Codex-style agents, Claude Code, Cursor, and
generic local agents.

## Example Repo

`kforge demo` creates a small demo knowledge repo with:

- one raw source note
- two compiled wiki pages
- one sourced claim
- one proposed review artifact
- one example output artifact
- generated indexes and derived reports under `indexes/`

The example repo is intended for first-run exploration and documentation demos.
It is generated from the same protocol rules as a normal repo.
`kforge init --example` remains available as the lower-level equivalent.

## Page Frontmatter

Compiled wiki pages should use this frontmatter shape:

```yaml
---
title: Example Concept
status: draft
kind: concept
sources:
  - raw/example.md
confidence: medium
last_compiled: 2026-05-28
---
```

## Claim File Shape

```markdown
# Claim: Short claim title

Status: proposed
Confidence: medium
Created: 2026-05-28

## Assertion

One clear assertion.

## Sources

- `raw/source.md`

## Notes

Why the source supports the assertion, and what remains uncertain.
```

Valid claim statuses:

- `proposed`: created by a tool or agent and not yet human-reviewed
- `reviewed`: checked by a human or trusted workflow
- `deprecated`: retained for history but no longer treated as current

Valid confidence values:

- `low`
- `medium`
- `high`

Local source references should point to files inside the repo, usually under
`raw/`. External URLs are allowed, but local files are easier for deterministic
tools to verify.

Repo-local references must remain inside the repo after path normalization and
existing symlink resolution. A symlink that points outside the knowledge repo is
treated as outside-repo access.

`kforge claim audit` summarizes claim status counts, confidence counts, source
coverage, missing local source references, proposed-claim review debt,
low-confidence claims, deprecated claims, and deterministic source-drift
signals. A source-drift signal means a local source file's modification date is
newer than the claim's `Created:` date, so the claim should be reviewed again;
it is not proof that the claim is false. With `--write`, the audit saves
`indexes/claim-audit.md`; with `--json`, stdout becomes a machine-readable audit
object for CI and agent workflows.

`kforge claim review-drift` turns current source-drift warnings into `reviews/`
artifacts with `Kind: stale`. The command is idempotent for open stale reviews:
if an open stale review already targets the same claim and source, it is skipped
instead of duplicated. The generated review includes agent handoff steps,
suggested inspect/audit commands, and a fenced `## Proposed Content` claim
draft that must be checked before apply. Use `--dry-run` to preview the reviews
it would create.

## Review File Shape

````markdown
# Review: Short review title

Status: proposed
Kind: compile
Created: 2026-05-28

## Summary

What change is being proposed and why.

## Targets

- `wiki/Example.md`

## Sources

- `raw/source.md`

## Proposed Change

The exact change an agent wants to make before editing the wiki.

## Proposed Content

Optional exact replacement Markdown for a single wiki or claim target:

```markdown
---
title: Example
sources:
  - raw/source.md
---

# Example

Compiled content.
```

## Risks

Conflicts, missing evidence, uncertain synthesis, and user-facing risks.

## Verification

- [ ] Source references were checked.
- [ ] Target paths are intentional.
- [ ] The change is small enough to review.
````

Valid review statuses:

- `proposed`: waiting for review
- `accepted`: approved but not necessarily applied
- `rejected`: intentionally not applied
- `applied`: merged into the wiki, claims, indexes, or outputs

`kforge review status` updates the `Status:` field and appends a status history
entry. This gives humans and agents a small lifecycle command without giving
agents permission to silently rewrite wiki pages.

`kforge review queue` and `kforge review next` provide deterministic routing for
agents. They do not judge whether a proposed change is true. They sort review
artifacts by checkable state: broken references first, then accepted reviews
ready for dry-run/apply, then stale source-drift reviews, then ordinary
proposed reviews. For compile reviews without Proposed Content, the detail view
also prints source inspection, compile brief, and `review content --from`
commands so an agent can move from queue item to draft handoff without guessing
the next CLI step. With `--json`, both commands return machine-readable review
items with `blockers`, `nextAction`, and `suggestedCommands` for agents and
automation that should not parse Markdown tables.

`kforge review content` writes or replaces the structured `## Proposed Content`
block in an existing review. Agents can draft Markdown into `outputs/`, inspect
it, then copy it into a review with `--from`. This keeps draft generation,
review acceptance, and final apply as separate steps. `review content`,
`review status`, and `review apply` all accept `--json` so automation can read
the changed review, status transition, dry-run content, target path, and next
commands without parsing text output.

Examples:

```bash
kforge review queue . --status actionable
kforge review queue . --status actionable --json
kforge review next .
kforge review next . --json
kforge compile . --source raw/article.md --target wiki/Article.md --write
kforge review content . --file reviews/2026-05-28-compile-article.md --from outputs/article-draft.md
kforge review content . --file reviews/2026-05-28-compile-article.md --from outputs/article-draft.md --json
kforge review status . --file reviews/2026-05-28-compile-article.md --status accepted
kforge review status . --file reviews/2026-05-28-compile-article.md --status accepted --json
kforge review status . --file reviews/2026-05-28-compile-article.md --status applied --note "Merged into wiki/Article.md"
```

`kforge review apply` is intentionally narrower than the full review protocol.
It applies only accepted reviews with exactly one `wiki/` or `claims/` target
and a `## Proposed Content` fenced Markdown block. It writes that content to
the target and marks the review `applied`.

Examples:

```bash
kforge review apply . --file reviews/2026-05-28-compile-article.md --dry-run
kforge review apply . --file reviews/2026-05-28-compile-article.md --dry-run --json
kforge review apply . --file reviews/2026-05-28-compile-article.md
kforge review apply . --file reviews/2026-05-28-compile-article.md --json
```

Valid review kinds:

- `compile`: proposed wiki compilation or article update
- `conflict`: conflicting source or claim analysis
- `stale`: stale or drifted knowledge audit
- `merge`: proposed merge/split/reorganization
- `custom`: anything else

Review targets are repo-local paths. They can point at future files, but they
must not point outside the repo. Review sources can be repo-local files or
external URLs; local source files must exist.

`kforge review apply` also checks existing parent directories. If a target path
would write through a symlinked directory that resolves outside the repo, the
apply step is rejected.

## Agent Context Pack

`kforge context` produces a compact Markdown packet for LLM agents entering a
knowledge repo. It is meant to be read before deeper exploration.

The context pack includes:

- repo counts for raw sources, wiki pages, claims, reviews, and outputs
- recommended read-first files
- open review artifacts
- claim status and confidence counts
- current `kforge claim audit` result
- current `kforge doctor` result
- basic agent operating rules

By default the context pack is printed to stdout. With `--write`, it is written
to `indexes/context.md`.

## Agent Handoff

`kforge handoff` creates a compact handoff packet for an agent or human taking
over the repo. It summarizes current counts, doctor status, claim audit status,
open reviews, next moves, and suggested commands. With `--write`, it writes a
timestamped Markdown artifact under `outputs/`, because handoffs are task
artifacts rather than canonical indexes.

## Agent Workflow Runbook

`kforge workflow` produces a repo-specific runbook for the standard agent loop.
It is meant to be read after `kforge context` when an agent needs concrete next
commands instead of only a snapshot.

The workflow runbook includes:

- repo counts and open review count
- the next best move based on current repo state
- the standard agent loop from context through health checks
- copyable CLI commands using sample repo-local files when available
- filing rules for `raw/`, `wiki/`, `claims/`, `outputs/`, and `reviews/`
- review and health gates

Examples:

```bash
kforge workflow .
kforge workflow . --write
```

With `--write`, the runbook is saved to `indexes/workflow.md`.

## Agent Templates

`kforge agent` manages built-in instruction templates for agent clients. These
templates are plain Markdown files that explain the kforge repo contract to
Codex-style agents, Claude Code, Cursor, or a generic local assistant.

Examples:

```bash
kforge agent next . --agent agent-a --json
kforge agent step . --agent agent-a --json
kforge agent draft . --agent agent-a --json
kforge agent status . --agent agent-a --json
kforge agent board . --json
kforge agent reconcile . --write --json
kforge agent launch . --agent agent-a --agent agent-b --command 'codex exec --prompt {prompt}' --write --json
kforge agent finish . --agent agent-a --status success --task-done --json
kforge agent list
kforge agent print --template claude
kforge agent install . --template cursor
```

`agent next` is the high-level work entrypoint. It claims the next available
task, seeding tasks from reviews if needed, and starts an auditable run record.
`agent step` returns a deterministic work packet for the current run: the linked
task, focused read refs, suggested commands, and finish command.
`agent draft` creates a deterministic `outputs/` compile draft for the current
running review task, then returns the review writeback and run-log commands.
`agent status` shows the agent's running runs, claimed tasks, and suggested next
commands.
`agent board` shows shared multi-agent state: active agents, open tasks,
running runs, claimed tasks without runs, and running runs whose task is no
longer claimed.
`agent reconcile` is the explicit repair command for recoverable board drift. By
default it dry-runs the planned fixes; with `--write`, it releases claimed tasks
that no longer have a running run and reclaims open tasks for their existing
running run's agent. It skips missing or already-done tasks so a human or agent
can inspect those cases.
`agent launch` generates a provider-neutral shell launcher for several worker
processes. By default it plans fresh runs first; with `--no-plan`, it reuses
existing running assignments for the named agents. Command templates can use
`{agent}`, `{task}`, `{run}`, `{prompt}`, `{log}`, and `{repo}` placeholders.
With `--write`, the launcher is saved under `runs/`; with `--exec`, it is saved
and run immediately.
The Web dashboard mirrors this: Plan Runs assigns workers, auto-fills the
launcher form, and can reuse those existing planned runs when writing the
launcher script. The result links each worker's task, run, and pre-created log
file back into the Web file preview.
`agent finish` closes the current run for an agent and can mark the linked task
done with `--task-done`.
`run next` remains available as the lower-level task/run command.

Installed templates do not change durable knowledge directly. They only add or
replace client instruction files such as `AGENTS.md`, `CLAUDE.md`,
`.cursor/rules/kforge.mdc`, or `AGENT.md`.

## Wiki Graph

`kforge graph` creates a deterministic wiki graph report from Obsidian
wikilinks. It includes forward links, backlinks, orphan pages, and broken
wikilinks.

Examples:

```bash
kforge graph .
kforge graph . --write
```

With `--write`, the report is saved to `indexes/backlinks.md`. `kforge index`
also refreshes this file.

## Trust Score Reports

`kforge score` creates a compact trust report for a knowledge repo. It is a
navigation signal, not a truth guarantee.

The report includes:

- raw, wiki, claim, review, and output counts
- wiki provenance coverage
- claim provenance coverage
- review source coverage
- review target coverage
- review debt clearance
- open review debt
- current `kforge doctor` status
- a simple trust score from the available deterministic metrics

Open `proposed` or unknown-status reviews count as unresolved review debt. They
lower the trust score until they are marked `accepted`, `rejected`, or
`applied`.

Examples:

```bash
kforge score .
kforge score . --write
```

With `--write`, the report is saved to `indexes/score.md`.

## Compile Briefs

`kforge compile plan` creates a deterministic raw-to-wiki queue. It lists raw
sources that are not yet referenced by wiki page frontmatter, suggests a wiki
target path for each source, and prints copyable `kforge compile` commands.
With `--write`, it saves the queue to `indexes/compile-plan.md`. `kforge refresh`
also writes this file. With `--json`, stdout becomes a machine-readable object
with `ok`, `updatedAt`, `counts`, `queued`, `covered`, and `items`. Each item
includes `source`, `title`, `target`, `status`, `coveredBy`, and `command`.
When `--write --json` are used together, `indexes/compile-plan.md` is still
written and stdout remains JSON for CI, MCP, and agent automation.

`kforge compile review` turns queued plan items into proposed review artifacts.
It still does not call a model or write `wiki/` directly. Each review points at
one raw source and the suggested wiki target, then asks an agent or human to add
exact Proposed Content before acceptance and apply. With `--json`, stdout is a
machine-readable staging result with `ok`, `dryRun`, `updatedAt`, `counts`, and
`items`. Each item includes `source`, `title`, `target`, `action`, and, when a
review exists, `review`. `--dry-run --json` reports `would_create` items and
writes no review files; without `--dry-run`, created or skipped review artifacts
are reported after the filesystem operation.

`kforge compile draft` creates a deterministic wiki article skeleton from a
compile review or source/target pair. With `--write`, it saves the draft under
`outputs/` so an agent can fill TODOs, inspect the result, then attach it back
to the review with `kforge review content --from`. The draft includes source
metadata, source excerpts for supported text files, and the existing target
excerpt when the wiki page already exists.

With `--json`, stdout is a machine-readable draft result. Without `--write`,
it includes `content`; with `--write`, it includes `output` and `next` commands
for inspecting the output and writing it back to the review.

Reviews cannot be accepted, applied, or promoted with `--status accepted` while
their Proposed Content still contains draft markers such as `TODO` or
`outputs/<draft>.md`. `kforge doctor` and the review queue report those markers
as blockers.

Examples:

```bash
kforge compile plan .
kforge compile plan . --write
kforge compile plan . --json
kforge compile review . --dry-run
kforge compile review . --dry-run --json
kforge compile review . --limit 3
kforge bootstrap . --dry-run --json
kforge bootstrap . --agent agent-a --agent agent-b --json
kforge compile draft . --review reviews/2026-05-28-compile-article.md --write
kforge compile draft . --review reviews/2026-05-28-compile-article.md --write --json
```

`kforge compile` creates a deterministic source-to-wiki handoff packet for an
LLM agent. It does not call a model. Instead, it packages source excerpts,
target state, frontmatter expectations, operating rules, and review prompts into
a Markdown artifact.

Examples:

```bash
kforge compile . --source raw/article.md --target wiki/Article.md
kforge compile . --source raw/article.md --target wiki/Article.md --write
```

With `--write`, the compile brief is saved under `outputs/`. The expected next
step is for an agent or human to apply the draft to `wiki/`, create `claims/` or
`reviews/` when needed, then run `kforge refresh`.

## MCP Server

`kforge-mcp` exposes the same deterministic operations over stdio MCP. It is a
transport layer over the local protocol, not a model runtime. MCP clients should
still preserve `raw/`, stage broad edits in `reviews/`, and run the same health
checks as CLI workflows.

See [mcp.md](mcp.md) for tool names and client configuration.

## Deterministic Search

`kforge search` provides a small deterministic search layer for agents and
humans. It searches text-like files under these scopes:

- `raw`
- `wiki`
- `claims`
- `reviews`
- `outputs`

It does not require embeddings, a vector database, or a running model. Results
are ranked by term coverage, path matches, and text occurrences, then returned
as a Markdown table with repo-local paths and snippets.

Add `--json` when an agent, MCP client, or Web surface needs structured search
results. The JSON payload includes the query, searched scopes, limit, total
matches shown, result items with path/scope/score/snippet, and suggested inspect
commands for the top matches.

Examples:

```bash
kforge search . --query "provenance"
kforge search . --query "source references" --scope wiki --scope claims --limit 5
kforge search . --query "source references" --scope wiki --json
```

## File Inspection

`kforge inspect` gives an agent a structured entry point into one file before it
decides whether to read the whole file.

For text-like files, it reports:

- repo-local path, scope, size, and text-searchability
- title and common metadata fields
- Markdown headings
- source references
- review targets
- outgoing Obsidian wikilinks
- wiki backlinks
- local files that cite the inspected file as a source
- review files that target the inspected path

Examples:

```bash
kforge inspect . --file wiki/Provenance.md
kforge inspect . --file raw/source.md
```

Paths must stay inside the repo. Binary or unsupported file types are reported
with metadata only.

## Agent Task Packs

`kforge pack` creates a Markdown task packet for an LLM agent. It is a
provider-neutral handoff artifact, not a model call.

Task packs can include:

- the requested task
- the current agent context pack
- optional deterministic search results
- optional `kforge inspect` summaries for selected files
- operating rules for safe repo edits

Examples:

```bash
kforge pack . --task "Explain the provenance model"
kforge pack . --task "Plan an article" --query "provenance references" --file wiki/Provenance.md
kforge pack . --task "Prepare a review" --query "stale claims" --write
```

By default the pack is printed to stdout. With `--write`, it is saved under
`outputs/` so the prompt itself can become part of the knowledge repo history.

## Answer Packs

`kforge ask` creates a provider-neutral Markdown answer pack for a specific
question. It does not call a model. It gathers repo context, deterministic
search results, optional inspected files, and a draft-answer slot into one
artifact that can be saved under `outputs/`.
The Web dashboard exposes the same operation as an Ask form that writes the
answer pack directly into `outputs/`, ready for inspection and promotion.

Examples:

```bash
kforge ask . --question "How does provenance affect trust?"
kforge ask . --question "What should become a claim?" --query "claim provenance" --file wiki/Provenance.md --write
kforge ask . --question "What should become a claim?" --write --json
```

Saved answer packs can be promoted later with `kforge promote`.

Use `kforge output list` and `kforge output inspect` to decide which generated
artifacts are worth filing. Add `--json` when an agent or script needs
machine-readable output metadata, source refs, review refs, or promotion
commands.

## Deterministic Health Checks

`kforge doctor` currently checks:

- required root files and directories
- invalid `kb.yaml` protocol, version, or canonical directory mapping
- broken Obsidian `[[wikilinks]]`
- wiki pages without a `sources:` field
- stale canonical index files that should be refreshed with `kforge index`
- local source references in wiki frontmatter
- local source references in claim files
- claim files with no sources
- review targets that point outside the repo
- repo-local references that escape through symlinks
- symlinks under canonical repo directories that resolve outside the repo
- local source references in review files
- review files with no targets or sources

Missing local source references fail the check. Existing canonical index files
fail the check when their generated content no longer matches the current repo
state. Wiki pages without a `sources:` field are reported as review debt.

By default the doctor result is printed to stdout. With `--write`, it is saved
to `indexes/doctor.md` as a Markdown report for Obsidian, CI artifacts, or
agent handoff. With `--json`, stdout becomes a machine-readable object with
`ok`, `status`, `messages`, and `checkedAt` fields for CI and shell automation.

## Compilation Lifecycle

1. **Ingest**: put source material into `raw/` with `kforge source add`, `kforge source fetch`, `kforge source import`, or a manual copy.
2. **Inventory**: update `indexes/source-inventory.md`.
3. **Plan**: run `kforge compile plan` to route uncovered raw sources.
4. **Bootstrap**: optionally run `kforge bootstrap` to stage compile reviews,
   refresh indexes, seed tasks, and start agent runs from the queue.
5. **Stage Reviews**: run `kforge compile review` directly when you want the
   lower-level queueing step without task or run setup.
6. **Compile**: create or update `wiki/` pages with source-grounded synthesis.
7. **Extract Claims**: promote important assertions into `claims/`.
8. **Review**: put risky changes or unresolved conflicts into `reviews/`.
9. **Query**: answer questions using `raw/`, `wiki/`, `claims/`, and `indexes/`.
10. **File Output**: save useful answers into `outputs/`, then run
   `kforge promote` to stage durable knowledge as a review before filing it
   into `wiki/` or `claims/`.
11. **Doctor**: run health checks for structure, links, sources, and review debt.

## Non-Goals

- The protocol does not require a vector database.
- The protocol does not require a specific model provider.
- The protocol does not require Obsidian, though it is designed to work well
  with Obsidian.
- The protocol does not require fully automatic writes. Review-first workflows
  are preferred for large changes.
