# Five-Minute Tutorial

This tutorial walks through the smallest useful `kforge` loop:

1. create a local knowledge repo,
2. inspect what an agent would see,
3. let an agent claim one review-backed task,
4. generate and edit a draft under `outputs/`,
5. write the draft back into a review,
6. apply the accepted review back into `wiki/`.

Everything here runs through the deterministic TypeScript CLI. It does not
require Python, a hosted LLM provider, a vector database, or network access.
Rust can be added later as an optional acceleration layer for measured
hotspots, but it is not part of the baseline flow.

## 1. Create a Demo Repo

```bash
kforge demo ./kforge-demo
cd ./kforge-demo
```

The demo repo contains:

- `raw/llm-knowledge-bases.md`: source evidence
- `wiki/`: compiled Markdown pages
- `claims/`: durable assertions with source links
- `outputs/`: generated task and answer packs
- `reviews/`: staged changes before they become durable knowledge
- `indexes/`: generated maps, queues, context, and health reports

## 2. See What The Agent Sees

Start with the context and workflow reports:

```bash
kforge context .
kforge workflow .
```

Then check the review queue:

```bash
kforge review queue .
kforge review next .
```

These commands are useful before handing the repo to an LLM agent because they
summarize structure, priorities, blockers, and suggested next actions.

## 3. Inspect Before Reading Everything

Search for a topic:

```bash
kforge search . --query provenance
```

Inspect a wiki page:

```bash
kforge inspect . --file wiki/Provenance.md
```

Inspect the source evidence behind it:

```bash
kforge source inspect . --file raw/llm-knowledge-bases.md
```

The goal is to let agents and humans read the smallest relevant slice first,
then expand only when needed.

## 4. Claim One Agent Task

Start the high-level agent loop:

```bash
kforge agent next . --agent local-agent --json
```

Read the current work packet:

```bash
kforge agent step . --agent local-agent --json
```

The step packet includes the linked `runs/` file, the claimed `tasks/` file,
focused read refs, suggested commands, and the finish command.

## 5. Generate A Draft Into outputs/

Create a review-backed draft output for the current agent task:

```bash
kforge agent draft . --agent local-agent --json
```

Open the `outputs/...-draft.md` file printed in the JSON payload, replace the
draft TODOs with sourced content, then attach that edited output back to the
review:

```bash
kforge review content . \
  --file reviews/demo-compile-provenance.md \
  --from outputs/<date>-provenance-draft.md
```

Use the exact review and output paths printed by `agent draft`. The draft is
only an editable artifact until you write it back into `## Proposed Content`.

## 6. Accept And Apply The Review

Mark the review accepted after checking the source and target:

```bash
kforge review status . \
  --file reviews/demo-compile-provenance.md \
  --status accepted \
  --note "Checked source and target."
```

Dry-run the apply step:

```bash
kforge review apply . \
  --file reviews/demo-compile-provenance.md \
  --dry-run
```

Then apply it:

```bash
kforge review apply . \
  --file reviews/demo-compile-provenance.md
```

Finish the run and mark the task done:

```bash
kforge agent finish . \
  --agent local-agent \
  --status success \
  --task-done \
  --note "Filed reviewed draft."
```

## 7. Ask A Question Into outputs/

Create a question-focused answer pack:

```bash
kforge ask . \
  --question "How does provenance affect trust in this repo?" \
  --query provenance \
  --file wiki/Provenance.md \
  --write
```

List outputs:

```bash
kforge output list .
```

Inspect the file shown by `kforge output list`, for example:

```bash
kforge output inspect . \
  --file outputs/<date>-how-does-provenance-affect-trust-in-this-repo-answer-pack.md
```

An answer pack is not automatically durable knowledge. It lives under
`outputs/` until you decide to promote it.

## 8. Promote Useful Output Into A Review

For a copy-pasteable path, promote the fixture output that already exists in
the demo repo:

```bash
kforge promote . \
  --file outputs/example-task-pack.md \
  --target "wiki/Demo Answer.md" \
  --source raw/llm-knowledge-bases.md \
  --title "Promote demo answer" \
  --status accepted
```

This creates a review artifact under `reviews/`. It also marks the review as
accepted so the deterministic apply command can write it into `wiki/`.

## 9. Apply The Promoted Review

Check the accepted queue:

```bash
kforge review queue . --status accepted
```

Dry-run the apply step:

```bash
kforge review apply . \
  --file reviews/<date>-promote-demo-answer.md \
  --dry-run
```

Then apply it:

```bash
kforge review apply . \
  --file reviews/<date>-promote-demo-answer.md
```

Use the exact review file printed by `kforge promote` or
`kforge review queue`. The `<date>` placeholder is the current local date in
`YYYY-MM-DD` format.

## 10. Refresh And Check

Regenerate derived artifacts:

```bash
kforge refresh .
```

Run structural health and trust checks:

```bash
kforge doctor .
kforge score .
```

Now `wiki/Demo Answer.md` exists, the review status has moved to `applied`,
and the generated indexes reflect the new state.

## What To Try Next

- Open `./kforge-demo` in Obsidian.
- Add real research sources under `raw/` with `kforge source add`.
- Use `kforge ask` and `kforge pack` to create agent handoff artifacts.
- Use `kforge promote` and `kforge review apply` before filing generated output
  into durable `wiki/` or `claims/` files.
- Run `kforge-mcp .` to expose the same local repo operations to an MCP-capable
  agent client.
