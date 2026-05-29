#!/usr/bin/env node

import { fileURLToPath } from "node:url";
import { realpathSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import * as z from "zod/v4";
import { VERSION } from "./version.js";
import {
  addSource,
  agentBoard,
  agentDraft,
  agentFinish,
  agentLaunch,
  agentPlan,
  agentReconcile,
  agentStatus,
  agentStep,
  auditClaims,
  askRepo,
  applyReview,
  bootstrapRepo,
  claimTask,
  compileDraftRepo,
  compilePlanRepo,
  compileReviewRepo,
  compileRepo,
  completeTask,
  contextRepo,
  createClaim,
  createReview,
  dashboardRepo,
  demoRepo,
  doctorRepo,
  fetchSource,
  fetchSources,
  finishRun,
  graphRepo,
  handoffRepo,
  indexRepo,
  initRepo,
  importSources,
  installAgentTemplate,
  inspectRepo,
  inspectOutput,
  inspectRun,
  inspectSource,
  listAgentTemplates,
  listOutputs,
  listRuns,
  listSources,
  logRun,
  nextRun,
  nextTask,
  obsidianRepo,
  packRepo,
  printAgentTemplate,
  promoteOutput,
  releaseTask,
  refreshRepo,
  reviewClaimDrift,
  reviewNext,
  reviewQueue,
  searchRepo,
  scoreRepo,
  seedTasks,
  startRun,
  taskList,
  updateReviewContent,
  updateReviewStatus,
  workflowRepo,
  type AgentTemplateKind,
  type CommandResult,
  type RunStatusFilter,
  type SearchScope,
  type TaskStatusFilter,
} from "./repo.js";

interface McpOptions {
  defaultRepoPath?: string;
}

type ToolTextResult = {
  content: [{ type: "text"; text: string }];
  isError?: true;
};

const scopeSchema = z.enum(["raw", "wiki", "claims", "reviews", "outputs"]);
const agentTemplateSchema = z.enum(["agents", "claude", "cursor", "generic"]);
const taskStatusSchema = z.enum(["open", "claimed", "done", "all"]);
const runStatusSchema = z.enum(["running", "success", "failure", "all"]);
const repoPathSchema = z.string().optional().describe("Path to a kforge repo. Defaults to the server repo path.");

export function createKforgeMcpServer(options: McpOptions = {}): McpServer {
  const defaultRepoPath = resolveRepoPath(options.defaultRepoPath ?? process.cwd());
  const server = new McpServer({
    name: "kforge",
    version: VERSION,
  });

  server.registerTool(
    "kforge_init",
    {
      title: "Initialize kforge repo",
      description: "Create the canonical kforge knowledge repo layout.",
      inputSchema: z.object({
        path: repoPathSchema,
        force: z.boolean().optional(),
        example: z.boolean().optional(),
      }),
    },
    async ({ path: repoPath, force, example }) =>
      runAsTool(() => initRepo(toolRepoPath(defaultRepoPath, repoPath), { force, example })),
  );

  server.registerTool(
    "kforge_demo",
    {
      title: "Create demo repo",
      description: "Create a ready-to-browse example kforge knowledge repo.",
      inputSchema: z.object({
        path: repoPathSchema,
        force: z.boolean().optional(),
      }),
    },
    async ({ path: repoPath, force }) =>
      runAsTool(() => demoRepo(toolRepoPath(defaultRepoPath, repoPath ?? "kforge-demo"), { force })),
  );

  server.registerTool(
    "kforge_index",
    {
      title: "Index kforge repo",
      description: "Regenerate deterministic indexes for raw, wiki, claims, and reviews.",
      inputSchema: z.object({
        path: repoPathSchema,
      }),
    },
    async ({ path: repoPath }) => runAsTool(() => indexRepo(toolRepoPath(defaultRepoPath, repoPath))),
  );

  server.registerTool(
    "kforge_bootstrap",
    {
      title: "Bootstrap research workflow",
      description: "Stage queued sources into compile reviews, seed tasks, and optionally assign agent runs.",
      inputSchema: z.object({
        path: repoPathSchema,
        agents: z.array(z.string().min(1)).optional(),
        limit: z.number().int().positive().optional(),
        dryRun: z.boolean().optional(),
        note: z.string().optional(),
        json: z.boolean().optional(),
      }),
    },
    async ({ path: repoPath, agents, limit, dryRun, note, json }) =>
      runAsTool(() =>
        bootstrapRepo(toolRepoPath(defaultRepoPath, repoPath), {
          agents,
          limit,
          dryRun,
          note,
          json,
        }),
      ),
  );

  server.registerTool(
    "kforge_refresh",
    {
      title: "Refresh derived artifacts",
      description: "Regenerate indexes, context, workflow, doctor, and score reports for a kforge repo.",
      inputSchema: z.object({
        path: repoPathSchema,
      }),
    },
    async ({ path: repoPath }) => runAsTool(() => refreshRepo(toolRepoPath(defaultRepoPath, repoPath))),
  );

  server.registerTool(
    "kforge_source_add",
    {
      title: "Add raw source",
      description: "Copy a local file into raw/ and create a source metadata sidecar.",
      inputSchema: z.object({
        path: repoPathSchema,
        file: z.string().min(1),
        title: z.string().optional(),
        url: z.string().optional(),
        author: z.string().optional(),
        date: z.string().optional(),
        license: z.string().optional(),
        note: z.string().optional(),
        json: z.boolean().optional(),
      }),
    },
    async ({ path: repoPath, file, title, url, author, date, license, note, json }) =>
      runAsTool(() =>
        addSource(toolRepoPath(defaultRepoPath, repoPath), {
          file,
          title,
          url,
          author,
          date,
          license,
          note,
          json,
        }),
      ),
  );

  server.registerTool(
    "kforge_source_import",
    {
      title: "Import source directory",
      description: "Copy files from a local directory into raw/ and create source metadata sidecars.",
      inputSchema: z.object({
        path: repoPathSchema,
        dir: z.string().min(1),
        titlePrefix: z.string().optional(),
        url: z.string().optional(),
        author: z.string().optional(),
        date: z.string().optional(),
        license: z.string().optional(),
        note: z.string().optional(),
        dryRun: z.boolean().optional(),
        json: z.boolean().optional(),
      }),
    },
    async ({ path: repoPath, dir, titlePrefix, url, author, date, license, note, dryRun, json }) =>
      runAsTool(() =>
        importSources(toolRepoPath(defaultRepoPath, repoPath), {
          dir,
          titlePrefix,
          url,
          author,
          date,
          license,
          note,
          dryRun,
          json,
        }),
      ),
  );

  server.registerTool(
    "kforge_source_fetch",
    {
      title: "Fetch URL source",
      description: "Fetch a text or HTML URL into raw/ and create a source metadata sidecar.",
      inputSchema: z.object({
        path: repoPathSchema,
        url: z.string().min(1),
        title: z.string().optional(),
        author: z.string().optional(),
        date: z.string().optional(),
        license: z.string().optional(),
        note: z.string().optional(),
        json: z.boolean().optional(),
      }),
    },
    async ({ path: repoPath, url, title, author, date, license, note, json }) =>
      runAsTool(() =>
        fetchSource(toolRepoPath(defaultRepoPath, repoPath), {
          url,
          title,
          author,
          date,
          license,
          note,
          json,
        }),
      ),
  );

  server.registerTool(
    "kforge_source_fetch_list",
    {
      title: "Fetch URL source list",
      description: "Fetch URLs listed in a local text file into raw/ and create source metadata sidecars.",
      inputSchema: z.object({
        path: repoPathSchema,
        file: z.string().min(1),
        titlePrefix: z.string().optional(),
        author: z.string().optional(),
        date: z.string().optional(),
        license: z.string().optional(),
        note: z.string().optional(),
        dryRun: z.boolean().optional(),
        json: z.boolean().optional(),
      }),
    },
    async ({ path: repoPath, file, titlePrefix, author, date, license, note, dryRun, json }) =>
      runAsTool(() =>
        fetchSources(toolRepoPath(defaultRepoPath, repoPath), {
          file,
          titlePrefix,
          author,
          date,
          license,
          note,
          dryRun,
          json,
        }),
      ),
  );

  server.registerTool(
    "kforge_source_list",
    {
      title: "List raw sources",
      description: "List raw source files with available metadata sidecars.",
      inputSchema: z.object({
        path: repoPathSchema,
      }),
    },
    async ({ path: repoPath }) => runAsTool(() => listSources(toolRepoPath(defaultRepoPath, repoPath))),
  );

  server.registerTool(
    "kforge_source_inspect",
    {
      title: "Inspect raw source",
      description: "Inspect one raw source file, its metadata sidecar, and local references.",
      inputSchema: z.object({
        path: repoPathSchema,
        file: z.string().min(1),
      }),
    },
    async ({ path: repoPath, file }) =>
      runAsTool(() => inspectSource(toolRepoPath(defaultRepoPath, repoPath), { file })),
  );

  server.registerTool(
    "kforge_context",
    {
      title: "Read agent context",
      description: "Return the compact kforge agent context pack.",
      inputSchema: z.object({
        path: repoPathSchema,
        write: z.boolean().optional(),
      }),
    },
    async ({ path: repoPath, write }) =>
      runAsTool(() => contextRepo(toolRepoPath(defaultRepoPath, repoPath), { write })),
  );

  server.registerTool(
    "kforge_dashboard",
    {
      title: "Read knowledge dashboard",
      description: "Return or write an Obsidian-friendly repo dashboard with health, queue, agent, and index links.",
      inputSchema: z.object({
        path: repoPathSchema,
        write: z.boolean().optional(),
        json: z.boolean().optional(),
      }),
    },
    async ({ path: repoPath, write, json }) =>
      runAsTool(() => dashboardRepo(toolRepoPath(defaultRepoPath, repoPath), { write, json })),
  );

  server.registerTool(
    "kforge_obsidian",
    {
      title: "Read Obsidian entry",
      description: "Return or write an Obsidian vault entry note linking dashboard, workflow, indexes, reviews, outputs, tasks, and runs.",
      inputSchema: z.object({
        path: repoPathSchema,
        write: z.boolean().optional(),
      }),
    },
    async ({ path: repoPath, write }) =>
      runAsTool(() => obsidianRepo(toolRepoPath(defaultRepoPath, repoPath), { write })),
  );

  server.registerTool(
    "kforge_graph",
    {
      title: "Read wiki graph",
      description: "Return or write the wiki backlinks, orphan pages, and broken wikilinks report.",
      inputSchema: z.object({
        path: repoPathSchema,
        write: z.boolean().optional(),
      }),
    },
    async ({ path: repoPath, write }) =>
      runAsTool(() => graphRepo(toolRepoPath(defaultRepoPath, repoPath), { write })),
  );

  server.registerTool(
    "kforge_handoff",
    {
      title: "Read agent handoff",
      description: "Return or write a compact agent handoff packet with health, audit, and next moves.",
      inputSchema: z.object({
        path: repoPathSchema,
        write: z.boolean().optional(),
      }),
    },
    async ({ path: repoPath, write }) =>
      runAsTool(() => handoffRepo(toolRepoPath(defaultRepoPath, repoPath), { write })),
  );

  server.registerTool(
    "kforge_workflow",
    {
      title: "Read agent workflow",
      description: "Return or write the recommended kforge agent workflow runbook for the current repo.",
      inputSchema: z.object({
        path: repoPathSchema,
        write: z.boolean().optional(),
      }),
    },
    async ({ path: repoPath, write }) =>
      runAsTool(() => workflowRepo(toolRepoPath(defaultRepoPath, repoPath), { write })),
  );

  server.registerTool(
    "kforge_agent_templates",
    {
      title: "List agent templates",
      description: "List deterministic kforge agent instruction templates for Codex, Claude Code, Cursor, and generic agents.",
      inputSchema: z.object({}),
    },
    async () => runAsTool(() => listAgentTemplates()),
  );

  server.registerTool(
    "kforge_agent_template_print",
    {
      title: "Print agent template",
      description: "Return one kforge agent instruction template as Markdown.",
      inputSchema: z.object({
        template: agentTemplateSchema.optional(),
      }),
    },
    async ({ template }) => runAsTool(() => printAgentTemplate((template ?? "agents") as AgentTemplateKind)),
  );

  server.registerTool(
    "kforge_agent_template_install",
    {
      title: "Install agent template",
      description: "Install one kforge agent instruction template into the local knowledge repo.",
      inputSchema: z.object({
        path: repoPathSchema,
        template: agentTemplateSchema.optional(),
        force: z.boolean().optional(),
      }),
    },
    async ({ path: repoPath, template, force }) =>
      runAsTool(() =>
        installAgentTemplate(toolRepoPath(defaultRepoPath, repoPath), {
          kind: (template ?? "agents") as AgentTemplateKind,
          force,
        }),
      ),
  );

  server.registerTool(
    "kforge_agent_next",
    {
      title: "Start next agent run",
      description: "High-level agent entrypoint: seed tasks if needed, claim the next task, and start an auditable run.",
      inputSchema: z.object({
        path: repoPathSchema,
        agent: z.string().min(1),
        seed: z.boolean().optional(),
        limit: z.number().int().positive().optional(),
        note: z.string().optional(),
        json: z.boolean().optional(),
      }),
    },
    async ({ path: repoPath, agent, seed, limit, note, json }) =>
      runAsTool(() => nextRun(toolRepoPath(defaultRepoPath, repoPath), { agent, seed, limit, note, json })),
  );

  server.registerTool(
    "kforge_agent_status",
    {
      title: "Read agent status",
      description: "Summarize running runs, claimed tasks, and suggested next commands for one agent.",
      inputSchema: z.object({
        path: repoPathSchema,
        agent: z.string().min(1),
        json: z.boolean().optional(),
      }),
    },
    async ({ path: repoPath, agent, json }) =>
      runAsTool(() => agentStatus(toolRepoPath(defaultRepoPath, repoPath), { agent, json })),
  );

  server.registerTool(
    "kforge_agent_board",
    {
      title: "Read agent board",
      description: "Summarize active agents, running runs, claimed tasks, open tasks, and coordination gaps.",
      inputSchema: z.object({
        path: repoPathSchema,
        json: z.boolean().optional(),
      }),
    },
    async ({ path: repoPath, json }) =>
      runAsTool(() => agentBoard(toolRepoPath(defaultRepoPath, repoPath), { json })),
  );

  server.registerTool(
    "kforge_agent_reconcile",
    {
      title: "Reconcile agent board",
      description: "Dry-run or apply recoverable fixes for orphan claimed tasks and running runs whose tasks are not claimed.",
      inputSchema: z.object({
        path: repoPathSchema,
        write: z.boolean().optional(),
        note: z.string().optional(),
        json: z.boolean().optional(),
      }),
    },
    async ({ path: repoPath, write, note, json }) =>
      runAsTool(() => agentReconcile(toolRepoPath(defaultRepoPath, repoPath), { write, note, json })),
  );

  server.registerTool(
    "kforge_agent_plan",
    {
      title: "Plan parallel agent runs",
      description: "Assign independent tasks and start auditable runs for multiple agents in one deterministic pass.",
      inputSchema: z.object({
        path: repoPathSchema,
        agents: z.array(z.string().min(1)).min(1),
        seed: z.boolean().optional(),
        limit: z.number().int().positive().optional(),
        note: z.string().optional(),
        json: z.boolean().optional(),
      }),
    },
    async ({ path: repoPath, agents, seed, limit, note, json }) =>
      runAsTool(() => agentPlan(toolRepoPath(defaultRepoPath, repoPath), { agents, seed, limit, note, json })),
  );

  server.registerTool(
    "kforge_agent_launch",
    {
      title: "Launch parallel agent workers",
      description: "Generate, write, or execute a shell launcher for multiple agent workers from planned or existing runs.",
      inputSchema: z.object({
        path: repoPathSchema,
        agents: z.array(z.string().min(1)).min(1),
        command: z.string().optional(),
        limit: z.number().int().positive().optional(),
        note: z.string().optional(),
        noPlan: z.boolean().optional(),
        write: z.boolean().optional(),
        exec: z.boolean().optional(),
        json: z.boolean().optional(),
      }),
    },
    async ({ path: repoPath, agents, command, limit, note, noPlan, write, exec, json }) =>
      runAsTool(() => agentLaunch(toolRepoPath(defaultRepoPath, repoPath), { agents, command, limit, note, noPlan, write, exec, json })),
  );

  server.registerTool(
    "kforge_agent_step",
    {
      title: "Read agent step packet",
      description: "Return one deterministic work packet for an agent, starting a run if needed.",
      inputSchema: z.object({
        path: repoPathSchema,
        agent: z.string().min(1),
        seed: z.boolean().optional(),
        limit: z.number().int().positive().optional(),
        note: z.string().optional(),
        json: z.boolean().optional(),
      }),
    },
    async ({ path: repoPath, agent, seed, limit, note, json }) =>
      runAsTool(() => agentStep(toolRepoPath(defaultRepoPath, repoPath), { agent, seed, limit, note, json })),
  );

  server.registerTool(
    "kforge_agent_draft",
    {
      title: "Create agent draft",
      description: "Create a compile draft output for one agent's current review task.",
      inputSchema: z.object({
        path: repoPathSchema,
        agent: z.string().min(1),
        run: z.string().optional(),
        json: z.boolean().optional(),
      }),
    },
    async ({ path: repoPath, agent, run, json }) =>
      runAsTool(() => agentDraft(toolRepoPath(defaultRepoPath, repoPath), { agent, run, json })),
  );

  server.registerTool(
    "kforge_agent_finish",
    {
      title: "Finish agent run",
      description: "Finish one agent's current running run and optionally mark its task done.",
      inputSchema: z.object({
        path: repoPathSchema,
        agent: z.string().min(1),
        run: z.string().optional(),
        status: z.enum(["success", "failure"]).optional(),
        note: z.string().optional(),
        taskDone: z.boolean().optional(),
        json: z.boolean().optional(),
      }),
    },
    async ({ path: repoPath, agent, run, status, note, taskDone, json }) =>
      runAsTool(() =>
        agentFinish(toolRepoPath(defaultRepoPath, repoPath), {
          agent,
          run,
          status: status ?? "success",
          note,
          taskDone,
          json,
        }),
      ),
  );

  server.registerTool(
    "kforge_search",
    {
      title: "Search kforge repo",
      description: "Run deterministic text search across kforge repo scopes.",
      inputSchema: z.object({
        path: repoPathSchema,
        query: z.string().min(1),
        scopes: z.array(scopeSchema).optional(),
        limit: z.number().int().positive().optional(),
        json: z.boolean().optional(),
      }),
    },
    async ({ path: repoPath, query, scopes, limit, json }) =>
      runAsTool(() =>
        searchRepo(toolRepoPath(defaultRepoPath, repoPath), {
          query,
          scopes: scopes as SearchScope[] | undefined,
          limit,
          json,
        }),
      ),
  );

  server.registerTool(
    "kforge_ask",
    {
      title: "Create answer pack",
      description: "Create a provider-neutral answer pack for a question using repo context, search, and optional file inspection.",
      inputSchema: z.object({
        path: repoPathSchema,
        question: z.string().min(1),
        query: z.string().optional(),
        files: z.array(z.string().min(1)).optional(),
        scopes: z.array(scopeSchema).optional(),
        limit: z.number().int().positive().optional(),
        write: z.boolean().optional(),
      }),
    },
    async ({ path: repoPath, question, query, files, scopes, limit, write }) =>
      runAsTool(() =>
        askRepo(toolRepoPath(defaultRepoPath, repoPath), {
          question,
          query,
          files,
          scopes: scopes as SearchScope[] | undefined,
          limit,
          write,
        }),
      ),
  );

  server.registerTool(
    "kforge_output_list",
    {
      title: "List outputs",
      description: "List generated outputs and whether review artifacts reference them.",
      inputSchema: z.object({
        path: repoPathSchema,
        json: z.boolean().optional(),
      }),
    },
    async ({ path: repoPath, json }) => runAsTool(() => listOutputs(toolRepoPath(defaultRepoPath, repoPath), { json })),
  );

  server.registerTool(
    "kforge_output_inspect",
    {
      title: "Inspect output",
      description: "Inspect one outputs/ artifact and show promotion guidance.",
      inputSchema: z.object({
        path: repoPathSchema,
        file: z.string().min(1),
        json: z.boolean().optional(),
      }),
    },
    async ({ path: repoPath, file, json }) =>
      runAsTool(() => inspectOutput(toolRepoPath(defaultRepoPath, repoPath), { file, json })),
  );

  server.registerTool(
    "kforge_inspect",
    {
      title: "Inspect repo file",
      description: "Inspect one repo-local file before reading it in full.",
      inputSchema: z.object({
        path: repoPathSchema,
        file: z.string().min(1),
      }),
    },
    async ({ path: repoPath, file }) =>
      runAsTool(() => inspectRepo(toolRepoPath(defaultRepoPath, repoPath), { file })),
  );

  server.registerTool(
    "kforge_compile",
    {
      title: "Create compile brief",
      description: "Create a deterministic source-to-wiki compile brief for LLM handoff.",
      inputSchema: z.object({
        path: repoPathSchema,
        sources: z.array(z.string().min(1)).min(1),
        target: z.string().min(1),
        title: z.string().optional(),
        write: z.boolean().optional(),
      }),
    },
    async ({ path: repoPath, sources, target, title, write }) =>
      runAsTool(() =>
        compileRepo(toolRepoPath(defaultRepoPath, repoPath), {
          sources,
          target,
          title,
          write,
        }),
      ),
  );

  server.registerTool(
    "kforge_compile_plan",
    {
      title: "Read compile plan",
      description: "Return or write a deterministic raw-to-wiki compile queue.",
      inputSchema: z.object({
        path: repoPathSchema,
        write: z.boolean().optional(),
        json: z.boolean().optional(),
      }),
    },
    async ({ path: repoPath, write, json }) =>
      runAsTool(() => compilePlanRepo(toolRepoPath(defaultRepoPath, repoPath), { write, json })),
  );

  server.registerTool(
    "kforge_compile_review",
    {
      title: "Create compile reviews",
      description: "Create proposed review artifacts from queued raw-to-wiki compile plan items.",
      inputSchema: z.object({
        path: repoPathSchema,
        limit: z.number().int().positive().optional(),
        dryRun: z.boolean().optional(),
        json: z.boolean().optional(),
      }),
    },
    async ({ path: repoPath, limit, dryRun, json }) =>
      runAsTool(() => compileReviewRepo(toolRepoPath(defaultRepoPath, repoPath), { limit, dryRun, json })),
  );

  server.registerTool(
    "kforge_compile_draft",
    {
      title: "Create compile draft",
      description: "Create or write a wiki draft template from a compile review or source/target pair.",
      inputSchema: z.object({
        path: repoPathSchema,
        review: z.string().optional(),
        sources: z.array(z.string().min(1)).optional(),
        target: z.string().optional(),
        title: z.string().optional(),
        write: z.boolean().optional(),
        json: z.boolean().optional(),
      }),
    },
    async ({ path: repoPath, review, sources, target, title, write, json }) =>
      runAsTool(() =>
        compileDraftRepo(toolRepoPath(defaultRepoPath, repoPath), {
          review,
          sources,
          target,
          title,
          write,
          json,
        }),
      ),
  );

  server.registerTool(
    "kforge_pack",
    {
      title: "Create task pack",
      description: "Create an agent task pack using context, optional search, and optional file inspection.",
      inputSchema: z.object({
        path: repoPathSchema,
        task: z.string().min(1),
        query: z.string().optional(),
        files: z.array(z.string().min(1)).optional(),
        scopes: z.array(scopeSchema).optional(),
        limit: z.number().int().positive().optional(),
        write: z.boolean().optional(),
      }),
    },
    async ({ path: repoPath, task, query, files, scopes, limit, write }) =>
      runAsTool(() =>
        packRepo(toolRepoPath(defaultRepoPath, repoPath), {
          task,
          query,
          files,
          scopes: scopes as SearchScope[] | undefined,
          limit,
          write,
        }),
      ),
  );

  server.registerTool(
    "kforge_promote_output",
    {
      title: "Promote output",
      description: "Promote an outputs/ Markdown artifact into a review artifact for wiki or claim filing.",
      inputSchema: z.object({
        path: repoPathSchema,
        file: z.string().min(1),
        target: z.string().min(1),
        sources: z.array(z.string().min(1)).optional(),
        title: z.string().optional(),
        summary: z.string().optional(),
        status: z.enum(["proposed", "accepted", "rejected"]).optional(),
        json: z.boolean().optional(),
      }),
    },
    async ({ path: repoPath, file, target, sources, title, summary, status, json }) =>
      runAsTool(() =>
        promoteOutput(toolRepoPath(defaultRepoPath, repoPath), {
          file,
          target,
          sources,
          title,
          summary,
          status,
          json,
        }),
      ),
  );

  server.registerTool(
    "kforge_claim_new",
    {
      title: "Create claim",
      description: "Create a sourced claim artifact.",
      inputSchema: z.object({
        path: repoPathSchema,
        title: z.string().min(1),
        sources: z.array(z.string().min(1)).min(1),
        assertion: z.string().optional(),
        confidence: z.enum(["low", "medium", "high"]).optional(),
        status: z.enum(["proposed", "reviewed", "deprecated"]).optional(),
      }),
    },
    async ({ path: repoPath, title, sources, assertion, confidence, status }) =>
      runAsTool(() =>
        createClaim(toolRepoPath(defaultRepoPath, repoPath), {
          title,
          sources,
          assertion,
          confidence,
          status,
        }),
      ),
  );

  server.registerTool(
    "kforge_claim_audit",
    {
      title: "Audit claims",
      description: "Audit claim provenance, status, confidence, and review debt.",
      inputSchema: z.object({
        path: repoPathSchema,
        write: z.boolean().optional(),
        json: z.boolean().optional(),
      }),
    },
    async ({ path: repoPath, write, json }) =>
      runAsTool(() => auditClaims(toolRepoPath(defaultRepoPath, repoPath), { write, json })),
  );

  server.registerTool(
    "kforge_claim_review_drift",
    {
      title: "Review claim drift",
      description: "Create stale review artifacts for claim source-drift warnings.",
      inputSchema: z.object({
        path: repoPathSchema,
        dryRun: z.boolean().optional(),
      }),
    },
    async ({ path: repoPath, dryRun }) =>
      runAsTool(() => reviewClaimDrift(toolRepoPath(defaultRepoPath, repoPath), { dryRun })),
  );

  server.registerTool(
    "kforge_review_new",
    {
      title: "Create review",
      description: "Create a review artifact for proposed broad, risky, or uncertain edits.",
      inputSchema: z.object({
        path: repoPathSchema,
        title: z.string().min(1),
        targets: z.array(z.string().min(1)).min(1),
        sources: z.array(z.string().min(1)).min(1),
        summary: z.string().optional(),
        content: z.string().optional(),
        kind: z.enum(["compile", "conflict", "stale", "merge", "custom"]).optional(),
        status: z.enum(["proposed", "accepted", "rejected", "applied"]).optional(),
      }),
    },
    async ({ path: repoPath, title, targets, sources, summary, content, kind, status }) =>
      runAsTool(() =>
        createReview(toolRepoPath(defaultRepoPath, repoPath), {
          title,
          targets,
          sources,
          summary,
          content,
          kind,
          status,
        }),
      ),
  );

  server.registerTool(
    "kforge_review_queue",
    {
      title: "List review queue",
      description: "List prioritized actionable review work for the repo.",
      inputSchema: z.object({
        path: repoPathSchema,
        limit: z.number().int().positive().optional(),
        status: z.enum(["actionable", "open", "accepted", "all"]).optional(),
        json: z.boolean().optional(),
      }),
    },
    async ({ path: repoPath, limit, status, json }) =>
      runAsTool(() =>
        reviewQueue(toolRepoPath(defaultRepoPath, repoPath), {
          limit,
          status,
          json,
        }),
      ),
  );

  server.registerTool(
    "kforge_review_next",
    {
      title: "Read next review",
      description: "Return the next actionable review with suggested commands.",
      inputSchema: z.object({
        path: repoPathSchema,
        json: z.boolean().optional(),
      }),
    },
    async ({ path: repoPath, json }) => runAsTool(() => reviewNext(toolRepoPath(defaultRepoPath, repoPath), { json })),
  );

  server.registerTool(
    "kforge_task_seed",
    {
      title: "Seed tasks",
      description: "Create task artifacts from the current review queue for parallel agents.",
      inputSchema: z.object({
        path: repoPathSchema,
        limit: z.number().int().positive().optional(),
        json: z.boolean().optional(),
      }),
    },
    async ({ path: repoPath, limit, json }) =>
      runAsTool(() => seedTasks(toolRepoPath(defaultRepoPath, repoPath), { limit, json })),
  );

  server.registerTool(
    "kforge_task_list",
    {
      title: "List tasks",
      description: "List open, claimed, done, or all parallel agent tasks.",
      inputSchema: z.object({
        path: repoPathSchema,
        status: taskStatusSchema.optional(),
        json: z.boolean().optional(),
      }),
    },
    async ({ path: repoPath, status, json }) =>
      runAsTool(() =>
        taskList(toolRepoPath(defaultRepoPath, repoPath), {
          status: status as TaskStatusFilter | undefined,
          json,
        }),
      ),
  );

  server.registerTool(
    "kforge_task_claim",
    {
      title: "Claim task",
      description: "Claim the next open task or a selected task for one agent.",
      inputSchema: z.object({
        path: repoPathSchema,
        task: z.string().optional(),
        agent: z.string().min(1),
        json: z.boolean().optional(),
      }),
    },
    async ({ path: repoPath, task, agent, json }) =>
      runAsTool(() => claimTask(toolRepoPath(defaultRepoPath, repoPath), { task, agent, json })),
  );

  server.registerTool(
    "kforge_task_next",
    {
      title: "Claim next task",
      description: "Seed tasks if needed, then claim the next open task for an agent.",
      inputSchema: z.object({
        path: repoPathSchema,
        agent: z.string().min(1),
        seed: z.boolean().optional(),
        limit: z.number().int().positive().optional(),
        json: z.boolean().optional(),
      }),
    },
    async ({ path: repoPath, agent, seed, limit, json }) =>
      runAsTool(() => nextTask(toolRepoPath(defaultRepoPath, repoPath), { agent, seed, limit, json })),
  );

  server.registerTool(
    "kforge_task_done",
    {
      title: "Complete task",
      description: "Mark a task as done after the agent finishes the associated review work.",
      inputSchema: z.object({
        path: repoPathSchema,
        task: z.string().min(1),
        note: z.string().optional(),
        json: z.boolean().optional(),
      }),
    },
    async ({ path: repoPath, task, note, json }) =>
      runAsTool(() => completeTask(toolRepoPath(defaultRepoPath, repoPath), { task, note, json })),
  );

  server.registerTool(
    "kforge_task_release",
    {
      title: "Release task",
      description: "Release a claimed task so another agent can pick it up.",
      inputSchema: z.object({
        path: repoPathSchema,
        task: z.string().min(1),
        note: z.string().optional(),
        json: z.boolean().optional(),
      }),
    },
    async ({ path: repoPath, task, note, json }) =>
      runAsTool(() => releaseTask(toolRepoPath(defaultRepoPath, repoPath), { task, note, json })),
  );

  server.registerTool(
    "kforge_run_start",
    {
      title: "Start run",
      description: "Start an auditable agent run for a claimed task.",
      inputSchema: z.object({
        path: repoPathSchema,
        task: z.string().min(1),
        agent: z.string().min(1),
        note: z.string().optional(),
        json: z.boolean().optional(),
      }),
    },
    async ({ path: repoPath, task, agent, note, json }) =>
      runAsTool(() => startRun(toolRepoPath(defaultRepoPath, repoPath), { task, agent, note, json })),
  );

  server.registerTool(
    "kforge_run_next",
    {
      title: "Start next run",
      description: "Seed tasks if needed, claim the next task, and start an auditable run.",
      inputSchema: z.object({
        path: repoPathSchema,
        agent: z.string().min(1),
        seed: z.boolean().optional(),
        limit: z.number().int().positive().optional(),
        note: z.string().optional(),
        json: z.boolean().optional(),
      }),
    },
    async ({ path: repoPath, agent, seed, limit, note, json }) =>
      runAsTool(() => nextRun(toolRepoPath(defaultRepoPath, repoPath), { agent, seed, limit, note, json })),
  );

  server.registerTool(
    "kforge_run_list",
    {
      title: "List runs",
      description: "List running, successful, failed, or all agent runs.",
      inputSchema: z.object({
        path: repoPathSchema,
        status: runStatusSchema.optional(),
        json: z.boolean().optional(),
      }),
    },
    async ({ path: repoPath, status, json }) =>
      runAsTool(() =>
        listRuns(toolRepoPath(defaultRepoPath, repoPath), {
          status: status as RunStatusFilter | undefined,
          json,
        }),
      ),
  );

  server.registerTool(
    "kforge_run_inspect",
    {
      title: "Inspect run",
      description: "Inspect one auditable agent run with its task, logs, and suggested next commands.",
      inputSchema: z.object({
        path: repoPathSchema,
        run: z.string().min(1),
        json: z.boolean().optional(),
      }),
    },
    async ({ path: repoPath, run, json }) =>
      runAsTool(() => inspectRun(toolRepoPath(defaultRepoPath, repoPath), { run, json })),
  );

  server.registerTool(
    "kforge_run_log",
    {
      title: "Log run",
      description: "Append a log entry to a running agent run.",
      inputSchema: z.object({
        path: repoPathSchema,
        run: z.string().min(1),
        message: z.string().min(1),
        json: z.boolean().optional(),
      }),
    },
    async ({ path: repoPath, run, message, json }) =>
      runAsTool(() => logRun(toolRepoPath(defaultRepoPath, repoPath), { run, message, json })),
  );

  server.registerTool(
    "kforge_run_finish",
    {
      title: "Finish run",
      description: "Mark a running agent run as success or failure.",
      inputSchema: z.object({
        path: repoPathSchema,
        run: z.string().min(1),
        status: z.enum(["success", "failure"]),
        note: z.string().optional(),
        json: z.boolean().optional(),
      }),
    },
    async ({ path: repoPath, run, status, note, json }) =>
      runAsTool(() => finishRun(toolRepoPath(defaultRepoPath, repoPath), { run, status, note, json })),
  );

  server.registerTool(
    "kforge_review_status",
    {
      title: "Update review status",
      description: "Mark a review artifact as proposed, accepted, rejected, or applied.",
      inputSchema: z.object({
        path: repoPathSchema,
        file: z.string().min(1),
        status: z.enum(["proposed", "accepted", "rejected", "applied"]),
        note: z.string().optional(),
        json: z.boolean().optional(),
      }),
    },
    async ({ path: repoPath, file, status, note, json }) =>
      runAsTool(() =>
        updateReviewStatus(toolRepoPath(defaultRepoPath, repoPath), {
          file,
          status,
          note,
          json,
        }),
      ),
  );

  server.registerTool(
    "kforge_review_content",
    {
      title: "Update review content",
      description: "Write or replace the structured Proposed Content block in a review artifact.",
      inputSchema: z.object({
        path: repoPathSchema,
        file: z.string().min(1),
        content: z.string().optional(),
        from: z.string().optional(),
        json: z.boolean().optional(),
      }),
    },
    async ({ path: repoPath, file, content, from, json }) =>
      runAsTool(() =>
        updateReviewContent(toolRepoPath(defaultRepoPath, repoPath), {
          file,
          content,
          from,
          json,
        }),
      ),
  );

  server.registerTool(
    "kforge_review_apply",
    {
      title: "Apply accepted review",
      description: "Apply accepted structured proposed content from a review artifact to its wiki or claim target.",
      inputSchema: z.object({
        path: repoPathSchema,
        file: z.string().min(1),
        dryRun: z.boolean().optional(),
        note: z.string().optional(),
        json: z.boolean().optional(),
      }),
    },
    async ({ path: repoPath, file, dryRun, note, json }) =>
      runAsTool(() =>
        applyReview(toolRepoPath(defaultRepoPath, repoPath), {
          file,
          dryRun,
          note,
          json,
        }),
      ),
  );

  server.registerTool(
    "kforge_doctor",
    {
      title: "Run doctor",
      description: "Run deterministic health checks for a kforge repo.",
      inputSchema: z.object({
        path: repoPathSchema,
        write: z.boolean().optional(),
      }),
    },
    async ({ path: repoPath, write }) =>
      runAsTool(() => doctorRepo(toolRepoPath(defaultRepoPath, repoPath), { write })),
  );

  server.registerTool(
    "kforge_score",
    {
      title: "Read trust score",
      description: "Return or write the kforge trust score report.",
      inputSchema: z.object({
        path: repoPathSchema,
        write: z.boolean().optional(),
      }),
    },
    async ({ path: repoPath, write }) =>
      runAsTool(() => scoreRepo(toolRepoPath(defaultRepoPath, repoPath), { write })),
  );

  return server;
}

export async function runMcpServer(argv: string[] = process.argv.slice(2)): Promise<void> {
  if (argv.includes("--help") || argv.includes("-h")) {
    console.log(`kforge-mcp ${VERSION}

Usage:
  kforge-mcp [repo-path]

Runs a stdio MCP server exposing kforge repo tools. The optional repo path is
used as the default path when tool calls omit their own path argument.
`);
    return;
  }

  const repoPath = argv.find((arg) => !arg.startsWith("-"));
  const server = createKforgeMcpServer({ defaultRepoPath: repoPath });
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

async function runAsTool(action: () => CommandResult | Promise<CommandResult>): Promise<ToolTextResult> {
  try {
    return commandResultToTool(await action());
  } catch (error) {
    return {
      content: [{ type: "text", text: error instanceof Error ? error.message : String(error) }],
      isError: true,
    };
  }
}

function commandResultToTool(result: CommandResult): ToolTextResult {
  return {
    content: [{ type: "text", text: result.messages.join("\n") }],
    ...(result.ok ? {} : { isError: true as const }),
  };
}

function toolRepoPath(defaultRepoPath: string, repoPath: string | undefined): string {
  return resolveRepoPath(repoPath ?? defaultRepoPath);
}

function resolveRepoPath(input: string): string {
  const expanded = input === "~" ? homedir() : input.replace(/^~\//, `${homedir()}/`);
  return path.resolve(expanded);
}

function isEntrypoint(): boolean {
  const entrypoint = process.argv[1];
  if (!entrypoint) {
    return false;
  }

  const modulePath = fileURLToPath(import.meta.url);
  const argvPath = path.resolve(entrypoint);
  try {
    return realpathSync(modulePath) === realpathSync(argvPath);
  } catch {
    return modulePath === argvPath;
  }
}

if (isEntrypoint()) {
  runMcpServer().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
