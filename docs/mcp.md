# MCP Server

`kforge-mcp` exposes a kforge knowledge repo as a stdio MCP server. It is a thin
wrapper over the deterministic TypeScript API and does not call an LLM provider.

## Run

From a linked checkout:

```bash
kforge-mcp ~/research/my-topic
```

The optional path becomes the default repo path for tool calls. Each tool also
accepts a `path` argument when an agent needs to operate on a different repo.

## Example Client Config

```json
{
  "mcpServers": {
    "kforge": {
      "command": "kforge-mcp",
      "args": ["/absolute/path/to/kforge-repo"]
    }
  }
}
```

## Tools

- `kforge_init`: create the canonical repo layout
- `kforge_demo`: create a ready-to-browse example repo
- `kforge_index`: regenerate deterministic indexes
- `kforge_bootstrap`: stage queued raw sources into compile reviews, refresh
  deterministic repo status, seed tasks, and optionally start auditable agent
  runs; it does not write compiled wiki pages directly
- `kforge_refresh`: regenerate indexes and write context, dashboard,
  Obsidian entry, workflow, doctor, and score reports
- `kforge_source_add`: copy a local source into `raw/` with metadata; pass
  `json: true` for the same machine-readable ingest payload as
  `kforge source add --json`
- `kforge_source_fetch`: fetch a text or HTML URL into `raw/` with metadata;
  pass `json: true` for fetched status, content type, and created refs
- `kforge_source_fetch_list`: fetch URLs from a local text file into `raw/`;
  pass `json: true` for dry-run/fetch counts and per-URL refs or errors
- `kforge_source_import`: copy a local source directory into `raw/` with
  metadata; pass `json: true` for dry-run/import counts and per-file refs
- `kforge_source_list`: list raw sources and metadata sidecars
- `kforge_source_inspect`: inspect one raw source, metadata, and local references
- `kforge_context`: read or write the agent context pack
- `kforge_dashboard`: read or write an Obsidian-friendly repo dashboard with
  health, work queue, agent state, and index links
- `kforge_obsidian`: read or write an Obsidian vault entry note, or set
  `bridge` to create the command bridge note and JSON manifest under
  `.obsidian/kforge/`
- `kforge_handoff`: read or write an agent handoff packet
- `kforge_workflow`: read or write the agent workflow runbook
- `kforge_agent_templates`: list installable agent instruction templates
- `kforge_agent_template_print`: print one agent instruction template
- `kforge_agent_template_install`: install one agent instruction template
- `kforge_agent_next`: high-level agent entrypoint that seeds tasks if needed,
  claims the next task, and starts an auditable run
- `kforge_agent_step`: return one deterministic work packet for an agent,
  starting a run if needed
- `kforge_agent_draft`: write a compile draft output for one agent's current
  review task; set `json` for the output ref and writeback commands
- `kforge_agent_status`: summarize running runs, claimed tasks, and next
  commands for one agent
- `kforge_agent_board`: summarize active agents, running runs, claimed tasks,
  open tasks, and coordination gaps
- `kforge_agent_reconcile`: dry-run or apply recoverable coordination fixes for
  orphan claimed tasks and running runs whose tasks are not claimed
- `kforge_agent_plan`: assign independent review-backed tasks and start
  auditable runs for multiple agents in one deterministic pass
- `kforge_agent_launch`: generate, write, or execute a provider-neutral shell
  launcher for multiple planned or existing agent runs
- `kforge_agent_finish`: finish one agent's current run and optionally mark the
  linked task done
- `kforge_graph`: read or write the wiki backlinks and orphan report
- `kforge_search`: search local repo text; set `json` for structured
  path/scope/score/snippet results
- `kforge_inspect`: inspect one repo-local file
- `kforge_compile`: create a source-to-wiki compile brief
- `kforge_compile_plan`: read or write the raw-to-wiki compile queue; set
  `json` for structured counts, queued items, covered items, and commands
- `kforge_compile_review`: create proposed compile review artifacts from queued
  raw sources; set `json` for the same structured staging payload as CLI stdout
- `kforge_compile_draft`: create or write a wiki draft template for a compile
  review; set `json` for structured `content`/`output` and next commands
- `kforge_ask`: create a question-focused answer pack; set `json` for the
  output ref/content and next commands
- `kforge_pack`: create a broader agent task pack
- `kforge_output_list`: list generated outputs; set `json` for structured
  output counts, titles, sizes, and review refs
- `kforge_output_inspect`: inspect one generated output; set `json` for
  structured headings, source refs, reverse refs, and suggested commands
- `kforge_promote_output`: promote an output into a review artifact; set
  `json` for the created review ref, source refs, status, and next commands
- `kforge_claim_new`: create a sourced claim artifact
- `kforge_claim_audit`: audit claim provenance, status, confidence, and review debt
- `kforge_claim_review_drift`: create stale review artifacts for source drift
  warnings; set `json` for created/skipped counts and review refs
- `kforge_review_new`: create a review artifact
- `kforge_review_queue`: list prioritized actionable review work; set `json`
  for structured `items`, `next`, blockers, and suggested commands
- `kforge_review_next`: return the next actionable review with suggested
  commands; set `json` for a structured payload
- `kforge_task_seed`: create task artifacts from the current review queue; set
  `json` for created/skipped task refs and next commands
- `kforge_task_list`: list open, claimed, done, or all parallel agent tasks;
  set `json` for structured task refs, owners, sources, and commands
- `kforge_task_claim`: claim the next or selected task for an agent; set
  `json` for the task payload and next commands
- `kforge_task_next`: seed tasks if needed, then claim the next open task for
  an agent; set `json` for seed counts, the claimed task, and next commands
- `kforge_task_done`: mark a task done after the associated review work is
  complete; set `json` for the updated task payload
- `kforge_task_release`: release a claimed task for another agent; set `json`
  for the updated task payload
- `kforge_run_start`: start an auditable agent run for a task; set `json` for
  the run ref and next log/finish commands
- `kforge_run_next`: seed tasks if needed, claim the next task, and start a
  run; set `json` for seed counts, task refs, run refs, and next commands
- `kforge_run_list`: list running, successful, failed, or all agent runs; set
  `json` for structured run refs, agents, tasks, status, and log counts
- `kforge_run_inspect`: inspect one agent run with its linked task, log entries,
  and suggested next commands; set `json` for a structured status packet
- `kforge_run_log`: append a log entry to a running agent run; set `json` for
  the updated run payload
- `kforge_run_finish`: mark a run as success or failure; set `json` for the
  updated run payload and next commands
- `kforge_review_content`: update a review Proposed Content block; set `json`
  for structured review/source/next-command output
- `kforge_review_status`: update a review artifact lifecycle status; set
  `json` for structured status transitions
- `kforge_review_apply`: apply accepted structured review content to a wiki or
  claim target; set `json` for dry-run content or applied target output
- `kforge_doctor`: run structural health checks and optionally write `indexes/doctor.md`
- `kforge_score`: read or write the trust score report

## Safety Model

The MCP server follows the same rules as the CLI:

- `raw/` is evidence and should not be silently rewritten
- source metadata is written under `raw/_meta/`
- repo-local paths are rejected if they resolve outside the repo through `..`
  traversal or symlinks
- `kforge_doctor` reports symlinks under canonical repo directories that resolve
  outside the repo
- broad wiki changes should be staged through `reviews/`
- review apply only writes accepted, single-target wiki or claim reviews with structured
  Proposed Content
- durable assertions should go into `claims/`
- generated context, Obsidian entry, workflow, score, compile, answer, and task
  packs are Markdown artifacts
- agent instruction templates are plain Markdown files installed into the repo
- agents should run `kforge_refresh` after meaningful changes
