import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import http from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { initRepo } from "../src/repo.js";

test("mcp server exposes kforge tools over stdio", async () => {
  const repoPath = await mkdtemp(path.join(tmpdir(), "kforge-mcp-test-"));
  const mcpDemoRepo = path.join(path.dirname(repoPath), "kforge-mcp-demo");
  const sourcePath = path.join(await mkdtemp(path.join(tmpdir(), "kforge-mcp-source-")), "source.md");
  const webServer = await startHttpServer({
    "/mcp-note": {
      contentType: "text/html; charset=utf-8",
      body: "<html><head><title>MCP Web Note</title></head><body><h1>MCP Web Note</h1><p>Fetched by MCP.</p></body></html>",
    },
  });
  const client = new Client({ name: "kforge-test-client", version: "1.0.0" });
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [path.resolve("dist/src/mcp.js"), repoPath],
    cwd: path.resolve("."),
    stderr: "pipe",
  });

  try {
    await writeFile(sourcePath, "# MCP Source\n", "utf8");
    initRepo(repoPath, { example: true });
    await client.connect(transport);

    const tools = await client.listTools();
    assert.equal(tools.tools.some((tool) => tool.name === "kforge_demo"), true);
    assert.equal(tools.tools.some((tool) => tool.name === "kforge_source_add"), true);
    assert.equal(tools.tools.some((tool) => tool.name === "kforge_source_fetch"), true);
    assert.equal(tools.tools.some((tool) => tool.name === "kforge_source_fetch_list"), true);
    assert.equal(tools.tools.some((tool) => tool.name === "kforge_source_import"), true);
    assert.equal(tools.tools.some((tool) => tool.name === "kforge_refresh"), true);
    assert.equal(tools.tools.some((tool) => tool.name === "kforge_source_list"), true);
    assert.equal(tools.tools.some((tool) => tool.name === "kforge_source_inspect"), true);
    assert.equal(tools.tools.some((tool) => tool.name === "kforge_context"), true);
    assert.equal(tools.tools.some((tool) => tool.name === "kforge_dashboard"), true);
    assert.equal(tools.tools.some((tool) => tool.name === "kforge_graph"), true);
    assert.equal(tools.tools.some((tool) => tool.name === "kforge_handoff"), true);
    assert.equal(tools.tools.some((tool) => tool.name === "kforge_workflow"), true);
    assert.equal(tools.tools.some((tool) => tool.name === "kforge_agent_templates"), true);
    assert.equal(tools.tools.some((tool) => tool.name === "kforge_agent_template_print"), true);
    assert.equal(tools.tools.some((tool) => tool.name === "kforge_agent_template_install"), true);
    assert.equal(tools.tools.some((tool) => tool.name === "kforge_agent_next"), true);
    assert.equal(tools.tools.some((tool) => tool.name === "kforge_agent_step"), true);
    assert.equal(tools.tools.some((tool) => tool.name === "kforge_agent_draft"), true);
    assert.equal(tools.tools.some((tool) => tool.name === "kforge_agent_status"), true);
    assert.equal(tools.tools.some((tool) => tool.name === "kforge_agent_board"), true);
    assert.equal(tools.tools.some((tool) => tool.name === "kforge_agent_plan"), true);
    assert.equal(tools.tools.some((tool) => tool.name === "kforge_agent_finish"), true);
    assert.equal(tools.tools.some((tool) => tool.name === "kforge_compile"), true);
    assert.equal(tools.tools.some((tool) => tool.name === "kforge_compile_plan"), true);
    assert.equal(tools.tools.some((tool) => tool.name === "kforge_compile_review"), true);
    assert.equal(tools.tools.some((tool) => tool.name === "kforge_compile_draft"), true);
    assert.equal(tools.tools.some((tool) => tool.name === "kforge_ask"), true);
    assert.equal(tools.tools.some((tool) => tool.name === "kforge_output_list"), true);
    assert.equal(tools.tools.some((tool) => tool.name === "kforge_output_inspect"), true);
    assert.equal(tools.tools.some((tool) => tool.name === "kforge_promote_output"), true);
    assert.equal(tools.tools.some((tool) => tool.name === "kforge_claim_audit"), true);
    assert.equal(tools.tools.some((tool) => tool.name === "kforge_claim_review_drift"), true);
    assert.equal(tools.tools.some((tool) => tool.name === "kforge_review_new"), true);
    assert.equal(tools.tools.some((tool) => tool.name === "kforge_review_queue"), true);
    assert.equal(tools.tools.some((tool) => tool.name === "kforge_review_next"), true);
    assert.equal(tools.tools.some((tool) => tool.name === "kforge_task_seed"), true);
    assert.equal(tools.tools.some((tool) => tool.name === "kforge_task_list"), true);
    assert.equal(tools.tools.some((tool) => tool.name === "kforge_task_claim"), true);
    assert.equal(tools.tools.some((tool) => tool.name === "kforge_task_next"), true);
    assert.equal(tools.tools.some((tool) => tool.name === "kforge_task_done"), true);
    assert.equal(tools.tools.some((tool) => tool.name === "kforge_task_release"), true);
    assert.equal(tools.tools.some((tool) => tool.name === "kforge_run_start"), true);
    assert.equal(tools.tools.some((tool) => tool.name === "kforge_run_next"), true);
    assert.equal(tools.tools.some((tool) => tool.name === "kforge_run_list"), true);
    assert.equal(tools.tools.some((tool) => tool.name === "kforge_run_inspect"), true);
    assert.equal(tools.tools.some((tool) => tool.name === "kforge_run_log"), true);
    assert.equal(tools.tools.some((tool) => tool.name === "kforge_run_finish"), true);
    assert.equal(tools.tools.some((tool) => tool.name === "kforge_review_status"), true);
    assert.equal(tools.tools.some((tool) => tool.name === "kforge_review_content"), true);
    assert.equal(tools.tools.some((tool) => tool.name === "kforge_review_apply"), true);

    const context = await client.callTool({ name: "kforge_context", arguments: {} });
    assert.match(firstText(context.content), /# Agent Context/);

    const dashboard = await client.callTool({ name: "kforge_dashboard", arguments: {} });
    assert.match(firstText(dashboard.content), /# Knowledge Dashboard/);
    assert.match(firstText(dashboard.content), /## Next Commands/);

    const dashboardJson = await client.callTool({
      name: "kforge_dashboard",
      arguments: {
        write: true,
        json: true,
      },
    });
    assert.equal(JSON.parse(firstText(dashboardJson.content)).counts.rawSources, 1);
    assert.match(await readFile(path.join(repoPath, "indexes", "dashboard.md"), "utf8"), /# Knowledge Dashboard/);

    const demo = await client.callTool({
      name: "kforge_demo",
      arguments: {
        path: mcpDemoRepo,
      },
    });
    assert.match(firstText(demo.content), /Demo repo ready/);
    assert.match(await readFile(path.join(mcpDemoRepo, "indexes", "doctor.md"), "utf8"), /Status: clean/);

    const refresh = await client.callTool({ name: "kforge_refresh", arguments: {} });
    assert.match(firstText(refresh.content), /Refreshed derived artifacts/);
    assert.match(await readFile(path.join(repoPath, "indexes", "doctor.md"), "utf8"), /# Doctor Report/);

    const source = await client.callTool({
      name: "kforge_source_add",
      arguments: {
        file: sourcePath,
        title: "MCP Source",
      },
    });
    assert.match(firstText(source.content), /Added raw\/mcp-source.md/);
    assert.match(await readFile(path.join(repoPath, "raw", "_meta", "mcp-source.md"), "utf8"), /MCP Source/);

    const sourceJson = await client.callTool({
      name: "kforge_source_add",
      arguments: {
        file: sourcePath,
        title: "MCP Json Source",
        json: true,
      },
    });
    const sourceJsonPayload = JSON.parse(firstText(sourceJson.content)) as {
      action?: string;
      source?: string;
      metadata?: string;
      next?: string[];
    };
    assert.equal(sourceJsonPayload.action, "added");
    assert.equal(sourceJsonPayload.source, "raw/mcp-json-source.md");
    assert.equal(sourceJsonPayload.metadata, "raw/_meta/mcp-json-source.md");
    assert.match(sourceJsonPayload.next?.join("\n") ?? "", /kforge compile plan/);

    const sourceFetch = await client.callTool({
      name: "kforge_source_fetch",
      arguments: {
        url: `${webServer.url}/mcp-note`,
        json: true,
      },
    });
    const sourceFetchPayload = JSON.parse(firstText(sourceFetch.content)) as {
      action?: string;
      source?: string;
      metadata?: string;
      status?: number;
      next?: string[];
    };
    assert.equal(sourceFetchPayload.action, "fetched");
    assert.equal(sourceFetchPayload.source, "raw/mcp-web-note.md");
    assert.equal(sourceFetchPayload.metadata, "raw/_meta/mcp-web-note.md");
    assert.equal(sourceFetchPayload.status, 200);
    assert.match(sourceFetchPayload.next?.join("\n") ?? "", /kforge source inspect/);
    assert.match(await readFile(path.join(repoPath, "raw", "mcp-web-note.md"), "utf8"), /# MCP Web Note/);

    const urlListPath = path.join(path.dirname(sourcePath), "urls.txt");
    await writeFile(urlListPath, `MCP Batch | ${webServer.url}/mcp-note\n`, "utf8");
    const sourceFetchList = await client.callTool({
      name: "kforge_source_fetch_list",
      arguments: {
        file: urlListPath,
        titlePrefix: "List",
        dryRun: true,
        json: true,
      },
    });
    const sourceFetchListPayload = JSON.parse(firstText(sourceFetchList.content)) as {
      dryRun?: boolean;
      counts?: { wouldFetch?: number; fetched?: number; failed?: number };
      items?: Array<{ action?: string; title?: string }>;
    };
    assert.equal(sourceFetchListPayload.dryRun, true);
    assert.equal(sourceFetchListPayload.counts?.wouldFetch, 1);
    assert.equal(sourceFetchListPayload.counts?.fetched, 0);
    assert.equal(sourceFetchListPayload.counts?.failed, 0);
    assert.equal(sourceFetchListPayload.items?.[0]?.action, "would_fetch");
    assert.equal(sourceFetchListPayload.items?.[0]?.title, "List MCP Batch");

    const sourceList = await client.callTool({ name: "kforge_source_list", arguments: {} });
    assert.match(firstText(sourceList.content), /raw\/mcp-source.md/);

    const importDir = path.join(path.dirname(sourcePath), "bulk");
    await import("node:fs/promises").then((fs) => fs.mkdir(importDir, { recursive: true }));
    await writeFile(path.join(importDir, "Bulk.md"), "# Bulk\n", "utf8");
    const sourceImportDryRunJson = await client.callTool({
      name: "kforge_source_import",
      arguments: {
        dir: importDir,
        titlePrefix: "MCP Json",
        dryRun: true,
        json: true,
      },
    });
    const sourceImportDryRunPayload = JSON.parse(firstText(sourceImportDryRunJson.content)) as {
      dryRun?: boolean;
      counts?: { wouldImport?: number; imported?: number };
      items?: Array<{ action?: string; source?: string; metadata?: string }>;
    };
    assert.equal(sourceImportDryRunPayload.dryRun, true);
    assert.equal(sourceImportDryRunPayload.counts?.wouldImport, 1);
    assert.equal(sourceImportDryRunPayload.counts?.imported, 0);
    assert.equal(sourceImportDryRunPayload.items?.[0]?.action, "would_import");
    assert.equal(sourceImportDryRunPayload.items?.[0]?.source, "raw/mcp-json-bulk.md");
    const sourceImport = await client.callTool({
      name: "kforge_source_import",
      arguments: {
        dir: importDir,
        titlePrefix: "MCP",
      },
    });
    assert.match(firstText(sourceImport.content), /Imported 1 source file/);
    assert.match(await readFile(path.join(repoPath, "raw", "mcp-bulk.md"), "utf8"), /# Bulk/);

    const sourceImportJson = await client.callTool({
      name: "kforge_source_import",
      arguments: {
        dir: importDir,
        titlePrefix: "MCP Json",
        json: true,
      },
    });
    const sourceImportPayload = JSON.parse(firstText(sourceImportJson.content)) as {
      dryRun?: boolean;
      counts?: { imported?: number };
      items?: Array<{ action?: string; source?: string; metadata?: string }>;
    };
    assert.equal(sourceImportPayload.dryRun, false);
    assert.equal(sourceImportPayload.counts?.imported, 1);
    assert.equal(sourceImportPayload.items?.[0]?.action, "imported");
    assert.equal(sourceImportPayload.items?.[0]?.source, "raw/mcp-json-bulk.md");
    assert.equal(sourceImportPayload.items?.[0]?.metadata, "raw/_meta/mcp-json-bulk.md");

    const sourceInspect = await client.callTool({
      name: "kforge_source_inspect",
      arguments: {
        file: "raw/mcp-source.md",
      },
    });
    assert.match(firstText(sourceInspect.content), /# Source Inspect/);
    assert.match(firstText(sourceInspect.content), /raw\/_meta\/mcp-source.md/);

    const graph = await client.callTool({ name: "kforge_graph", arguments: {} });
    assert.match(firstText(graph.content), /# Wiki Graph/);

    const workflow = await client.callTool({ name: "kforge_workflow", arguments: {} });
    assert.match(firstText(workflow.content), /# Agent Workflow Runbook/);
    assert.match(firstText(workflow.content), /Standard Agent Loop/);

    const handoff = await client.callTool({ name: "kforge_handoff", arguments: {} });
    assert.match(firstText(handoff.content), /# Agent Handoff/);
    assert.match(firstText(handoff.content), /Next Moves/);

    const agentTemplates = await client.callTool({ name: "kforge_agent_templates", arguments: {} });
    assert.match(firstText(agentTemplates.content), /# Agent Templates/);
    assert.match(firstText(agentTemplates.content), /claude/);

    const printedAgentTemplate = await client.callTool({
      name: "kforge_agent_template_print",
      arguments: {
        template: "generic",
      },
    });
    assert.match(firstText(printedAgentTemplate.content), /# kforge Agent Instructions/);

    const installedAgentTemplate = await client.callTool({
      name: "kforge_agent_template_install",
      arguments: {
        template: "claude",
      },
    });
    assert.match(firstText(installedAgentTemplate.content), /CLAUDE.md/);
    assert.match(await readFile(path.join(repoPath, "CLAUDE.md"), "utf8"), /# CLAUDE.md/);

    await client.callTool({
      name: "kforge_review_new",
      arguments: {
        title: "MCP agent next",
        targets: ["wiki/MCP Agent Next.md"],
        sources: ["raw/llm-knowledge-bases.md"],
        kind: "compile",
      },
    });
    const agentNext = await client.callTool({
      name: "kforge_agent_next",
      arguments: {
        agent: "mcp-agent-next",
        note: "start agent loop",
        json: true,
      },
    });
    const agentNextPayload = JSON.parse(firstText(agentNext.content)) as {
      task?: { status?: string; owner?: string; file?: string };
      run?: { status?: string; agent?: string; task?: string; file?: string };
    };
    assert.equal(agentNextPayload.task?.status, "claimed");
    assert.equal(agentNextPayload.task?.owner, "mcp-agent-next");
    assert.equal(agentNextPayload.run?.status, "running");
    assert.equal(agentNextPayload.run?.agent, "mcp-agent-next");
    assert.equal(agentNextPayload.run?.task, agentNextPayload.task?.file);
    const agentStepResult = await client.callTool({
      name: "kforge_agent_step",
      arguments: {
        agent: "mcp-agent-next",
        json: true,
      },
    });
    const agentStepPayload = JSON.parse(firstText(agentStepResult.content)) as {
      started?: boolean;
      run?: { file?: string };
      task?: { file?: string };
      commands?: string[];
      finish?: string[];
    };
    assert.equal(agentStepPayload.started, false);
    assert.equal(agentStepPayload.run?.file, agentNextPayload.run?.file);
    assert.equal(agentStepPayload.task?.file, agentNextPayload.task?.file);
    assert.match(agentStepPayload.commands?.join("\n") ?? "", /kforge agent draft/);
    assert.match(agentStepPayload.finish?.[0] ?? "", /^kforge agent finish/);
    const agentDraftResult = await client.callTool({
      name: "kforge_agent_draft",
      arguments: {
        agent: "mcp-agent-next",
        json: true,
      },
    });
    const agentDraftPayload = JSON.parse(firstText(agentDraftResult.content)) as {
      run?: { file?: string };
      task?: { file?: string; source?: string };
      draft?: { written?: boolean; review?: string; output?: string };
      next?: string[];
    };
    assert.equal(agentDraftPayload.run?.file, agentNextPayload.run?.file);
    assert.equal(agentDraftPayload.task?.file, agentNextPayload.task?.file);
    assert.equal(agentDraftPayload.draft?.written, true);
    assert.equal(agentDraftPayload.draft?.review, agentDraftPayload.task?.source);
    assert.match(agentDraftPayload.draft?.output ?? "", /^outputs\/.*-draft.*\.md$/);
    assert.match(await readFile(path.join(repoPath, agentDraftPayload.draft?.output ?? ""), "utf8"), /## Review Notes/);
    assert.match(agentDraftPayload.next?.join("\n") ?? "", /kforge review content/);
    const agentStatusResult = await client.callTool({
      name: "kforge_agent_status",
      arguments: {
        agent: "mcp-agent-next",
        json: true,
      },
    });
    const agentStatusPayload = JSON.parse(firstText(agentStatusResult.content)) as {
      runningRuns?: Array<{ file?: string }>;
      claimedTasks?: Array<{ file?: string }>;
      next?: string[];
    };
    assert.equal(agentStatusPayload.runningRuns?.[0]?.file, agentNextPayload.run?.file);
    assert.equal(agentStatusPayload.claimedTasks?.[0]?.file, agentNextPayload.task?.file);
    assert.match(agentStatusPayload.next?.[0] ?? "", /^kforge agent step/);
    const agentFinishResult = await client.callTool({
      name: "kforge_agent_finish",
      arguments: {
        agent: "mcp-agent-next",
        status: "success",
        taskDone: true,
        note: "agent next verified",
        json: true,
      },
    });
    const agentFinishPayload = JSON.parse(firstText(agentFinishResult.content)) as {
      run?: { status?: string; file?: string };
      task?: { status?: string; file?: string };
    };
    assert.equal(agentFinishPayload.run?.status, "success");
    assert.equal(agentFinishPayload.run?.file, agentNextPayload.run?.file);
    assert.equal(agentFinishPayload.task?.status, "done");
    assert.equal(agentFinishPayload.task?.file, agentNextPayload.task?.file);

    await client.callTool({
      name: "kforge_review_new",
      arguments: {
        title: "MCP parallel one",
        targets: ["wiki/MCP Parallel One.md"],
        sources: ["raw/llm-knowledge-bases.md"],
        kind: "compile",
      },
    });
    await client.callTool({
      name: "kforge_review_new",
      arguments: {
        title: "MCP parallel two",
        targets: ["wiki/MCP Parallel Two.md"],
        sources: ["raw/llm-knowledge-bases.md"],
        kind: "compile",
      },
    });
    const agentPlanResult = await client.callTool({
      name: "kforge_agent_plan",
      arguments: {
        agents: ["mcp-plan-a", "mcp-plan-b"],
        note: "parallel plan",
        json: true,
      },
    });
    const agentPlanPayload = JSON.parse(firstText(agentPlanResult.content)) as {
      requested?: number;
      started?: number;
      assignments?: Array<{ agent?: string; task?: { file?: string; owner?: string }; run?: { file?: string; agent?: string }; commands?: string[] }>;
      unassignedAgents?: string[];
    };
    assert.equal(agentPlanPayload.requested, 2);
    assert.equal(agentPlanPayload.started, 2);
    assert.deepEqual(agentPlanPayload.unassignedAgents, []);
    assert.equal(agentPlanPayload.assignments?.[0]?.task?.owner, "mcp-plan-a");
    assert.equal(agentPlanPayload.assignments?.[1]?.run?.agent, "mcp-plan-b");
    assert.notEqual(agentPlanPayload.assignments?.[0]?.task?.file, agentPlanPayload.assignments?.[1]?.task?.file);
    assert.match(agentPlanPayload.assignments?.[0]?.commands?.join("\n") ?? "", /kforge agent draft/);
    assert.match(await readFile(path.join(repoPath, agentPlanPayload.assignments?.[0]?.run?.file ?? ""), "utf8"), /parallel plan/);

    const agentBoardResult = await client.callTool({
      name: "kforge_agent_board",
      arguments: {
        json: true,
      },
    });
    const agentBoardPayload = JSON.parse(firstText(agentBoardResult.content)) as {
      counts?: { agents?: number; runningRuns?: number; claimedTasks?: number };
      agents?: Array<{ agent?: string }>;
      next?: string[];
    };
    assert.equal((agentBoardPayload.counts?.agents ?? 0) >= 2, true);
    assert.equal((agentBoardPayload.counts?.runningRuns ?? 0) >= 2, true);
    assert.equal((agentBoardPayload.counts?.claimedTasks ?? 0) >= 2, true);
    assert.equal(agentBoardPayload.agents?.some((agent) => agent.agent === "mcp-plan-a"), true);
    assert.match(agentBoardPayload.next?.join("\n") ?? "", /task list/);

    const compile = await client.callTool({
      name: "kforge_compile",
      arguments: {
        sources: ["raw/llm-knowledge-bases.md"],
        target: "wiki/Provenance.md",
      },
    });
    assert.match(firstText(compile.content), /# Compile Brief/);
    assert.match(firstText(compile.content), /Target: `wiki\/Provenance.md`/);

    const compilePlan = await client.callTool({
      name: "kforge_compile_plan",
      arguments: {},
    });
    assert.match(firstText(compilePlan.content), /# Compile Plan/);
    assert.match(firstText(compilePlan.content), /raw\/mcp-source.md/);
    const compilePlanJson = await client.callTool({
      name: "kforge_compile_plan",
      arguments: {
        json: true,
      },
    });
    assert.equal(JSON.parse(firstText(compilePlanJson.content)).queued[0].source, "raw/mcp-bulk.md");

    const compileReviewDryRun = await client.callTool({
      name: "kforge_compile_review",
      arguments: {
        dryRun: true,
        json: true,
      },
    });
    assert.equal(JSON.parse(firstText(compileReviewDryRun.content)).items[0].action, "would_create");

    const compileReview = await client.callTool({
      name: "kforge_compile_review",
      arguments: {
        limit: 1,
        json: true,
      },
    });
    assert.equal(JSON.parse(firstText(compileReview.content)).counts.created, 1);
    assert.match(JSON.parse(firstText(compileReview.content)).items[0].review, /reviews\/.*compile-mcp-bulk\.md/);
    assert.match(await readFile(path.join(repoPath, "reviews", `${today()}-compile-mcp-bulk.md`), "utf8"), /Kind: compile/);

    const compileReviewQueue = await client.callTool({
      name: "kforge_review_queue",
      arguments: {
        limit: 1,
        status: "open",
        json: true,
      },
    });
    assert.match(JSON.parse(firstText(compileReviewQueue.content)).next.suggestedCommands.join("\n"), /kforge review content/);

    const compileDraft = await client.callTool({
      name: "kforge_compile_draft",
      arguments: {
        review: `reviews/${today()}-compile-mcp-bulk.md`,
        write: true,
      },
    });
    assert.match(firstText(compileDraft.content), /Created outputs\/.*mcp-bulk-draft.md/);
    assert.match(await readFile(path.join(repoPath, "outputs", `${today()}-mcp-bulk-draft.md`), "utf8"), /# Mcp Bulk/);
    assert.match(await readFile(path.join(repoPath, "outputs", `${today()}-mcp-bulk-draft.md`), "utf8"), /## Source Excerpts/);

    const compileDraftJson = await client.callTool({
      name: "kforge_compile_draft",
      arguments: {
        review: `reviews/${today()}-compile-mcp-bulk.md`,
        write: true,
        json: true,
      },
    });
    const compileDraftPayload = JSON.parse(firstText(compileDraftJson.content)) as {
      written?: boolean;
      output?: string;
      next?: string[];
    };
    assert.equal(compileDraftPayload.written, true);
    assert.equal(compileDraftPayload.output, `outputs/${today()}-mcp-bulk-draft-2.md`);
    assert.match(compileDraftPayload.next?.join("\n") ?? "", /kforge review content/);

    const ask = await client.callTool({
      name: "kforge_ask",
      arguments: {
        question: "How does provenance work?",
        query: "provenance",
        files: ["wiki/Provenance.md"],
      },
    });
    assert.match(firstText(ask.content), /# Answer Pack/);
    assert.match(firstText(ask.content), /Question: How does provenance work/);

    await writeFile(path.join(repoPath, "outputs", "mcp-output.md"), "# MCP Output\n", "utf8");
    const outputList = await client.callTool({ name: "kforge_output_list", arguments: {} });
    assert.match(firstText(outputList.content), /outputs\/mcp-output.md/);
    const outputListJson = await client.callTool({
      name: "kforge_output_list",
      arguments: {
        json: true,
      },
    });
    const outputListPayload = JSON.parse(firstText(outputListJson.content)) as {
      counts?: { outputs?: number };
      items?: Array<{ output?: string; title?: string }>;
    };
    assert.equal(outputListPayload.counts?.outputs, 5);
    assert.equal(outputListPayload.items?.some((item) => item.output === "outputs/mcp-output.md" && item.title === "MCP Output"), true);

    const outputInspect = await client.callTool({
      name: "kforge_output_inspect",
      arguments: {
        file: "outputs/mcp-output.md",
      },
    });
    assert.match(firstText(outputInspect.content), /# Output Inspect/);
    assert.match(firstText(outputInspect.content), /Suggested Promotion/);
    const outputInspectJson = await client.callTool({
      name: "kforge_output_inspect",
      arguments: {
        file: "outputs/mcp-output.md",
        json: true,
      },
    });
    const outputInspectPayload = JSON.parse(firstText(outputInspectJson.content)) as {
      output?: string;
      title?: string;
      searchable?: boolean;
      suggestedCommands?: string[];
    };
    assert.equal(outputInspectPayload.output, "outputs/mcp-output.md");
    assert.equal(outputInspectPayload.title, "MCP Output");
    assert.equal(outputInspectPayload.searchable, true);
    assert.match(outputInspectPayload.suggestedCommands?.join("\n") ?? "", /kforge promote/);

    const promoted = await client.callTool({
      name: "kforge_promote_output",
      arguments: {
        file: "outputs/mcp-output.md",
        target: "wiki/MCP Output.md",
        sources: ["raw/llm-knowledge-bases.md"],
        title: "MCP promote",
      },
    });
    assert.match(firstText(promoted.content), /Created reviews\/.*mcp-promote.md/);
    assert.match(
      await readFile(path.join(repoPath, "reviews", `${today()}-mcp-promote.md`), "utf8"),
      /outputs\/mcp-output.md/,
    );
    await writeFile(path.join(repoPath, "outputs", "mcp-json-output.md"), "# MCP JSON Output\n", "utf8");
    const promotedJson = await client.callTool({
      name: "kforge_promote_output",
      arguments: {
        file: "outputs/mcp-json-output.md",
        target: "wiki/MCP JSON Output.md",
        sources: ["raw/llm-knowledge-bases.md"],
        title: "MCP JSON promote",
        json: true,
      },
    });
    const promotedPayload = JSON.parse(firstText(promotedJson.content)) as {
      output?: string;
      target?: string;
      review?: string;
      status?: string;
      sources?: string[];
      next?: string[];
    };
    assert.equal(promotedPayload.output, "outputs/mcp-json-output.md");
    assert.equal(promotedPayload.target, "wiki/MCP JSON Output.md");
    assert.equal(promotedPayload.review, `reviews/${today()}-mcp-json-promote.md`);
    assert.equal(promotedPayload.status, "proposed");
    assert.deepEqual(promotedPayload.sources, ["outputs/mcp-json-output.md", "raw/llm-knowledge-bases.md"]);
    assert.match(promotedPayload.next?.join("\n") ?? "", /review status/);

    const reviewQueue = await client.callTool({ name: "kforge_review_queue", arguments: {} });
    assert.match(firstText(reviewQueue.content), /# Review Queue/);
    assert.match(firstText(reviewQueue.content), /demo-compile-provenance/);

    const reviewNext = await client.callTool({ name: "kforge_review_next", arguments: { json: true } });
    const reviewNextPayload = JSON.parse(firstText(reviewNext.content)) as {
      next: {
        file: string;
        status: string;
        suggestedCommands: string[];
      };
    };
    assert.match(reviewNextPayload.next.file, /^reviews\/.*\.md$/);
    assert.equal(reviewNextPayload.next.status, "proposed");
    assert.match(reviewNextPayload.next.suggestedCommands.join("\n"), /kforge review status/);

    const taskSeed = await client.callTool({
      name: "kforge_task_seed",
      arguments: {
        limit: 1,
        json: true,
      },
    });
    const taskSeedPayload = JSON.parse(firstText(taskSeed.content)) as {
      counts?: { created?: number };
      items?: Array<{ task?: string; source?: string }>;
    };
    const taskFile = taskSeedPayload.items?.[0]?.task ?? "";
    assert.equal(taskSeedPayload.counts?.created, 1);
    assert.match(taskFile, /^tasks\/.*\.md$/);

    const taskListJson = await client.callTool({
      name: "kforge_task_list",
      arguments: {
        json: true,
      },
    });
    assert.equal(JSON.parse(firstText(taskListJson.content)).items[0].status, "open");

    const taskClaim = await client.callTool({
      name: "kforge_task_claim",
      arguments: {
        task: taskFile,
        agent: "mcp-agent",
        json: true,
      },
    });
    assert.equal(JSON.parse(firstText(taskClaim.content)).task.owner, "mcp-agent");

    const taskRelease = await client.callTool({
      name: "kforge_task_release",
      arguments: {
        task: taskFile,
        note: "testing release",
        json: true,
      },
    });
    assert.equal(JSON.parse(firstText(taskRelease.content)).task.status, "open");

    const taskClaimAgain = await client.callTool({
      name: "kforge_task_claim",
      arguments: {
        task: taskFile,
        agent: "mcp-agent-2",
        json: true,
      },
    });
    assert.equal(JSON.parse(firstText(taskClaimAgain.content)).task.owner, "mcp-agent-2");

    const taskDone = await client.callTool({
      name: "kforge_task_done",
      arguments: {
        task: taskFile,
        note: "testing done",
        json: true,
      },
    });
    assert.equal(JSON.parse(firstText(taskDone.content)).task.status, "done");
    assert.match(await readFile(path.join(repoPath, taskFile), "utf8"), /testing done/);

    await client.callTool({
      name: "kforge_review_new",
      arguments: {
        title: "MCP next task",
        targets: ["wiki/MCP Next Task.md"],
        sources: ["raw/llm-knowledge-bases.md"],
        kind: "compile",
      },
    });
    const taskNext = await client.callTool({
      name: "kforge_task_next",
      arguments: {
        agent: "mcp-agent-3",
        json: true,
      },
    });
    const taskNextPayload = JSON.parse(firstText(taskNext.content)) as {
      seeded?: { counts?: { created?: number } };
      task?: { file?: string; status?: string; owner?: string; source?: string };
    };
    assert.equal(taskNextPayload.task?.status, "claimed");
    assert.equal(taskNextPayload.task?.owner, "mcp-agent-3");
    assert.match(taskNextPayload.task?.source ?? "", /^reviews\/.*\.md$/);

    const runStart = await client.callTool({
      name: "kforge_run_start",
      arguments: {
        task: taskNextPayload.task?.file,
        agent: "mcp-agent-3",
        note: "mcp run",
        json: true,
      },
    });
    const runStartPayload = JSON.parse(firstText(runStart.content)) as {
      run?: { file?: string; status?: string; agent?: string };
    };
    const runFile = runStartPayload.run?.file ?? "";
    assert.match(runFile, /^runs\/.*\.md$/);
    assert.equal(runStartPayload.run?.status, "running");
    assert.equal(runStartPayload.run?.agent, "mcp-agent-3");

    const runList = await client.callTool({
      name: "kforge_run_list",
      arguments: {
        json: true,
      },
    });
    assert.equal(
      JSON.parse(firstText(runList.content)).items.some((item: { file?: string }) => item.file === runFile),
      true,
    );

    const runLog = await client.callTool({
      name: "kforge_run_log",
      arguments: {
        run: runFile,
        message: "mcp logged work",
        json: true,
      },
    });
    assert.equal(JSON.parse(firstText(runLog.content)).run.logCount, 2);

    const runInspect = await client.callTool({
      name: "kforge_run_inspect",
      arguments: {
        run: runFile,
        json: true,
      },
    });
    const runInspectPayload = JSON.parse(firstText(runInspect.content)) as {
      run?: { file?: string };
      task?: { file?: string };
      logs?: Array<{ message?: string }>;
    };
    assert.equal(runInspectPayload.run?.file, runFile);
    assert.equal(runInspectPayload.task?.file, taskNextPayload.task?.file);
    assert.equal(runInspectPayload.logs?.[0]?.message, "mcp logged work");

    const runFinish = await client.callTool({
      name: "kforge_run_finish",
      arguments: {
        run: runFile,
        status: "success",
        note: "mcp done",
        json: true,
      },
    });
    assert.equal(JSON.parse(firstText(runFinish.content)).run.status, "success");
    assert.match(await readFile(path.join(repoPath, runFile), "utf8"), /mcp logged work/);

    await client.callTool({
      name: "kforge_review_new",
      arguments: {
        title: "MCP run next",
        targets: ["wiki/MCP Run Next.md"],
        sources: ["raw/llm-knowledge-bases.md"],
        kind: "compile",
      },
    });
    const runNext = await client.callTool({
      name: "kforge_run_next",
      arguments: {
        agent: "mcp-run-next",
        note: "one step",
        json: true,
      },
    });
    const runNextPayload = JSON.parse(firstText(runNext.content)) as {
      task?: { status?: string; owner?: string; file?: string };
      run?: { status?: string; agent?: string; task?: string; file?: string };
    };
    assert.equal(runNextPayload.task?.status, "claimed");
    assert.equal(runNextPayload.task?.owner, "mcp-run-next");
    assert.equal(runNextPayload.run?.status, "running");
    assert.equal(runNextPayload.run?.agent, "mcp-run-next");
    assert.equal(runNextPayload.run?.task, runNextPayload.task?.file);

    const claimAudit = await client.callTool({
      name: "kforge_claim_audit",
      arguments: {
        json: true,
      },
    });
    assert.equal(JSON.parse(firstText(claimAudit.content)).counts.claims, 1);

    const claimReviewDrift = await client.callTool({
      name: "kforge_claim_review_drift",
      arguments: {
        dryRun: true,
      },
    });
    assert.match(firstText(claimReviewDrift.content), /No source drift warnings found|Would create .* stale review/);

    const status = await client.callTool({
      name: "kforge_review_status",
      arguments: {
        file: "reviews/demo-compile-provenance.md",
        status: "accepted",
        note: "MCP smoke test accepted this review.",
      },
    });
    assert.match(firstText(status.content), /Updated reviews\/demo-compile-provenance.md: proposed -> accepted/);

    await client.callTool({
      name: "kforge_review_new",
      arguments: {
        title: "MCP apply",
        targets: ["wiki/MCP.md"],
        sources: ["raw/llm-knowledge-bases.md"],
        status: "accepted",
      },
    });
    const reviewContent = await client.callTool({
      name: "kforge_review_content",
      arguments: {
        file: `reviews/${today()}-mcp-apply.md`,
        content: "---\ntitle: MCP\nsources:\n  - raw/llm-knowledge-bases.md\n---\n# MCP\n",
      },
    });
    assert.match(firstText(reviewContent.content), /Updated Proposed Content/);
    const reviewContentJson = await client.callTool({
      name: "kforge_review_content",
      arguments: {
        file: `reviews/${today()}-mcp-apply.md`,
        content: "---\ntitle: MCP\nsources:\n  - raw/llm-knowledge-bases.md\n---\n# MCP\n",
        json: true,
      },
    });
    const reviewContentPayload = JSON.parse(firstText(reviewContentJson.content)) as {
      review?: string;
      source?: string;
      next?: string[];
    };
    assert.equal(reviewContentPayload.review, `reviews/${today()}-mcp-apply.md`);
    assert.equal(reviewContentPayload.source, "inline content");
    assert.match(reviewContentPayload.next?.join("\n") ?? "", /review status/);
    const applyDryRunJson = await client.callTool({
      name: "kforge_review_apply",
      arguments: {
        file: `reviews/${today()}-mcp-apply.md`,
        dryRun: true,
        json: true,
      },
    });
    const applyDryRunPayload = JSON.parse(firstText(applyDryRunJson.content)) as {
      dryRun?: boolean;
      target?: string;
      content?: string;
    };
    assert.equal(applyDryRunPayload.dryRun, true);
    assert.equal(applyDryRunPayload.target, "wiki/MCP.md");
    assert.match(applyDryRunPayload.content ?? "", /# MCP/);
    const apply = await client.callTool({
      name: "kforge_review_apply",
      arguments: {
        file: `reviews/${today()}-mcp-apply.md`,
      },
    });
    assert.match(firstText(apply.content), /Applied reviews\/.*mcp-apply.md -> wiki\/MCP.md/);

    const doctor = await client.callTool({
      name: "kforge_doctor",
      arguments: {
        write: true,
      },
    });
    assert.match(firstText(doctor.content), /indexes\/doctor.md/);
    assert.match(await readFile(path.join(repoPath, "indexes", "doctor.md"), "utf8"), /# Doctor Report/);
  } finally {
    await client.close().catch(() => undefined);
    await rm(repoPath, { recursive: true, force: true });
    await rm(mcpDemoRepo, { recursive: true, force: true });
    await rm(path.dirname(sourcePath), { recursive: true, force: true });
    await webServer.close();
  }
});

function firstText(content: unknown): string {
  if (!Array.isArray(content)) {
    return "";
  }
  const first = content[0] as { type?: string; text?: string } | undefined;
  return first?.type === "text" ? first.text ?? "" : "";
}

async function startHttpServer(
  routes: Record<string, { body: string; contentType: string }>,
): Promise<{ url: string; close: () => Promise<void> }> {
  const server = http.createServer((request, response) => {
    const route = routes[request.url ?? "/"];
    if (!route) {
      response.writeHead(404, { "content-type": "text/plain" });
      response.end("not found");
      return;
    }
    response.writeHead(200, { "content-type": route.contentType });
    response.end(route.body);
  });

  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  assert.equal(typeof address, "object");
  assert.notEqual(address, null);
  const port = (address as AddressInfo).port;
  return {
    url: `http://127.0.0.1:${port}`,
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        });
      }),
  };
}

function today(): string {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
