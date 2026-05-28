# Quickstart

This guide walks through the fastest way to understand `kforge`.

You can also browse `examples/demo-repo/` in this repository before running any
commands. For a copy-pasteable first loop, see the
[five-minute tutorial](tutorial.md).

## 1. Install

From npm after publication:

```bash
npm install -g kforge
kforge version
kforge-mcp --help
kforge agent list
```

From a checkout:

```bash
npm install
npm run build
npm link
```

Check the CLI:

```bash
kforge version
kforge-mcp --help
kforge agent list
```

## 2. Create a Demo Repo

```bash
kforge demo ./kforge-demo
cd ./kforge-demo
```

The demo repo contains a small source note, compiled wiki pages, one claim,
one review artifact, one output artifact, generated indexes, and derived
context, workflow, doctor, and score reports.

## 3. Inspect the Repo

Start with the dashboard and agent context:

```bash
kforge dashboard .
kforge context .
```

Create a compact handoff packet:

```bash
kforge handoff .
```

List and install agent instruction templates:

```bash
kforge agent list
kforge agent install . --template claude
kforge agent install . --template cursor
```

Read the suggested workflow for the current repo:

```bash
kforge workflow .
```

Check trust metrics:

```bash
kforge score .
```

Read wiki backlinks and orphan pages:

```bash
kforge graph .
```

Search for a topic:

```bash
kforge search . --query provenance
```

Inspect a wiki page before reading it in full:

```bash
kforge inspect . --file wiki/Provenance.md
```

Create a compile brief for an LLM agent:

```bash
kforge compile plan .
kforge compile review . --limit 1

kforge compile . \
  --source raw/llm-knowledge-bases.md \
  --target wiki/Provenance.md
```

Create a task pack for an LLM agent:

```bash
kforge pack . \
  --task "Explain how provenance works in this repo" \
  --query provenance \
  --file wiki/Provenance.md
```

Create a question-focused answer pack:

```bash
kforge ask . \
  --question "How does provenance work in this repo?" \
  --query provenance \
  --file wiki/Provenance.md \
  --write
```

Inspect generated outputs before promoting them:

```bash
kforge output list .
kforge output inspect . --file outputs/example-task-pack.md
```

Check repo health:

```bash
kforge doctor .
```

## 4. Create Your Own Repo

```bash
kforge init ./my-topic
```

Add source material under `raw/`, then index:

```bash
kforge source add ./my-topic \
  --file ~/Downloads/source.md \
  --title "Source"

kforge source fetch ./my-topic \
  --url "https://example.com/source" \
  --title "Source"

kforge source fetch-list ./my-topic \
  --file ~/Downloads/urls.txt \
  --dry-run

kforge source import ./my-topic \
  --dir ~/Downloads/research-folder \
  --title-prefix "Research" \
  --dry-run

kforge source import ./my-topic \
  --dir ~/Downloads/research-folder \
  --title-prefix "Research"

kforge source list ./my-topic
kforge source inspect ./my-topic --file raw/source.md
kforge refresh ./my-topic
kforge compile plan ./my-topic
```

Automation can append `--json` to `source add`, `source fetch`,
`source fetch-list`, or `source import` to read the created raw paths, metadata
paths, fetched response metadata, and import plan without parsing text output.

After ingest, bootstrap the review-first research loop:

```bash
kforge bootstrap ./my-topic --dry-run --json

kforge bootstrap ./my-topic \
  --agent agent-a \
  --agent agent-b \
  --json
```

`bootstrap` stages queued raw sources into compile reviews, refreshes indexes
and the dashboard, seeds review-backed tasks, and optionally starts one run per
agent. It does not write compiled wiki pages directly.

For durable assertions:

```bash
kforge claim new ./my-topic \
  --title "Important claim" \
  --source raw/source.md \
  --assertion "One clear assertion supported by the source."

kforge claim audit ./my-topic --write
kforge claim review-drift ./my-topic --dry-run
```

For broad or risky edits:

```bash
kforge compile ./my-topic \
  --source raw/source.md \
  --target wiki/Article.md \
  --write
```

When an output is ready to become durable knowledge, promote it into a review:

```bash
kforge promote ./my-topic \
  --file outputs/2026-05-28-article-compile-brief.md \
  --target wiki/Article.md \
  --source raw/source.md
```

You can also create reviews directly:

```bash
kforge review new ./my-topic \
  --title "Compile article from source" \
  --target wiki/Article.md \
  --source raw/source.md \
  --kind compile
```

List the prioritized review queue before deciding what to accept:

```bash
kforge review queue ./my-topic
kforge review next ./my-topic
```

For compile reviews, the next view includes source inspection, `compile draft`,
and `review content --from` commands. In the high-level agent loop, use
`agent next`, `agent step`, and `agent draft` to claim one review-backed task,
read the work packet, and write a wiki article skeleton into `outputs/`:

```bash
kforge agent next ./my-topic --agent local-agent --json
kforge agent step ./my-topic --agent local-agent --json
kforge agent draft ./my-topic --agent local-agent --json
```

To prepare work for several local or remote agents, plan multiple independent
runs from the same review queue:

```bash
kforge agent plan ./my-topic \
  --agent agent-a \
  --agent agent-b \
  --json
```

Each assignment gets a distinct claimed task, a `runs/` log, focused read refs,
and the next `agent step` command for that worker.

Check the shared board when several agents are active:

```bash
kforge agent board ./my-topic --json
```

The board shows active agents, open tasks, running runs, claimed tasks without
runs, and running runs whose task is no longer claimed.

The draft includes source metadata, source excerpts, and existing target
context. Edit it before attaching it back to the review.
Replace the draft TODOs before accepting; `kforge doctor` and `kforge review
queue` flag unresolved draft markers as blockers. `kforge promote --status
accepted` also refuses outputs that still contain those markers.

After checking a review, update its status:

```bash
kforge review content ./my-topic \
  --file reviews/2026-05-28-compile-article-from-source.md \
  --from outputs/article-draft.md

kforge review status ./my-topic \
  --file reviews/2026-05-28-compile-article-from-source.md \
  --status accepted \
  --note "Checked sources and target path."
```

If the accepted review contains `## Proposed Content`, apply it:

```bash
kforge review apply ./my-topic \
  --file reviews/2026-05-28-compile-article-from-source.md
```

Finish the run after the review work is filed:

```bash
kforge agent finish ./my-topic \
  --agent local-agent \
  --status success \
  --task-done \
  --note "Filed reviewed draft."
```

Before handing work back:

```bash
kforge refresh ./my-topic
```

Expose the repo to an MCP-capable agent client:

```bash
kforge-mcp ./my-topic
```

## Suggested Agent Workflow

```text
context -> workflow -> agent plan/next -> agent step -> agent draft -> review content -> apply -> finish -> refresh
```

The repo stays plain Markdown throughout the process.
