# Examples

These examples show the intended `kforge` loop: collect evidence, ask questions,
file useful outputs, and keep the durable wiki and claims reviewable.

## Demo Repo

Browse `examples/demo-repo/` in this repository for a small complete knowledge
repo. It is generated from the same built-in example as `kforge demo`
and includes raw evidence, wiki pages, a claim, a review, an output, and
generated indexes.

To regenerate it after changing example behavior:

```bash
npm run demo:sync
```

## Ten-Minute Agent Draft Walkthrough

This is the fastest end-to-end path for understanding what makes `kforge`
different from chat-with-docs or a RAG app. The useful result is not a chat
answer. The result is changed repo state: a task, a run log, a draft output, a
review, an applied wiki page, refreshed indexes, and a clean doctor check.

Create a disposable demo repo:

```bash
kforge demo ./kforge-demo
cd ./kforge-demo
```

Check the starting point:

```bash
kforge review queue . --json
```

Expected shape:

```json
{
  "ok": true,
  "counts": { "items": 1 },
  "next": { "file": "reviews/demo-compile-provenance.md" }
}
```

Let an agent claim the next review-backed task and start an auditable run:

```bash
kforge agent next . --agent local-agent --json
```

Expected shape:

```json
{
  "ok": true,
  "task": {
    "file": "tasks/...",
    "status": "claimed",
    "owner": "local-agent",
    "source": "reviews/demo-compile-provenance.md"
  },
  "run": {
    "file": "runs/...",
    "status": "running",
    "agent": "local-agent"
  }
}
```

Read the work packet that an LLM agent would use:

```bash
kforge agent step . --agent local-agent --json
```

Expected shape:

```json
{
  "ok": true,
  "started": false,
  "read": ["runs/...", "tasks/...", "reviews/demo-compile-provenance.md"],
  "commands": ["kforge agent draft ..."],
  "finish": ["kforge agent finish ..."]
}
```

Generate the editable draft output:

```bash
kforge agent draft . --agent local-agent --json
```

Expected shape:

```json
{
  "ok": true,
  "draft": {
    "written": true,
    "review": "reviews/demo-compile-provenance.md",
    "output": "outputs/<date>-provenance-draft.md"
  },
  "next": ["kforge output inspect ...", "kforge review content ..."]
}
```

Inspect the draft:

```bash
kforge output inspect . --file outputs/<date>-provenance-draft.md
```

The draft intentionally contains TODO markers. Replace them with sourced
content before accepting the review. For a quick local smoke run, overwrite the
draft with a tiny sourced page:

```bash
cat > outputs/<date>-provenance-draft.md <<'EOF'
---
title: Provenance
status: published
kind: concept
sources:
  - raw/llm-knowledge-bases.md
confidence: medium
---

# Provenance

Provenance is the evidence trail that lets a compiled knowledge repo stay
auditable. In this demo, the raw source stays under `raw/`, the proposed wiki
change is reviewed under `reviews/`, and the accepted content lands in `wiki/`.

## Evidence

- `raw/llm-knowledge-bases.md`: describes compiling raw sources into a wiki and
  filing outputs back into the knowledge base.
EOF
```

Use the exact output path printed by `agent draft`; the `<date>` placeholder is
the current local date in `YYYY-MM-DD` format.

Attach the edited draft to the review:

```bash
kforge review content . \
  --file reviews/demo-compile-provenance.md \
  --from outputs/<date>-provenance-draft.md \
  --json
```

Accept and apply the review:

```bash
kforge review status . \
  --file reviews/demo-compile-provenance.md \
  --status accepted \
  --note "Checked source path and proposed content." \
  --json

kforge review apply . \
  --file reviews/demo-compile-provenance.md \
  --json
```

Finish the agent run:

```bash
kforge agent finish . \
  --agent local-agent \
  --status success \
  --task-done \
  --note "Filed reviewed draft." \
  --json
```

Refresh derived state and verify health:

```bash
kforge refresh .
kforge doctor . --json
kforge score .
```

Files changed by the loop:

```text
tasks/       task claimed and marked done
runs/        auditable local-agent run log
outputs/     editable provenance draft
reviews/     Proposed Content accepted and applied
wiki/        applied Provenance page
indexes/     refreshed maps, workflow, health, and score reports
```

That is the core product bet: useful agent work accumulates as plain Markdown
repo state, with provenance and review gates, instead of disappearing into a
chat transcript.

## End-to-End Research Loop

Create a repo:

```bash
kforge init ./my-topic
```

Create a ready-to-browse demo repo instead:

```bash
kforge demo ./my-demo
```

Add a local source file:

```bash
kforge source add ./my-topic \
  --file ~/Downloads/article.md \
  --title "Important Article" \
  --url "https://example.com/article"
```

Or fetch a text or HTML web source directly:

```bash
kforge source fetch ./my-topic \
  --url "https://example.com/article" \
  --title "Important Article"
```

Or fetch a list of web sources:

```bash
kforge source fetch-list ./my-topic \
  --file ~/Downloads/urls.txt \
  --dry-run

kforge source fetch-list ./my-topic \
  --file ~/Downloads/urls.txt
```

Or import a whole local research folder:

```bash
kforge source import ./my-topic \
  --dir ~/Downloads/research-folder \
  --title-prefix "Important Article Set" \
  --dry-run

kforge source import ./my-topic \
  --dir ~/Downloads/research-folder \
  --title-prefix "Important Article Set"
```

For automation, append `--json` to source ingest commands to capture the raw
source refs, metadata refs, and fetched response metadata for the next tool
call.

Index and inspect the source:

```bash
kforge refresh ./my-topic
kforge workflow ./my-topic
kforge source list ./my-topic
kforge source inspect ./my-topic --file raw/important-article.md
kforge compile plan ./my-topic
kforge compile review ./my-topic --limit 3
```

Or use the startup pipeline after ingest:

```bash
kforge bootstrap ./my-topic --dry-run --json

kforge bootstrap ./my-topic \
  --agent agent-a \
  --agent agent-b \
  --json
```

`bootstrap` stages queued sources as compile reviews, refreshes the repo
dashboard, seeds tasks, and starts optional agent runs. It deliberately stops
before writing `wiki/`; drafts still need to be attached to reviews, accepted,
and applied.

Ask a question and save an answer pack:

```bash
kforge ask ./my-topic \
  --question "What are the durable claims in this source?" \
  --query "claims evidence" \
  --file raw/important-article.md \
  --write
```

Inspect generated outputs:

```bash
kforge output list ./my-topic
kforge output inspect ./my-topic --file outputs/2026-05-28-what-are-the-durable-claims-in-this-source-answer-pack.md
```

Promote the output into a reviewable wiki update:

```bash
kforge promote ./my-topic \
  --file outputs/2026-05-28-what-are-the-durable-claims-in-this-source-answer-pack.md \
  --target wiki/Important Article.md \
  --source raw/important-article.md \
  --title "Promote important article notes"
```

Use the review queue to decide what an agent should handle first:

```bash
kforge review queue ./my-topic
kforge review next ./my-topic
```

When there are several actionable reviews, plan independent work for multiple
agents in one pass:

```bash
kforge agent plan ./my-topic \
  --agent agent-a \
  --agent agent-b \
  --agent agent-c \
  --json
```

`agent plan` seeds review-backed tasks if needed, claims different open tasks
for each assigned agent, starts one run per assignment, and returns the focused
`agent step` command each worker should run next. Agents that could not be
assigned are listed under `unassignedAgents`.

Inspect the shared board while agents are working:

```bash
kforge agent board ./my-topic
```

The board highlights active agents, open tasks, claimed tasks without running
runs, and running runs whose task is no longer claimed.

For compile reviews, `kforge review next` shows the source, target, compile
draft, and Proposed Content writeback commands to run next. The draft carries
source metadata, source excerpts, and existing target context when available.
Draft TODOs must be replaced before the review can be accepted or applied.
Accepted output promotion follows the same rule.

After reviewing the artifact, accept and apply it:

```bash
kforge review content ./my-topic \
  --file reviews/2026-05-28-promote-important-article-notes.md \
  --from outputs/important-article-draft.md

kforge review status ./my-topic \
  --file reviews/2026-05-28-promote-important-article-notes.md \
  --status accepted \
  --note "Checked source path and proposed content."

kforge review apply ./my-topic \
  --file reviews/2026-05-28-promote-important-article-notes.md
```

Regenerate indexes and check health:

```bash
kforge refresh ./my-topic
```

## Compile Brief Flow

When you want an LLM agent to draft a wiki page from source evidence, create a
compile brief:

```bash
kforge compile ./my-topic \
  --source raw/important-article.md \
  --target wiki/Important Article.md \
  --write
```

The brief is saved under `outputs/`. Use `kforge output inspect` to review it,
then promote it into a review artifact when it contains useful durable content.

## MCP Client

Expose a knowledge repo to an MCP-capable agent:

```bash
kforge-mcp ./my-topic
```

The MCP server exposes the same deterministic operations as the CLI, including
refresh, source inspection, workflow runbooks, search, ask, output inspection,
promotion, claim audits, reviews, doctor, and scoring.

## TypeScript API

`kforge` can also be used as an ESM package:

```ts
import { askRepo, initRepo, scoreRepo, workflowRepo } from "kforge";

const repoPath = "/tmp/my-topic";

initRepo(repoPath);

const answerPack = askRepo(repoPath, {
  question: "What should I read first?",
  write: true,
});

const workflow = workflowRepo(repoPath);
console.log(workflow.messages.join("\n"));

if (!answerPack.ok) {
  throw new Error(answerPack.messages.join("\n"));
}

const score = scoreRepo(repoPath);
console.log(score.messages.join("\n"));
```

The API is the same deterministic core used by the CLI and MCP server.
