import { mkdtemp, readFile, rm, symlink, utimes, writeFile } from "node:fs/promises";
import http from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import {
  addSource,
  agentBoard,
  agentDraft,
  agentFinish,
  agentLaunch,
  agentPlan,
  agentStatus,
  agentStep,
  askRepo,
  applyReview,
  auditClaims,
  claimTask,
  bootstrapRepo,
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
  type AgentBoardPayload,
  type AgentDraftPayload,
  type AgentFinishPayload,
  type AgentLaunchPayload,
  type AgentPlanPayload,
  type AgentStatusPayload,
  type AgentStepPayload,
  type BootstrapPayload,
  type SourceAddPayload,
  type CompileDraftPayload,
  type DashboardPayload,
  type OutputInspectPayload,
  type OutputListPayload,
  type PromoteOutputPayload,
  type ReviewApplyPayload,
  type ReviewContentPayload,
  type ReviewStatusPayload,
  type RunFinishPayload,
  type RunInspectPayload,
  type RunListPayload,
  type RunLogPayload,
  type RunNextPayload,
  type RunStartPayload,
  type SourceImportPayload,
  type SourceFetchListPayload,
  type SourceFetchPayload,
  type TaskClaimPayload,
  type TaskDonePayload,
  type TaskListPayload,
  type TaskNextPayload,
  type TaskReleasePayload,
  type TaskSeedPayload,
} from "../src/repo.js";
import { serveWebDashboard } from "../src/web.js";

test("init creates the canonical layout", async () => {
  const repoPath = await tempRepoPath();
  try {
    const result = initRepo(repoPath);

    assert.equal(result.ok, true);
    await assertFileExists(path.join(repoPath, "kb.yaml"));
    for (const directory of ["raw", "wiki", "claims", "indexes", "outputs", "reviews", "tasks", "runs"]) {
      await assertFileExists(path.join(repoPath, directory));
    }
  } finally {
    await rm(repoPath, { recursive: true, force: true });
  }
});

test("init with example creates a usable demo repo", async () => {
  const repoPath = await tempRepoPath();
  try {
    const result = initRepo(repoPath, { example: true });
    const doctor = doctorRepo(repoPath);

    assert.equal(result.ok, true);
    assert.equal(doctor.ok, true);
    await assertFileExists(path.join(repoPath, "raw", "llm-knowledge-bases.md"));
    await assertFileExists(path.join(repoPath, "wiki", "LLM Knowledge Bases.md"));
    await assertFileExists(path.join(repoPath, "wiki", "Provenance.md"));
    await assertFileExists(path.join(repoPath, "claims", "source-grounded-wikis.md"));
    await assertFileExists(path.join(repoPath, "reviews", "demo-compile-provenance.md"));
    await assertFileExists(path.join(repoPath, "outputs", "example-task-pack.md"));
    assert.match(await readFile(path.join(repoPath, "indexes", "source-inventory.md"), "utf8"), /llm-knowledge-bases/);
    assert.match(await readFile(path.join(repoPath, "indexes", "context.md"), "utf8"), /# Agent Context/);
    assert.match(await readFile(path.join(repoPath, "indexes", "dashboard.md"), "utf8"), /# Knowledge Dashboard/);
    assert.match(await readFile(path.join(repoPath, "indexes", "workflow.md"), "utf8"), /# Agent Workflow Runbook/);
    assert.match(await readFile(path.join(repoPath, "indexes", "doctor.md"), "utf8"), /Status: clean/);
    assert.match(await readFile(path.join(repoPath, "indexes", "score.md"), "utf8"), /# Trust Score/);
  } finally {
    await rm(repoPath, { recursive: true, force: true });
  }
});

test("demoRepo creates a ready-to-browse example repo", async () => {
  const repoPath = await tempRepoPath();
  try {
    const result = demoRepo(repoPath);
    const doctor = doctorRepo(repoPath);

    assert.equal(result.ok, true);
    assert.equal(doctor.ok, true);
    assert.match(result.messages.join("\n"), /Demo repo ready/);
    assert.match(result.messages.join("\n"), /kforge review queue/);
    await assertFileExists(path.join(repoPath, "raw", "llm-knowledge-bases.md"));
    await assertFileExists(path.join(repoPath, "indexes", "doctor.md"));
  } finally {
    await rm(repoPath, { recursive: true, force: true });
  }
});

test("agent templates list print and install client instructions", async () => {
  const repoPath = await tempRepoPath();
  try {
    initRepo(repoPath);

    const listed = listAgentTemplates();
    const printed = printAgentTemplate("claude");
    const installed = installAgentTemplate(repoPath, { kind: "cursor" });
    const duplicate = installAgentTemplate(repoPath, { kind: "cursor" });
    const overwritten = installAgentTemplate(repoPath, { kind: "cursor", force: true });

    assert.equal(listed.ok, true);
    assert.match(listed.messages[0], /`claude`/);
    assert.match(listed.messages[0], /`\.cursor\/rules\/kforge.mdc`/);
    assert.equal(printed.ok, true);
    assert.match(printed.messages[0], /# CLAUDE.md/);
    assert.match(printed.messages[0], /kforge context \./);
    assert.equal(installed.ok, true);
    assert.match(installed.messages[0], /\.cursor\/rules\/kforge.mdc/);
    assert.match(
      await readFile(path.join(repoPath, ".cursor", "rules", "kforge.mdc"), "utf8"),
      /# kforge Agent Rules/,
    );
    assert.equal(duplicate.ok, false);
    assert.match(duplicate.messages.join("\n"), /already exists/);
    assert.equal(overwritten.ok, true);
  } finally {
    await rm(repoPath, { recursive: true, force: true });
  }
});

test("index writes inventory files", async () => {
  const repoPath = await tempRepoPath();
  try {
    initRepo(repoPath);
    await writeFile(path.join(repoPath, "raw", "source.md"), "# Source\n", "utf8");
    await writeFile(
      path.join(repoPath, "wiki", "Concept.md"),
      "---\nsources:\n  - raw/source.md\n---\n# Concept\n",
      "utf8",
    );

    const result = indexRepo(repoPath);

    assert.equal(result.ok, true);
    assert.match(
      await readFile(path.join(repoPath, "indexes", "source-inventory.md"), "utf8"),
      /raw\/source\.md/,
    );
    assert.match(await readFile(path.join(repoPath, "indexes", "wiki-map.md"), "utf8"), /Concept/);
    assert.match(await readFile(path.join(repoPath, "indexes", "backlinks.md"), "utf8"), /# Wiki Graph/);
    assert.match(
      await readFile(path.join(repoPath, "indexes", "claim-index.md"), "utf8"),
      /No claim files/,
    );
    assert.match(
      await readFile(path.join(repoPath, "indexes", "review-index.md"), "utf8"),
      /No review files/,
    );
  } finally {
    await rm(repoPath, { recursive: true, force: true });
  }
});

test("refresh writes indexes and derived reports", async () => {
  const repoPath = await tempRepoPath();
  try {
    initRepo(repoPath, { example: true });

    const result = refreshRepo(repoPath);

    assert.equal(result.ok, true);
    assert.match(result.messages.join("\n"), /Refreshed derived artifacts/);
    await assertFileExists(path.join(repoPath, "indexes", "source-inventory.md"));
    await assertFileExists(path.join(repoPath, "indexes", "compile-plan.md"));
    await assertFileExists(path.join(repoPath, "indexes", "context.md"));
    await assertFileExists(path.join(repoPath, "indexes", "dashboard.md"));
    await assertFileExists(path.join(repoPath, "indexes", "workflow.md"));
    await assertFileExists(path.join(repoPath, "indexes", "claim-audit.md"));
    await assertFileExists(path.join(repoPath, "indexes", "doctor.md"));
    await assertFileExists(path.join(repoPath, "indexes", "score.md"));
    assert.match(await readFile(path.join(repoPath, "indexes", "claim-audit.md"), "utf8"), /# Claim Audit/);
    assert.match(await readFile(path.join(repoPath, "indexes", "compile-plan.md"), "utf8"), /# Compile Plan/);
    assert.match(await readFile(path.join(repoPath, "indexes", "dashboard.md"), "utf8"), /# Knowledge Dashboard/);
    assert.match(await readFile(path.join(repoPath, "indexes", "doctor.md"), "utf8"), /Status: clean/);
  } finally {
    await rm(repoPath, { recursive: true, force: true });
  }
});

test("bootstrap stages queued sources into review tasks and agent runs", async () => {
  const repoPath = await tempRepoPath();
  try {
    initRepo(repoPath);
    await writeFile(path.join(repoPath, "raw", "one.md"), "# One\n", "utf8");
    await writeFile(path.join(repoPath, "raw", "two.md"), "# Two\n", "utf8");

    const dryRun = JSON.parse(bootstrapRepo(repoPath, { dryRun: true, json: true }).messages[0]) as BootstrapPayload;
    const result = JSON.parse(
      bootstrapRepo(repoPath, { agents: ["agent-a", "agent-b"], limit: 2, note: "start research", json: true }).messages[0],
    ) as BootstrapPayload;

    assert.equal(dryRun.dryRun, true);
    assert.equal(dryRun.counts.queuedSources, 2);
    assert.equal(dryRun.counts.compileReviewsWouldCreate, 2);
    assert.equal(dryRun.counts.tasksCreated, 0);
    assert.match(dryRun.next.join("\n"), /kforge bootstrap/);
    assert.equal(result.dryRun, false);
    assert.equal(result.counts.compileReviewsCreated, 2);
    assert.equal(result.counts.tasksCreated, 2);
    assert.equal(result.counts.agentsRequested, 2);
    assert.equal(result.counts.agentRunsStarted, 2);
    assert.equal(result.agentPlan?.assignments.length, 2);
    assert.match(result.next.join("\n"), /kforge agent step/);
    assert.match(await readFile(path.join(repoPath, result.agentPlan?.assignments[0]?.run.file ?? ""), "utf8"), /start research/);
    assert.match(await readFile(path.join(repoPath, "indexes", "dashboard.md"), "utf8"), /# Knowledge Dashboard/);
  } finally {
    await rm(repoPath, { recursive: true, force: true });
  }
});

test("dashboard prints and writes an Obsidian-friendly status entrypoint", async () => {
  const repoPath = await tempRepoPath();
  try {
    initRepo(repoPath, { example: true });

    const printed = dashboardRepo(repoPath);
    const json = JSON.parse(dashboardRepo(repoPath, { json: true }).messages[0]) as DashboardPayload;
    const written = dashboardRepo(repoPath, { write: true });

    assert.equal(printed.ok, true);
    assert.match(printed.messages[0], /# Knowledge Dashboard/);
    assert.match(printed.messages[0], /## Open In Obsidian/);
    assert.equal(json.ok, true);
    assert.equal(json.counts.rawSources, 1);
    assert.equal(json.counts.wikiPages, 3);
    assert.equal(json.counts.claims, 1);
    assert.equal(json.counts.reviews, 1);
    assert.equal(json.counts.outputs, 1);
    assert.equal(json.health.doctor, "clean");
    assert.equal(json.health.claimAudit, "clean");
    assert.equal(json.health.agentGaps, 0);
    assert.equal(json.links.some((link) => link.file === "indexes/context.md"), true);
    assert.match(json.next.join("\n"), /task seed|agent plan|output list|source add|doctor/);
    assert.equal(written.ok, true);
    assert.match(written.messages[0], /indexes\/dashboard.md/);
    assert.match(await readFile(path.join(repoPath, "indexes", "dashboard.md"), "utf8"), /# Knowledge Dashboard/);
  } finally {
    await rm(repoPath, { recursive: true, force: true });
  }
});

test("web dashboard serves repo state and safe actions", async () => {
  const repoPath = await tempRepoPath();
  try {
    initRepo(repoPath);
    await writeFile(path.join(repoPath, "raw", "source.md"), "# Source\n", "utf8");
    createReview(repoPath, {
      title: "Web Review",
      targets: ["wiki/Web Review.md"],
      sources: ["raw/source.md"],
      kind: "compile",
      content: "---\ntitle: Web Review\nsources:\n  - raw/source.md\n---\n# Web Review\n\nCompiled from the web dashboard.\n",
    });

    const handle = await serveWebDashboard(repoPath, { port: 0 });
    try {
      const html = await fetchText(`${handle.url}/`);
      const state = (await fetchJson(`${handle.url}/api/state`)) as {
        ok?: boolean;
        dashboard?: { counts?: { rawSources?: number; reviews?: number } };
        reviews?: { total?: number; items?: { file?: string }[] };
        tasks?: { total?: number };
      };
      const reviewFile = state.reviews?.items?.[0]?.file ?? "";
      const filePreview = (await fetchJson(`${handle.url}/api/file?path=${encodeURIComponent(reviewFile)}`)) as {
        ok?: boolean;
        file?: string;
        inspect?: string;
        content?: string;
      };
      const contentUpdate = (await fetchJson(`${handle.url}/api/review-content`, {
        method: "POST",
        body: JSON.stringify({
          file: reviewFile,
          content: "---\ntitle: Web Review\nsources:\n  - raw/source.md\n---\n# Web Review\n\nUpdated from the web workbench.\n",
        }),
      })) as { ok?: boolean; payload?: { review?: string; source?: string } };
      const accept = (await fetchJson(`${handle.url}/api/review-status`, {
        method: "POST",
        body: JSON.stringify({
          file: reviewFile,
          status: "accepted",
          note: "Accepted from web test.",
        }),
      })) as { ok?: boolean; payload?: { previousStatus?: string; status?: string; review?: string } };
      const dryRun = (await fetchJson(`${handle.url}/api/review-apply-preview`, {
        method: "POST",
        body: JSON.stringify({ file: reviewFile }),
      })) as { ok?: boolean; payload?: { dryRun?: boolean; target?: string; content?: string } };
      const reject = (await fetchJson(`${handle.url}/api/review-status`, {
        method: "POST",
        body: JSON.stringify({ file: reviewFile, status: "rejected" }),
      })) as { ok?: boolean; payload?: { status?: string } };
      const reopen = (await fetchJson(`${handle.url}/api/review-status`, {
        method: "POST",
        body: JSON.stringify({ file: reviewFile, status: "proposed" }),
      })) as { ok?: boolean; payload?: { status?: string } };
      const invalidStatus = await fetch(`${handle.url}/api/review-status`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ file: reviewFile, status: "applied" }),
      });
      const missingContent = await fetch(`${handle.url}/api/review-content`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ file: reviewFile, content: "" }),
      });
      const refresh = (await fetchJson(`${handle.url}/api/refresh`, { method: "POST" })) as { ok?: boolean };
      const launch = (await fetchJson(`${handle.url}/api/agent-launch`, {
        method: "POST",
        body: JSON.stringify({
          agents: ["web-a"],
          command: "printf {agent}:{run}",
        }),
      })) as { ok?: boolean; payload?: { script?: { file?: string }; items?: unknown[] } };

      assert.match(html, /Knowledge Repo Dashboard/);
      assert.match(html, /File Preview/);
      assert.equal(state.ok, true);
      assert.equal(state.dashboard?.counts?.rawSources, 1);
      assert.equal(state.dashboard?.counts?.reviews, 1);
      assert.equal(state.reviews?.total, 1);
      assert.equal(state.tasks?.total, 0);
      assert.equal(filePreview.ok, true);
      assert.equal(filePreview.file, reviewFile);
      assert.match(filePreview.inspect ?? "", /# File Inspect/);
      assert.match(filePreview.content ?? "", /# Review: Web Review/);
      assert.equal(contentUpdate.ok, true);
      assert.equal(contentUpdate.payload?.review, reviewFile);
      assert.equal(contentUpdate.payload?.source, "inline content");
      assert.equal(accept.ok, true);
      assert.equal(accept.payload?.previousStatus, "proposed");
      assert.equal(accept.payload?.status, "accepted");
      assert.equal(accept.payload?.review, reviewFile);
      assert.equal(dryRun.ok, true);
      assert.equal(dryRun.payload?.dryRun, true);
      assert.equal(dryRun.payload?.target, "wiki/Web Review.md");
      assert.match(dryRun.payload?.content ?? "", /Updated from the web workbench/);
      assert.equal(reject.ok, true);
      assert.equal(reject.payload?.status, "rejected");
      assert.equal(reopen.ok, true);
      assert.equal(reopen.payload?.status, "proposed");
      assert.equal(invalidStatus.status, 400);
      assert.match(await invalidStatus.text(), /review file and status are required/);
      assert.equal(missingContent.status, 400);
      assert.match(await missingContent.text(), /review file and proposed content are required/);
      assert.equal(refresh.ok, true);
      assert.equal(launch.ok, true);
      assert.equal(launch.payload?.items?.length, 1);
      assert.match(launch.payload?.script?.file ?? "", /^runs\/.+agent-launch.*\.sh$/);
      assert.match(await readFile(path.join(repoPath, launch.payload?.script?.file ?? ""), "utf8"), /printf web-a:runs\//);

      const outside = await fetch(`${handle.url}/api/file?path=${encodeURIComponent("../outside.md")}`);
      assert.equal(outside.status, 400);
      assert.match(await outside.text(), /outside repo/);
    } finally {
      await handle.close();
    }
  } finally {
    await rm(repoPath, { recursive: true, force: true });
  }
});

test("addSource copies a local file and writes metadata", async () => {
  const repoPath = await tempRepoPath();
  const sourcePath = path.join(await tempRepoPath(), "Source Note.md");
  try {
    initRepo(repoPath);
    await writeFile(sourcePath, "# Source Note\n\nEvidence.\n", "utf8");

    const result = addSource(repoPath, {
      file: sourcePath,
      title: "Imported Source",
      url: "https://example.com/source",
      author: "Ada",
      license: "CC0",
      note: "Captured for the ingest test.",
    });
    const indexed = indexRepo(repoPath);

    assert.equal(result.ok, true);
    assert.match(result.messages[0], /raw\/imported-source.md/);
    const json = JSON.parse(
      addSource(repoPath, { file: sourcePath, title: "Imported Source Json", json: true }).messages[0],
    ) as SourceAddPayload;
    assert.equal(json.ok, true);
    assert.equal(json.action, "added");
    assert.equal(json.title, "Imported Source Json");
    assert.equal(json.source, "raw/imported-source-json.md");
    assert.equal(json.metadata, "raw/_meta/imported-source-json.md");
    assert.equal(json.originalPath, sourcePath);
    assert.match(json.next.join("\n"), /kforge compile plan/);
    assert.equal(await readFile(path.join(repoPath, "raw", "imported-source.md"), "utf8"), "# Source Note\n\nEvidence.\n");
    assert.equal(await readFile(path.join(repoPath, "raw", "imported-source-json.md"), "utf8"), "# Source Note\n\nEvidence.\n");
    assert.match(
      await readFile(path.join(repoPath, "raw", "_meta", "imported-source.md"), "utf8"),
      /https:\/\/example.com\/source/,
    );
    assert.equal(indexed.ok, true);
    const inventory = await readFile(path.join(repoPath, "indexes", "source-inventory.md"), "utf8");
    assert.match(inventory, /raw\/imported-source.md/);
    assert.doesNotMatch(inventory, /raw\/_meta/);
  } finally {
    await rm(repoPath, { recursive: true, force: true });
    await rm(path.dirname(sourcePath), { recursive: true, force: true });
  }
});

test("addSource avoids filename collisions", async () => {
  const repoPath = await tempRepoPath();
  const sourceDir = await tempRepoPath();
  try {
    initRepo(repoPath);
    const first = path.join(sourceDir, "first.md");
    const second = path.join(sourceDir, "second.md");
    await writeFile(first, "first\n", "utf8");
    await writeFile(second, "second\n", "utf8");

    const firstResult = addSource(repoPath, { file: first, title: "Same Source" });
    const secondResult = addSource(repoPath, { file: second, title: "Same Source" });

    assert.equal(firstResult.ok, true);
    assert.equal(secondResult.ok, true);
    assert.match(firstResult.messages[0], /raw\/same-source.md/);
    assert.match(secondResult.messages[0], /raw\/same-source-2.md/);
    assert.equal(await readFile(path.join(repoPath, "raw", "same-source.md"), "utf8"), "first\n");
    assert.equal(await readFile(path.join(repoPath, "raw", "same-source-2.md"), "utf8"), "second\n");
  } finally {
    await rm(repoPath, { recursive: true, force: true });
    await rm(sourceDir, { recursive: true, force: true });
  }
});

test("importSources copies a local directory recursively with metadata", async () => {
  const repoPath = await tempRepoPath();
  const sourceDir = await tempRepoPath();
  try {
    initRepo(repoPath);
    await writeFile(path.join(sourceDir, "Article.md"), "# Article\n", "utf8");
    await writeFile(path.join(sourceDir, "Article.txt"), "duplicate title\n", "utf8");
    await import("node:fs/promises").then((fs) => fs.mkdir(path.join(sourceDir, "nested"), { recursive: true }));
    await writeFile(path.join(sourceDir, "nested", "Dataset.csv"), "a,b\n1,2\n", "utf8");
    await import("node:fs/promises").then((fs) => fs.mkdir(path.join(sourceDir, ".git"), { recursive: true }));
    await writeFile(path.join(sourceDir, ".git", "ignored.md"), "ignored\n", "utf8");
    await import("node:fs/promises").then((fs) => fs.mkdir(path.join(sourceDir, "node_modules"), { recursive: true }));
    await writeFile(path.join(sourceDir, "node_modules", "ignored.md"), "ignored\n", "utf8");
    await symlink(path.join(sourceDir, "Article.md"), path.join(sourceDir, "linked.md"));

    const dryRun = importSources(repoPath, { dir: sourceDir, titlePrefix: "Research", dryRun: true });
    const dryRunJson = JSON.parse(
      importSources(repoPath, { dir: sourceDir, titlePrefix: "Research Dry Json", dryRun: true, json: true }).messages[0],
    ) as SourceImportPayload;
    const result = importSources(repoPath, {
      dir: sourceDir,
      titlePrefix: "Research",
      author: "Ada",
      note: "Bulk captured.",
    });
    const resultJson = JSON.parse(
      importSources(repoPath, { dir: sourceDir, titlePrefix: "Research Json", json: true }).messages[0],
    ) as SourceImportPayload;
    const indexed = indexRepo(repoPath);

    assert.equal(dryRun.ok, true);
    assert.match(dryRun.messages.join("\n"), /Dry run: would import 3 source file/);
    assert.match(dryRun.messages.join("\n"), /Article.md -> raw\/research-article.md/);
    assert.doesNotMatch(dryRun.messages.join("\n"), /linked/);
    assert.equal(dryRunJson.ok, true);
    assert.equal(dryRunJson.dryRun, true);
    assert.equal(dryRunJson.counts.candidates, 3);
    assert.equal(dryRunJson.counts.wouldImport, 3);
    assert.equal(dryRunJson.counts.imported, 0);
    assert.equal(dryRunJson.items[0].action, "would_import");
    assert.equal(dryRunJson.items[0].relativePath, "Article.md");
    assert.equal(dryRunJson.items[0].source, "raw/research-dry-json-article.md");
    assert.equal(dryRunJson.items[0].metadata, "raw/_meta/research-dry-json-article.md");
    await assertFileMissing(path.join(repoPath, "raw", "research-dry-json-article.md"));
    assert.equal(result.ok, true);
    assert.match(result.messages.join("\n"), /Imported 3 source file/);
    assert.equal(resultJson.ok, true);
    assert.equal(resultJson.dryRun, false);
    assert.equal(resultJson.counts.candidates, 3);
    assert.equal(resultJson.counts.wouldImport, 0);
    assert.equal(resultJson.counts.imported, 3);
    assert.equal(resultJson.items[0].action, "imported");
    assert.equal(resultJson.items[0].source, "raw/research-json-article.md");
    assert.match(resultJson.next.join("\n"), /kforge compile plan/);
    await assertFileExists(path.join(repoPath, "raw", "research-article.md"));
    await assertFileExists(path.join(repoPath, "raw", "research-article.txt"));
    await assertFileExists(path.join(repoPath, "raw", "research-nested-dataset.csv"));
    await assertFileExists(path.join(repoPath, "raw", "research-json-article.md"));
    assert.match(
      await readFile(path.join(repoPath, "raw", "_meta", "research-nested-dataset-csv.md"), "utf8"),
      /Imported from directory path: `nested\/Dataset.csv`/,
    );
    assert.match(
      await readFile(path.join(repoPath, "raw", "_meta", "research-article.md"), "utf8"),
      /Author: Ada/,
    );
    assert.equal(indexed.ok, true);
    const inventory = await readFile(path.join(repoPath, "indexes", "source-inventory.md"), "utf8");
    assert.match(inventory, /raw\/research-article.md/);
    assert.doesNotMatch(inventory, /ignored/);
  } finally {
    await rm(repoPath, { recursive: true, force: true });
    await rm(sourceDir, { recursive: true, force: true });
  }
});

test("importSources keeps metadata sidecars distinct across extensions", async () => {
  const repoPath = await tempRepoPath();
  const sourceDir = await tempRepoPath();
  try {
    initRepo(repoPath);
    await writeFile(path.join(sourceDir, "Article.md"), "# Article\n", "utf8");
    await writeFile(path.join(sourceDir, "Article.txt"), "article text\n", "utf8");

    const result = importSources(repoPath, { dir: sourceDir, titlePrefix: "Research" });
    const json = JSON.parse(
      importSources(repoPath, { dir: sourceDir, titlePrefix: "Research Json", json: true }).messages[0],
    ) as SourceImportPayload;
    const listed = listSources(repoPath);

    assert.equal(result.ok, true);
    assert.match(result.messages.join("\n"), /raw\/research-article.md \(metadata: raw\/_meta\/research-article.md\)/);
    assert.match(result.messages.join("\n"), /raw\/research-article.txt \(metadata: raw\/_meta\/research-article-txt.md\)/);
    assert.equal(json.items[0].metadata, "raw/_meta/research-json-article.md");
    assert.equal(json.items[1].metadata, "raw/_meta/research-json-article-txt.md");
    assert.match(
      await readFile(path.join(repoPath, "raw", "_meta", "research-article.md"), "utf8"),
      /Source file: `raw\/research-article.md`/,
    );
    assert.match(
      await readFile(path.join(repoPath, "raw", "_meta", "research-article-txt.md"), "utf8"),
      /Source file: `raw\/research-article.txt`/,
    );
    assert.match(listed.messages[0], /raw\/research-article\.txt/);
    assert.match(listed.messages[0], /raw\/_meta\/research-article-txt\.md/);
  } finally {
    await rm(repoPath, { recursive: true, force: true });
    await rm(sourceDir, { recursive: true, force: true });
  }
});

test("importSources refuses repo roots and canonical directories", async () => {
  const repoPath = await tempRepoPath();
  try {
    initRepo(repoPath);

    const rootResult = importSources(repoPath, { dir: repoPath });
    const rawResult = importSources(repoPath, { dir: path.join(repoPath, "raw") });

    assert.equal(rootResult.ok, false);
    assert.match(rootResult.messages.join("\n"), /repo root or a kforge canonical directory/);
    assert.equal(rawResult.ok, false);
    assert.match(rawResult.messages.join("\n"), /canonical directory/);
  } finally {
    await rm(repoPath, { recursive: true, force: true });
  }
});

test("fetchSource imports a URL as markdown with metadata", async () => {
  const repoPath = await tempRepoPath();
  const server = await startHttpServer({
    "/article": {
      contentType: "text/html; charset=utf-8",
      body: "<html><head><title>Fetched Article</title></head><body><h1>Fetched Article</h1><p>Evidence with <a href=\"/source\">a link</a>.</p></body></html>",
    },
  });
  try {
    initRepo(repoPath);

    const result = await fetchSource(repoPath, { url: `${server.url}/article`, title: "Fetched Article", json: true });
    const payload = JSON.parse(result.messages[0]) as SourceFetchPayload;

    assert.equal(result.ok, true);
    assert.equal(payload.action, "fetched");
    assert.equal(payload.source, "raw/fetched-article.md");
    assert.equal(payload.metadata, "raw/_meta/fetched-article.md");
    assert.equal(payload.status, 200);
    assert.match(payload.contentType, /text\/html/);
    assert.match(payload.next.join("\n"), /kforge source inspect/);
    assert.match(await readFile(path.join(repoPath, "raw", "fetched-article.md"), "utf8"), /# Fetched Article/);
    assert.match(await readFile(path.join(repoPath, "raw", "fetched-article.md"), "utf8"), /\[a link\]\(http:\/\/127\.0\.0\.1:/);
    assert.match(await readFile(path.join(repoPath, "raw", "_meta", "fetched-article.md"), "utf8"), /URL: http:\/\/127\.0\.0\.1:/);
  } finally {
    await server.close();
    await rm(repoPath, { recursive: true, force: true });
  }
});

test("fetchSources imports a URL list with dry-run and JSON summaries", async () => {
  const repoPath = await tempRepoPath();
  const listDir = await tempRepoPath();
  const listPath = path.join(listDir, "urls.txt");
  const server = await startHttpServer({
    "/one": {
      contentType: "text/html; charset=utf-8",
      body: "<html><head><title>One Article</title></head><body><h1>One Article</h1><p>First.</p></body></html>",
    },
    "/two": {
      contentType: "text/plain; charset=utf-8",
      body: "# Two Article\n\nSecond.\n",
    },
  });
  try {
    initRepo(repoPath);
    await writeFile(
      listPath,
      `# URL list\nFirst Title | ${server.url}/one\n[Second Title](${server.url}/two)\n`,
      "utf8",
    );

    const dryRun = JSON.parse(
      (await fetchSources(repoPath, { file: listPath, titlePrefix: "Research", dryRun: true, json: true })).messages[0],
    ) as SourceFetchListPayload;
    const result = JSON.parse(
      (await fetchSources(repoPath, { file: listPath, titlePrefix: "Research", json: true })).messages[0],
    ) as SourceFetchListPayload;

    assert.equal(dryRun.dryRun, true);
    assert.equal(dryRun.counts.candidates, 2);
    assert.equal(dryRun.counts.wouldFetch, 2);
    assert.equal(dryRun.items[0].action, "would_fetch");
    assert.equal(dryRun.items[0].title, "Research First Title");
    assert.equal(result.dryRun, false);
    assert.equal(result.counts.fetched, 2);
    assert.equal(result.counts.failed, 0);
    assert.equal(result.items[0].action, "fetched");
    assert.equal(result.items[0].source, "raw/research-first-title.md");
    assert.equal(result.items[1].source, "raw/research-second-title.md");
    assert.match(result.next.join("\n"), /kforge compile plan/);
    assert.match(await readFile(path.join(repoPath, "raw", "research-first-title.md"), "utf8"), /# One Article/);
    assert.match(await readFile(path.join(repoPath, "raw", "_meta", "research-first-title.md"), "utf8"), /Fetched from URL list:/);
  } finally {
    await server.close();
    await rm(repoPath, { recursive: true, force: true });
    await rm(listDir, { recursive: true, force: true });
  }
});

test("listSources shows raw sources and metadata", async () => {
  const repoPath = await tempRepoPath();
  const sourcePath = path.join(await tempRepoPath(), "Article.md");
  try {
    initRepo(repoPath);
    await writeFile(sourcePath, "# Article\n", "utf8");
    addSource(repoPath, {
      file: sourcePath,
      title: "Research Article",
      url: "https://example.com/article",
    });

    const result = listSources(repoPath);

    assert.equal(result.ok, true);
    assert.match(result.messages[0], /# Source List/);
    assert.match(result.messages[0], /raw\/research-article.md/);
    assert.match(result.messages[0], /https:\/\/example.com\/article/);
    assert.match(result.messages[0], /raw\/_meta\/research-article.md/);
  } finally {
    await rm(repoPath, { recursive: true, force: true });
    await rm(path.dirname(sourcePath), { recursive: true, force: true });
  }
});

test("inspectSource shows metadata and local references", async () => {
  const repoPath = await tempRepoPath();
  const sourcePath = path.join(await tempRepoPath(), "Evidence.md");
  try {
    initRepo(repoPath);
    await writeFile(sourcePath, "# Evidence\n\nA useful source.\n", "utf8");
    addSource(repoPath, {
      file: sourcePath,
      title: "Evidence Source",
      author: "Ada",
      note: "Imported for source inspection.",
    });
    await writeFile(
      path.join(repoPath, "wiki", "Evidence Note.md"),
      "---\nsources:\n  - raw/evidence-source.md\n---\n# Evidence Note\n",
      "utf8",
    );

    const result = inspectSource(repoPath, { file: "raw/evidence-source.md" });
    const invalid = inspectSource(repoPath, { file: "wiki/Home.md" });

    assert.equal(result.ok, true);
    assert.match(result.messages[0], /# Source Inspect/);
    assert.match(result.messages[0], /author: Ada/);
    assert.match(result.messages[0], /wiki\/Evidence Note.md/);
    assert.match(result.messages[0], /Imported for source inspection/);
    assert.equal(invalid.ok, false);
  } finally {
    await rm(repoPath, { recursive: true, force: true });
    await rm(path.dirname(sourcePath), { recursive: true, force: true });
  }
});

test("graph reports backlinks orphans and broken wikilinks", async () => {
  const repoPath = await tempRepoPath();
  try {
    initRepo(repoPath);
    await writeFile(
      path.join(repoPath, "wiki", "Alpha.md"),
      "---\nsources: []\n---\n# Alpha\nSee [[Beta]] and [[Missing]].\n",
      "utf8",
    );
    await writeFile(
      path.join(repoPath, "wiki", "Beta.md"),
      "---\nsources: []\n---\n# Beta\nBack to [[Alpha]].\n",
      "utf8",
    );
    await writeFile(
      path.join(repoPath, "wiki", "Gamma.md"),
      "---\nsources: []\n---\n# Gamma\nNo inbound links.\n",
      "utf8",
    );

    const result = graphRepo(repoPath);

    assert.equal(result.ok, true);
    assert.match(result.messages[0], /# Wiki Graph/);
    assert.match(result.messages[0], /\[\[Alpha\]\]/);
    assert.match(result.messages[0], /\[\[Beta\]\]/);
    assert.match(result.messages[0], /wiki\/Gamma.md/);
    assert.match(result.messages[0], /wiki\/Alpha.md -> \[\[Missing\]\]/);
  } finally {
    await rm(repoPath, { recursive: true, force: true });
  }
});

test("graph writes indexes backlinks report", async () => {
  const repoPath = await tempRepoPath();
  try {
    initRepo(repoPath);
    await writeFile(path.join(repoPath, "wiki", "Alpha.md"), "# Alpha\n", "utf8");

    const result = graphRepo(repoPath, { write: true });

    assert.equal(result.ok, true);
    assert.match(result.messages[0], /indexes\/backlinks.md/);
    assert.match(await readFile(path.join(repoPath, "indexes", "backlinks.md"), "utf8"), /# Wiki Graph/);
  } finally {
    await rm(repoPath, { recursive: true, force: true });
  }
});

test("workflow reports the agent loop and writes runbook", async () => {
  const repoPath = await tempRepoPath();
  try {
    initRepo(repoPath, { example: true });

    const result = workflowRepo(repoPath);
    const written = workflowRepo(repoPath, { write: true });

    assert.equal(result.ok, true);
    assert.match(result.messages[0], /# Agent Workflow Runbook/);
    assert.match(result.messages[0], /## Standard Agent Loop/);
    assert.match(result.messages[0], /kforge promote/);
    assert.match(result.messages[0], /raw sources: 1/);
    assert.equal(written.ok, true);
    assert.match(written.messages[0], /indexes\/workflow.md/);
    assert.match(await readFile(path.join(repoPath, "indexes", "workflow.md"), "utf8"), /# Agent Workflow Runbook/);
  } finally {
    await rm(repoPath, { recursive: true, force: true });
  }
});

test("handoff summarizes next agent actions and writes an output packet", async () => {
  const repoPath = await tempRepoPath();
  try {
    initRepo(repoPath, { example: true });

    const result = handoffRepo(repoPath);
    const written = handoffRepo(repoPath, { write: true });

    assert.equal(result.ok, true);
    assert.match(result.messages[0], /# Agent Handoff/);
    assert.match(result.messages[0], /## Current State/);
    assert.match(result.messages[0], /claim audit: clean/);
    assert.match(result.messages[0], /kforge claim review-drift \. --dry-run/);
    assert.equal(written.ok, true);
    assert.match(written.messages[0], /outputs\/.*agent-handoff.md/);
    assert.match(
      await readFile(path.join(repoPath, "outputs", `${today()}-agent-handoff.md`), "utf8"),
      /# Agent Handoff/,
    );
  } finally {
    await rm(repoPath, { recursive: true, force: true });
  }
});

test("createClaim creates a sourced claim and index includes it", async () => {
  const repoPath = await tempRepoPath();
  try {
    initRepo(repoPath);
    await writeFile(path.join(repoPath, "raw", "source.md"), "# Source\n", "utf8");

    const claim = createClaim(repoPath, {
      title: "LLM wiki pages need provenance",
      assertion: "Compiled wiki pages are safer when important claims cite source files.",
      sources: ["raw/source.md"],
      confidence: "high",
    });
    const indexed = indexRepo(repoPath);

    assert.equal(claim.ok, true);
    assert.equal(indexed.ok, true);
    assert.match(
      await readFile(path.join(repoPath, "claims", "llm-wiki-pages-need-provenance.md"), "utf8"),
      /raw\/source\.md/,
    );
    assert.match(
      await readFile(path.join(repoPath, "indexes", "claim-index.md"), "utf8"),
      /LLM wiki pages need provenance/,
    );
  } finally {
    await rm(repoPath, { recursive: true, force: true });
  }
});

test("auditClaims reports claim provenance and review debt", async () => {
  const repoPath = await tempRepoPath();
  try {
    initRepo(repoPath);
    await writeFile(path.join(repoPath, "raw", "source.md"), "# Source\n", "utf8");
    createClaim(repoPath, {
      title: "Source is useful",
      sources: ["raw/source.md"],
      assertion: "A supported assertion.",
      confidence: "low",
    });

    const result = auditClaims(repoPath);

    assert.equal(result.ok, true);
    assert.match(result.messages[0], /# Claim Audit/);
    assert.match(result.messages[0], /sourced claims: 100% \(1\/1\)/);
    assert.match(result.messages[0], /claim awaiting review/);
    assert.match(result.messages[0], /low-confidence claim/);
  } finally {
    await rm(repoPath, { recursive: true, force: true });
  }
});

test("auditClaims warns when a local source is newer than its claim", async () => {
  const repoPath = await tempRepoPath();
  try {
    initRepo(repoPath);
    const sourcePath = path.join(repoPath, "raw", "source.md");
    await writeFile(sourcePath, "# Source\n", "utf8");
    await writeFile(
      path.join(repoPath, "claims", "stale.md"),
      "# Claim: Stale\n\nStatus: reviewed\nConfidence: medium\nCreated: 2026-01-01\n\n## Assertion\n\nOld claim.\n\n## Sources\n\n- `raw/source.md`\n",
      "utf8",
    );
    await utimes(sourcePath, new Date("2026-02-01T00:00:00Z"), new Date("2026-02-01T00:00:00Z"));

    const result = auditClaims(repoPath, { json: true });
    const payload = JSON.parse(result.messages[0]) as {
      ok: boolean;
      counts: { sourceDrift: number; missingCreated: number };
      warnings: string[];
      claims: Array<{ sourceDrift: Array<{ source: string; sourceModified: string; claimCreated: string }> }>;
    };

    assert.equal(result.ok, true);
    assert.equal(payload.ok, true);
    assert.equal(payload.counts.sourceDrift, 1);
    assert.equal(payload.counts.missingCreated, 0);
    assert.equal(payload.claims[0].sourceDrift[0].source, "raw/source.md");
    assert.equal(payload.claims[0].sourceDrift[0].sourceModified, "2026-02-01");
    assert.equal(payload.claims[0].sourceDrift[0].claimCreated, "2026-01-01");
    assert.equal(payload.warnings.some((warning) => warning.includes("source newer than claim")), true);
  } finally {
    await rm(repoPath, { recursive: true, force: true });
  }
});

test("reviewClaimDrift creates stale review artifacts and skips duplicates", async () => {
  const repoPath = await tempRepoPath();
  try {
    initRepo(repoPath);
    const sourcePath = path.join(repoPath, "raw", "source.md");
    await writeFile(sourcePath, "# Source\n", "utf8");
    await writeFile(
      path.join(repoPath, "claims", "stale.md"),
      "# Claim: Stale\n\nStatus: reviewed\nConfidence: medium\nCreated: 2026-01-01\n\n## Assertion\n\nOld claim.\n\n## Sources\n\n- `raw/source.md`\n",
      "utf8",
    );
    await utimes(sourcePath, new Date("2026-02-01T00:00:00Z"), new Date("2026-02-01T00:00:00Z"));

    const dryRun = reviewClaimDrift(repoPath, { dryRun: true });
    const created = reviewClaimDrift(repoPath);
    const duplicate = reviewClaimDrift(repoPath);
    const reviewFile = path.join(repoPath, "reviews", `${today()}-review-stale-claim-stale.md`);
    const reviewText = await readFile(reviewFile, "utf8");

    assert.equal(dryRun.ok, true);
    assert.match(dryRun.messages.join("\n"), /Would create stale review/);
    assert.equal(created.ok, true);
    assert.match(created.messages.join("\n"), /Created stale review for claims\/stale.md -> raw\/source.md/);
    assert.match(reviewText, /Kind: stale/);
    assert.match(reviewText, /claims\/stale.md/);
    assert.match(reviewText, /raw\/source.md/);
    assert.match(reviewText, /modified on 2026-02-01/);
    assert.match(reviewText, /Agent handoff/);
    assert.match(reviewText, /kforge inspect \. --file claims\/stale.md/);
    assert.match(reviewText, /```markdown\n# Claim: Stale/);
    assert.match(reviewText, /Decision checklist/);
    assert.match(reviewText, /Expected outcome/);
    assert.match(reviewText, /Do not treat source drift as proof/);
    assert.equal(duplicate.ok, true);
    assert.match(duplicate.messages.join("\n"), /Skipped existing open stale review/);
  } finally {
    await rm(repoPath, { recursive: true, force: true });
  }
});

test("auditClaims fails on invalid or missing claim sources", async () => {
  const repoPath = await tempRepoPath();
  try {
    initRepo(repoPath);
    await writeFile(
      path.join(repoPath, "claims", "bad.md"),
      "# Claim: Bad\n\nStatus: strange\nConfidence: certain\n\n## Assertion\n\nBad.\n\n## Sources\n\n- `raw/missing.md`\n",
      "utf8",
    );
    await writeFile(
      path.join(repoPath, "claims", "unsourced.md"),
      "# Claim: Unsourced\n\nStatus: reviewed\nConfidence: medium\n\n## Assertion\n\nNo source.\n",
      "utf8",
    );

    const result = auditClaims(repoPath);

    assert.equal(result.ok, false);
    assert.match(result.messages[0], /invalid claim status/);
    assert.match(result.messages[0], /invalid claim confidence/);
    assert.match(result.messages[0], /claim without sources/);
    assert.match(result.messages[0], /raw\/missing.md/);
  } finally {
    await rm(repoPath, { recursive: true, force: true });
  }
});

test("auditClaims can write markdown and return JSON", async () => {
  const repoPath = await tempRepoPath();
  try {
    initRepo(repoPath, { example: true });

    const result = auditClaims(repoPath, { write: true, json: true });
    const payload = JSON.parse(result.messages[0]) as {
      ok: boolean;
      status: string;
      counts: { claims: number; sourced: number; sourceDrift: number };
      claims: Array<{ file: string }>;
    };

    assert.equal(result.ok, true);
    assert.equal(payload.ok, true);
    assert.equal(payload.status, "clean");
    assert.equal(payload.counts.claims, 1);
    assert.equal(payload.counts.sourced, 1);
    assert.equal(payload.counts.sourceDrift, 0);
    assert.equal(payload.claims[0].file, "claims/source-grounded-wikis.md");
    assert.match(await readFile(path.join(repoPath, "indexes", "claim-audit.md"), "utf8"), /# Claim Audit/);
  } finally {
    await rm(repoPath, { recursive: true, force: true });
  }
});

test("createReview creates a review artifact and index includes it", async () => {
  const repoPath = await tempRepoPath();
  try {
    initRepo(repoPath);
    await writeFile(path.join(repoPath, "raw", "source.md"), "# Source\n", "utf8");

    const review = createReview(repoPath, {
      title: "Compile provenance article",
      summary: "Propose a small sourced article about provenance.",
      targets: ["wiki/Provenance.md"],
      sources: ["raw/source.md"],
      kind: "compile",
    });
    const indexed = indexRepo(repoPath);

    assert.equal(review.ok, true);
    assert.equal(indexed.ok, true);
    assert.match(
      await readFile(path.join(repoPath, "reviews", `${today()}-compile-provenance-article.md`), "utf8"),
      /wiki\/Provenance\.md/,
    );
    assert.match(
      await readFile(path.join(repoPath, "indexes", "review-index.md"), "utf8"),
      /Compile provenance article/,
    );
  } finally {
    await rm(repoPath, { recursive: true, force: true });
  }
});

test("reviewQueue prioritizes actionable reviews for agents", async () => {
  const repoPath = await tempRepoPath();
  try {
    initRepo(repoPath);
    await writeFile(path.join(repoPath, "raw", "source.md"), "# Source\n", "utf8");
    createReview(repoPath, {
      title: "Draft article",
      targets: ["wiki/Draft.md"],
      sources: ["raw/source.md"],
      kind: "compile",
      content: "# Draft\n",
    });
    createReview(repoPath, {
      title: "Apply accepted article",
      targets: ["wiki/Accepted.md"],
      sources: ["raw/source.md"],
      kind: "compile",
      status: "accepted",
      content: "# Accepted\n",
    });
    await writeFile(
      path.join(repoPath, "reviews", "broken-references.md"),
      "# Review: Broken references\n\nStatus: proposed\nKind: custom\nCreated: 2026-05-28\n\n## Summary\n\nBad target.\n\n## Targets\n\n- `../outside.md`\n\n## Sources\n\n- `raw/source.md`\n",
      "utf8",
    );

    const queue = reviewQueue(repoPath);
    const next = reviewNext(repoPath);
    const accepted = reviewQueue(repoPath, { status: "accepted" });
    const queueJson = JSON.parse(reviewQueue(repoPath, { json: true }).messages[0]) as {
      status: string;
      showing: number;
      total: number;
      items: Array<{
        title: string;
        blockers: string[];
        suggestedCommands: string[];
      }>;
      next: {
        title: string;
        blockers: string[];
        suggestedCommands: string[];
      };
    };
    const nextJson = JSON.parse(reviewNext(repoPath, { json: true }).messages[0]) as {
      next: {
        title: string;
        blockers: string[];
        suggestedCommands: string[];
      };
    };

    assert.equal(queue.ok, true);
    assert.match(queue.messages[0], /# Review Queue/);
    assert.match(queue.messages[0], /Broken references/);
    assert.match(queue.messages[0], /Apply accepted article/);
    assert.match(queue.messages[0], /Draft article/);
    assert.match(queue.messages[0], /Fix review references/);
    assert.match(next.messages[0], /# Next Review/);
    assert.match(next.messages[0], /Broken references/);
    assert.match(next.messages[0], /review target check|outside repo/);
    assert.match(accepted.messages[0], /Apply accepted article/);
    assert.doesNotMatch(accepted.messages[0], /Draft article/);
    assert.equal(queueJson.status, "actionable");
    assert.equal(queueJson.showing, 3);
    assert.equal(queueJson.total, 3);
    assert.equal(queueJson.next.title, "Broken references");
    assert.match(queueJson.next.blockers.join("\n"), /outside repo|review target check/);
    assert.deepEqual(queueJson.next.suggestedCommands, [
      "kforge inspect . --file reviews/broken-references.md",
      "kforge doctor . --write",
    ]);
    assert.equal(nextJson.next.title, "Broken references");
    assert.equal(nextJson.next.suggestedCommands[0], "kforge inspect . --file reviews/broken-references.md");
  } finally {
    await rm(repoPath, { recursive: true, force: true });
  }
});

test("reviewQueue gives compile reviews source-to-content commands", async () => {
  const repoPath = await tempRepoPath();
  try {
    initRepo(repoPath);
    await writeFile(path.join(repoPath, "raw", "source.md"), "# Source\n", "utf8");
    createReview(repoPath, {
      title: "Compile draft",
      targets: ["wiki/Draft.md"],
      sources: ["raw/source.md"],
      kind: "compile",
    });

    const queue = reviewQueue(repoPath);
    const next = reviewNext(repoPath);
    const queueJson = JSON.parse(reviewQueue(repoPath, { json: true }).messages[0]) as {
      next: {
        suggestedCommands: string[];
      };
    };

    assert.equal(queue.ok, true);
    assert.match(queue.messages[0], /kforge compile draft \. --review reviews\/.*compile-draft.md --write/);
    assert.match(queue.messages[0], /kforge inspect \. --file raw\/source.md/);
    assert.match(queue.messages[0], /kforge review content \. --file reviews\/.*compile-draft.md --from outputs\/<draft>\.md/);
    assert.match(next.messages[0], /kforge review content/);
    assert.deepEqual(queueJson.next.suggestedCommands, [
      `kforge inspect . --file reviews/${today()}-compile-draft.md`,
      "kforge inspect . --file raw/source.md",
      `kforge compile draft . --review reviews/${today()}-compile-draft.md --write`,
      `kforge review content . --file reviews/${today()}-compile-draft.md --from outputs/<draft>.md`,
      `kforge review status . --file reviews/${today()}-compile-draft.md --status accepted --note "Checked source and target."`,
    ]);
  } finally {
    await rm(repoPath, { recursive: true, force: true });
  }
});

test("tasks can seed review work and coordinate agent ownership", async () => {
  const repoPath = await tempRepoPath();
  try {
    initRepo(repoPath);
    await writeFile(path.join(repoPath, "raw", "source.md"), "# Source\n", "utf8");
    createReview(repoPath, {
      title: "Tasked Review",
      targets: ["wiki/Tasked.md"],
      sources: ["raw/source.md"],
      kind: "compile",
    });

    const seed = JSON.parse(seedTasks(repoPath, { json: true }).messages[0]) as TaskSeedPayload;
    const duplicateSeed = JSON.parse(seedTasks(repoPath, { json: true }).messages[0]) as TaskSeedPayload;
    const listed = JSON.parse(taskList(repoPath, { json: true }).messages[0]) as TaskListPayload;
    const taskFile = seed.items[0].task;
    const claimed = JSON.parse(claimTask(repoPath, { task: taskFile, agent: "agent-a", json: true }).messages[0]) as TaskClaimPayload;
    const claimedList = JSON.parse(taskList(repoPath, { status: "claimed", json: true }).messages[0]) as TaskListPayload;
    const released = JSON.parse(releaseTask(repoPath, { task: taskFile, note: "handoff", json: true }).messages[0]) as TaskReleasePayload;
    const reclaimed = claimTask(repoPath, { task: taskFile, agent: "agent-b" });
    const done = JSON.parse(completeTask(repoPath, { task: taskFile, note: "review handled", json: true }).messages[0]) as TaskDonePayload;
    const doneList = JSON.parse(taskList(repoPath, { status: "done", json: true }).messages[0]) as TaskListPayload;

    assert.equal(seed.ok, true);
    assert.equal(seed.counts.candidates, 1);
    assert.equal(seed.counts.created, 1);
    assert.match(taskFile, /^tasks\/.*tasked-review\.md$/);
    assert.equal(seed.items[0].source, `reviews/${today()}-tasked-review.md`);
    assert.equal(duplicateSeed.counts.created, 0);
    assert.equal(duplicateSeed.counts.skippedExisting, 1);
    assert.equal(listed.items[0].status, "open");
    assert.equal(listed.items[0].source, `reviews/${today()}-tasked-review.md`);
    assert.match(listed.items[0].suggestedCommands.join("\n"), /kforge compile draft/);
    assert.equal(claimed.task.status, "claimed");
    assert.equal(claimed.task.owner, "agent-a");
    assert.equal(claimedList.items[0].file, taskFile);
    assert.equal(released.task.status, "open");
    assert.equal(reclaimed.ok, true);
    assert.match(reclaimed.messages.join("\n"), /Claimed/);
    assert.equal(done.task.status, "done");
    assert.equal(done.task.owner, "agent-b");
    assert.equal(doneList.items[0].file, taskFile);
    assert.match(await readFile(path.join(repoPath, taskFile), "utf8"), /review handled/);

    createReview(repoPath, {
      title: "Next Task",
      targets: ["wiki/Next.md"],
      sources: ["raw/source.md"],
      kind: "compile",
    });
    const next = JSON.parse(nextTask(repoPath, { agent: "agent-c", json: true }).messages[0]) as TaskNextPayload;
    assert.equal(next.seeded.counts.created >= 1, true);
    assert.equal(next.task?.status, "claimed");
    assert.equal(next.task?.owner, "agent-c");
    assert.match(next.task?.source ?? "", /^reviews\/.*\.md$/);
  } finally {
    await rm(repoPath, { recursive: true, force: true });
  }
});

test("runs record auditable agent execution logs", async () => {
  const repoPath = await tempRepoPath();
  try {
    initRepo(repoPath);
    await writeFile(path.join(repoPath, "raw", "source.md"), "# Source\n", "utf8");
    createReview(repoPath, {
      title: "Run Review",
      targets: ["wiki/Run.md"],
      sources: ["raw/source.md"],
      kind: "compile",
    });
    const task = (JSON.parse(nextTask(repoPath, { agent: "run-agent", json: true }).messages[0]) as TaskNextPayload).task;
    assert.ok(task);

    const started = JSON.parse(
      startRun(repoPath, { task: task.file, agent: "run-agent", note: "start note", json: true }).messages[0],
    ) as RunStartPayload;
    const listed = JSON.parse(listRuns(repoPath, { json: true }).messages[0]) as RunListPayload;
    const logged = JSON.parse(
      logRun(repoPath, { run: started.run.file, message: "compiled first draft", json: true }).messages[0],
    ) as RunLogPayload;
    const inspectedRunning = JSON.parse(inspectRun(repoPath, { run: started.run.file, json: true }).messages[0]) as RunInspectPayload;
    const finished = JSON.parse(
      finishRun(repoPath, { run: started.run.file, status: "success", note: "done", json: true }).messages[0],
    ) as RunFinishPayload;
    const inspectedFinished = JSON.parse(inspectRun(repoPath, { run: started.run.file, json: true }).messages[0]) as RunInspectPayload;
    const successList = JSON.parse(listRuns(repoPath, { status: "success", json: true }).messages[0]) as RunListPayload;

    assert.equal(started.run.status, "running");
    assert.equal(started.run.task, task.file);
    assert.equal(started.run.agent, "run-agent");
    assert.match(started.run.file, /^runs\/.*run-review-run-agent\.md$/);
    assert.equal(listed.items[0].file, started.run.file);
    assert.equal(logged.run.logCount, 2);
    assert.equal(inspectedRunning.run.file, started.run.file);
    assert.equal(inspectedRunning.task?.file, task.file);
    assert.equal(inspectedRunning.logs.length, 2);
    assert.equal(inspectedRunning.logs[0].message, "compiled first draft");
    assert.equal(inspectedRunning.next[0], `kforge run log . --run ${started.run.file} --message <text> --json`);
    assert.equal(finished.run.status, "success");
    assert.equal(finished.run.logCount, 3);
    assert.equal(inspectedFinished.run.status, "success");
    assert.equal(inspectedFinished.logs.length, 3);
    assert.equal(inspectedFinished.logs[0].message, "finished success: done");
    assert.equal(inspectedFinished.next[0], `kforge task done . --task ${task.file} --note <text> --json`);
    assert.equal(successList.items[0].file, started.run.file);
    assert.match(await readFile(path.join(repoPath, started.run.file), "utf8"), /compiled first draft/);
    assert.match(await readFile(path.join(repoPath, started.run.file), "utf8"), /finished success: done/);

    createReview(repoPath, {
      title: "Run Next Review",
      targets: ["wiki/Run Next.md"],
      sources: ["raw/source.md"],
      kind: "compile",
    });
    const next = JSON.parse(nextRun(repoPath, { agent: "run-next-agent", note: "one step", json: true }).messages[0]) as RunNextPayload;
    assert.equal(next.task?.status, "claimed");
    assert.equal(next.task?.owner, "run-next-agent");
    assert.equal(next.run?.status, "running");
    assert.equal(next.run?.agent, "run-next-agent");
    assert.equal(next.run?.task, next.task?.file);
    assert.match(next.run?.file ?? "", /^runs\/.*run-next-agent.*\.md$/);
  } finally {
    await rm(repoPath, { recursive: true, force: true });
  }
});

test("agent step status and finish manage one work packet", async () => {
  const repoPath = await tempRepoPath();
  try {
    initRepo(repoPath);
    await writeFile(path.join(repoPath, "raw", "source.md"), "# Source\n", "utf8");
    createReview(repoPath, {
      title: "Agent Status",
      targets: ["wiki/Agent Status.md"],
      sources: ["raw/source.md"],
      kind: "compile",
    });

    const step = JSON.parse(agentStep(repoPath, { agent: "status-agent", note: "status start", json: true }).messages[0]) as AgentStepPayload;
    assert.equal(step.started, true);
    assert.equal(step.run?.status, "running");
    assert.equal(step.task?.status, "claimed");
    assert.equal(step.read.includes(step.run?.file ?? ""), true);
    assert.equal(step.read.includes(step.task?.file ?? ""), true);
    assert.match(step.commands.join("\n"), /kforge agent draft/);
    assert.match(step.finish[0] ?? "", /^kforge agent finish/);

    const draft = JSON.parse(agentDraft(repoPath, { agent: "status-agent", json: true }).messages[0]) as AgentDraftPayload;
    assert.equal(draft.run.file, step.run?.file);
    assert.equal(draft.task.file, step.task?.file);
    assert.equal(draft.draft.written, true);
    assert.equal(draft.draft.review, draft.task.source);
    assert.match(draft.draft.output ?? "", /^outputs\/.*agent-status-draft.*\.md$/);
    assert.match(await readFile(path.join(repoPath, draft.draft.output ?? ""), "utf8"), /# Agent Status/);
    assert.match(draft.next.join("\n"), /kforge review content/);
    assert.match(draft.next.join("\n"), /kforge run log/);

    const repeatStep = JSON.parse(agentStep(repoPath, { agent: "status-agent", json: true }).messages[0]) as AgentStepPayload;
    assert.equal(repeatStep.started, false);
    assert.equal(repeatStep.run?.file, step.run?.file);

    const status = JSON.parse(agentStatus(repoPath, { agent: "status-agent", json: true }).messages[0]) as AgentStatusPayload;

    assert.equal(status.agent, "status-agent");
    assert.equal(status.runningRuns[0]?.file, step.run?.file);
    assert.equal(status.claimedTasks[0]?.file, step.task?.file);
    assert.match(status.next[0], /^kforge agent step/);

    const finished = JSON.parse(
      agentFinish(repoPath, { agent: "status-agent", status: "success", note: "done", taskDone: true, json: true }).messages[0],
    ) as AgentFinishPayload;
    assert.equal(finished.run.status, "success");
    assert.equal(finished.task?.status, "done");
    assert.match(finished.next[0], /^kforge agent status/);

    const finishedStatus = JSON.parse(agentStatus(repoPath, { agent: "status-agent", json: true }).messages[0]) as AgentStatusPayload;
    assert.equal(finishedStatus.runningRuns.length, 0);
    assert.equal(finishedStatus.claimedTasks.length, 0);
    assert.match(finishedStatus.next[0], /^kforge agent next/);
  } finally {
    await rm(repoPath, { recursive: true, force: true });
  }
});

test("agent plan assigns independent runs for multiple agents", async () => {
  const repoPath = await tempRepoPath();
  try {
    initRepo(repoPath);
    await writeFile(path.join(repoPath, "raw", "source.md"), "# Source\n", "utf8");
    createReview(repoPath, {
      title: "Parallel One",
      targets: ["wiki/Parallel One.md"],
      sources: ["raw/source.md"],
      kind: "compile",
    });
    createReview(repoPath, {
      title: "Parallel Two",
      targets: ["wiki/Parallel Two.md"],
      sources: ["raw/source.md"],
      kind: "compile",
    });

    const plan = JSON.parse(
      agentPlan(repoPath, { agents: ["agent-a", "agent-b", "agent-a"], note: "parallel start", json: true }).messages[0],
    ) as AgentPlanPayload;

    assert.equal(plan.requested, 2);
    assert.equal(plan.started, 2);
    assert.equal(plan.seeded.counts.created, 2);
    assert.deepEqual(plan.unassignedAgents, []);
    assert.equal(new Set(plan.assignments.map((assignment) => assignment.task.file)).size, 2);
    assert.equal(new Set(plan.assignments.map((assignment) => assignment.run.file)).size, 2);
    assert.deepEqual(
      plan.assignments.map((assignment) => assignment.agent),
      ["agent-a", "agent-b"],
    );
    assert.match(plan.assignments[0]?.commands.join("\n") ?? "", /kforge agent draft/);
    assert.match(plan.assignments[0]?.finish[0] ?? "", /^kforge agent finish/);
    assert.match(plan.next.join("\n"), /kforge agent step/);

    const statusA = JSON.parse(agentStatus(repoPath, { agent: "agent-a", json: true }).messages[0]) as AgentStatusPayload;
    const statusB = JSON.parse(agentStatus(repoPath, { agent: "agent-b", json: true }).messages[0]) as AgentStatusPayload;
    assert.equal(statusA.runningRuns[0]?.file, plan.assignments[0]?.run.file);
    assert.equal(statusB.runningRuns[0]?.file, plan.assignments[1]?.run.file);
    assert.match(await readFile(path.join(repoPath, plan.assignments[0]?.run.file ?? ""), "utf8"), /parallel start/);

    const secondPlan = JSON.parse(
      agentPlan(repoPath, { agents: ["agent-c"], seed: false, json: true }).messages[0],
    ) as AgentPlanPayload;
    assert.equal(secondPlan.started, 0);
    assert.deepEqual(secondPlan.unassignedAgents, ["agent-c"]);
  } finally {
    await rm(repoPath, { recursive: true, force: true });
  }
});

test("agent launch prepares a parallel worker script", async () => {
  const repoPath = await tempRepoPath();
  try {
    initRepo(repoPath);
    await writeFile(path.join(repoPath, "raw", "source.md"), "# Source\n", "utf8");
    createReview(repoPath, {
      title: "Launch One",
      targets: ["wiki/Launch One.md"],
      sources: ["raw/source.md"],
      kind: "compile",
    });
    createReview(repoPath, {
      title: "Launch Two",
      targets: ["wiki/Launch Two.md"],
      sources: ["raw/source.md"],
      kind: "compile",
    });

    const payload = JSON.parse(
      agentLaunch(repoPath, {
        agents: ["launch-a", "launch-b"],
        command: "printf {agent}-{run}",
        note: "parallel launch",
        write: true,
        json: true,
      }).messages[0],
    ) as AgentLaunchPayload;

    assert.equal(payload.ok, true);
    assert.equal(payload.source, "planned");
    assert.equal(payload.items.length, 2);
    assert.equal(payload.written, true);
    assert.match(payload.script.file ?? "", /^runs\/.+agent-launch.*\.sh$/);
    assert.match(payload.script.content, /pids=\(\)/);
    assert.match(payload.items[0]?.command ?? "", /^printf launch-a-runs\//);
    assert.match(payload.items[0]?.prompt ?? "", /kforge agent step/);
    assert.match(payload.items[0]?.log ?? "", /^runs\/.+launch-launch-a.*\.log$/);
    assert.match(await readFile(path.join(repoPath, payload.script.file ?? ""), "utf8"), /kforge agent launch/);

    const runs = JSON.parse(listRuns(repoPath, { status: "all", json: true }).messages[0]) as RunListPayload;
    assert.equal(runs.total, 2);

    const executed = JSON.parse(
      agentLaunch(repoPath, {
        agents: ["launch-a", "launch-b"],
        command: "printf {agent}:{run}",
        noPlan: true,
        exec: true,
        json: true,
      }).messages[0],
    ) as AgentLaunchPayload;
    assert.equal(executed.executed, true);
    assert.equal(executed.exitCode, 0);
    assert.match(await readFile(path.join(repoPath, executed.items[0]?.log ?? ""), "utf8"), /launch-a:runs\//);
  } finally {
    await rm(repoPath, { recursive: true, force: true });
  }
});

test("agent board summarizes active multi-agent coordination", async () => {
  const repoPath = await tempRepoPath();
  try {
    initRepo(repoPath);
    await writeFile(path.join(repoPath, "raw", "source.md"), "# Source\n", "utf8");
    createReview(repoPath, {
      title: "Board Run",
      targets: ["wiki/Board Run.md"],
      sources: ["raw/source.md"],
      kind: "compile",
    });
    createReview(repoPath, {
      title: "Board Claimed",
      targets: ["wiki/Board Claimed.md"],
      sources: ["raw/source.md"],
      kind: "compile",
    });
    createReview(repoPath, {
      title: "Board Open",
      targets: ["wiki/Board Open.md"],
      sources: ["raw/source.md"],
      kind: "compile",
    });

    const plan = JSON.parse(agentPlan(repoPath, { agents: ["board-agent"], limit: 1, json: true }).messages[0]) as AgentPlanPayload;
    const claimedOnly = JSON.parse(nextTask(repoPath, { agent: "waiting-agent", json: true }).messages[0]) as TaskNextPayload;
    assert.ok(plan.assignments[0]);
    assert.ok(claimedOnly.task);
    await writeFile(path.join(repoPath, plan.assignments[0].task.file), await readFile(path.join(repoPath, plan.assignments[0].task.file), "utf8").then((text) => text.replace("Status: claimed", "Status: done")), "utf8");

    const board = JSON.parse(agentBoard(repoPath, { json: true }).messages[0]) as AgentBoardPayload;

    assert.equal(board.counts.agents, 2);
    assert.equal(board.counts.runningRuns, 1);
    assert.equal(board.counts.claimedTasks, 1);
    assert.equal(board.counts.openTasks, 1);
    assert.equal(board.counts.orphanClaimedTasks, 1);
    assert.equal(board.counts.runsWithoutClaimedTask, 1);
    assert.equal(board.orphanClaimedTasks[0]?.owner, "waiting-agent");
    assert.equal(board.runsWithoutClaimedTask[0]?.agent, "board-agent");
    assert.match(board.agents.find((agent) => agent.agent === "board-agent")?.next.join("\n") ?? "", /agent step/);
    assert.match(board.next.join("\n"), /agent plan|run start|run inspect/);
    assert.match(agentBoard(repoPath).messages[0], /# Agent Board/);
  } finally {
    await rm(repoPath, { recursive: true, force: true });
  }
});

test("compileDraft creates wiki draft templates from reviews and source target pairs", async () => {
  const repoPath = await tempRepoPath();
  try {
    initRepo(repoPath);
    await writeFile(path.join(repoPath, "raw", "source.md"), "# Source\n\nImportant evidence.\n", "utf8");
    await import("node:fs/promises").then((fs) => fs.mkdir(path.join(repoPath, "raw", "_meta"), { recursive: true }));
    await writeFile(
      path.join(repoPath, "raw", "_meta", "source.md"),
      "# Source Metadata: Source Title\n\nSource file: `raw/source.md`\nAdded: 2026-05-28\nOriginal path: `/tmp/source.md`\nURL: https://example.org/source\nAuthor: Researcher\nLicense: CC-BY\n\n## Notes\n\nMetadata note.\n",
      "utf8",
    );
    await writeFile(
      path.join(repoPath, "wiki", "Draft.md"),
      "---\ntitle: Draft\nsources:\n  - raw/source.md\n---\n# Existing Draft\n",
      "utf8",
    );
    createReview(repoPath, {
      title: "Compile draft",
      targets: ["wiki/Draft.md"],
      sources: ["raw/source.md"],
      kind: "compile",
    });

    const printed = compileDraftRepo(repoPath, {
      review: `reviews/${today()}-compile-draft.md`,
    });
    const written = compileDraftRepo(repoPath, {
      review: `reviews/${today()}-compile-draft.md`,
      write: true,
    });
    const printedJson = JSON.parse(
      compileDraftRepo(repoPath, {
        review: `reviews/${today()}-compile-draft.md`,
        json: true,
      }).messages[0],
    ) as CompileDraftPayload;
    const writtenJson = JSON.parse(
      compileDraftRepo(repoPath, {
        review: `reviews/${today()}-compile-draft.md`,
        write: true,
        json: true,
      }).messages[0],
    ) as CompileDraftPayload;
    const direct = compileDraftRepo(repoPath, {
      sources: ["raw/source.md"],
      target: "wiki/Direct.md",
      title: "Direct Draft",
    });

    assert.equal(printed.ok, true);
    assert.match(printed.messages[0], /# Draft/);
    assert.match(printed.messages[0], /sources:\n  - raw\/source.md/);
    assert.match(printed.messages[0], /## Source Metadata/);
    assert.match(printed.messages[0], /Source Title/);
    assert.match(printed.messages[0], /https:\/\/example\.org\/source/);
    assert.match(printed.messages[0], /## Source Excerpts/);
    assert.match(printed.messages[0], /Important evidence/);
    assert.match(printed.messages[0], /## Existing Target/);
    assert.match(printed.messages[0], /# Existing Draft/);
    assert.match(printed.messages[0], /review: `reviews\/.*compile-draft.md`/);
    assert.equal(printedJson.ok, true);
    assert.equal(printedJson.written, false);
    assert.equal(printedJson.title, "Draft");
    assert.equal(printedJson.target, "wiki/Draft.md");
    assert.deepEqual(printedJson.sources, ["raw/source.md"]);
    assert.equal(printedJson.review, `reviews/${today()}-compile-draft.md`);
    assert.match(printedJson.content ?? "", /# Draft/);
    assert.equal(printedJson.output, undefined);
    assert.equal(written.ok, true);
    assert.match(written.messages.join("\n"), /Created outputs\/.*draft-draft.md/);
    assert.match(written.messages.join("\n"), /kforge review content/);
    assert.match(await readFile(path.join(repoPath, "outputs", `${today()}-draft-draft.md`), "utf8"), /# Draft/);
    assert.equal(writtenJson.ok, true);
    assert.equal(writtenJson.written, true);
    assert.equal(writtenJson.output, `outputs/${today()}-draft-draft-2.md`);
    assert.equal(writtenJson.content, undefined);
    assert.match(writtenJson.next.join("\n"), /kforge review content/);
    assert.match(await readFile(path.join(repoPath, "outputs", `${today()}-draft-draft-2.md`), "utf8"), /# Draft/);
    assert.equal(direct.ok, true);
    assert.match(direct.messages[0], /# Direct Draft/);
  } finally {
    await rm(repoPath, { recursive: true, force: true });
  }
});

test("compileDraft rejects non-compile reviews and unsafe inputs", async () => {
  const repoPath = await tempRepoPath();
  try {
    initRepo(repoPath);
    await writeFile(path.join(repoPath, "raw", "source.md"), "# Source\n", "utf8");
    createReview(repoPath, {
      title: "Merge review",
      targets: ["wiki/Merge.md"],
      sources: ["raw/source.md"],
      kind: "merge",
    });

    const wrongKind = compileDraftRepo(repoPath, {
      review: `reviews/${today()}-merge-review.md`,
    });
    const unsafeTarget = compileDraftRepo(repoPath, {
      sources: ["raw/source.md"],
      target: "../outside.md",
    });
    const nonWikiTarget = compileDraftRepo(repoPath, {
      sources: ["raw/source.md"],
      target: "claims/outside.md",
    });

    assert.equal(wrongKind.ok, false);
    assert.match(wrongKind.messages.join("\n"), /requires a compile review/);
    assert.equal(unsafeTarget.ok, false);
    assert.match(unsafeTarget.messages.join("\n"), /outside repo/);
    assert.equal(nonWikiTarget.ok, false);
    assert.match(nonWikiTarget.messages.join("\n"), /must be under wiki/);
  } finally {
    await rm(repoPath, { recursive: true, force: true });
  }
});

test("updateReviewStatus records lifecycle and clears review debt", async () => {
  const repoPath = await tempRepoPath();
  try {
    initRepo(repoPath);
    await writeFile(path.join(repoPath, "raw", "source.md"), "# Source\n", "utf8");
    createReview(repoPath, {
      title: "Compile provenance article",
      targets: ["wiki/Provenance.md"],
      sources: ["raw/source.md"],
      kind: "compile",
    });

    const reviewFile = `reviews/${today()}-compile-provenance-article.md`;
    const updated = updateReviewStatus(repoPath, {
      file: reviewFile,
      status: "accepted",
      note: "Looks safe to apply.",
    });
    const context = contextRepo(repoPath);
    const score = scoreRepo(repoPath);

    assert.equal(updated.ok, true);
    assert.match(await readFile(path.join(repoPath, reviewFile), "utf8"), /Status: accepted/);
    assert.match(await readFile(path.join(repoPath, reviewFile), "utf8"), /Status History/);
    assert.match(await readFile(path.join(repoPath, reviewFile), "utf8"), /Looks safe to apply/);
    assert.match(context.messages[0], /No open review files found/);
    assert.match(score.messages[0], /Trust Score: 100\/100/);
    assert.match(score.messages[0], /review debt clearance: 100%/);
  } finally {
    await rm(repoPath, { recursive: true, force: true });
  }
});

test("updateReviewStatus rejects non-review paths", async () => {
  const repoPath = await tempRepoPath();
  try {
    initRepo(repoPath);
    await writeFile(path.join(repoPath, "raw", "source.md"), "# Source\n", "utf8");

    const result = updateReviewStatus(repoPath, {
      file: "raw/source.md",
      status: "applied",
    });

    assert.equal(result.ok, false);
    assert.equal(result.messages.some((message) => message.includes("reviews/")), true);
  } finally {
    await rm(repoPath, { recursive: true, force: true });
  }
});

test("updateReviewContent writes proposed content from inline text and repo files", async () => {
  const repoPath = await tempRepoPath();
  try {
    initRepo(repoPath);
    await writeFile(path.join(repoPath, "raw", "source.md"), "# Source\n", "utf8");
    await writeFile(
      path.join(repoPath, "outputs", "draft.md"),
      "---\ntitle: Draft\nsources:\n  - raw/source.md\n---\n# Draft\n\nCompiled from source.\n",
      "utf8",
    );
    createReview(repoPath, {
      title: "Draft article",
      targets: ["wiki/Draft.md"],
      sources: ["raw/source.md"],
      kind: "compile",
    });

    const reviewFile = `reviews/${today()}-draft-article.md`;
    const inline = updateReviewContent(repoPath, {
      file: reviewFile,
      content: "# Inline\n\nA `code fence` safe draft.",
    });
    const fromFile = updateReviewContent(repoPath, {
      file: reviewFile,
      from: "outputs/draft.md",
    });
    const fromFileJson = JSON.parse(
      updateReviewContent(repoPath, {
        file: reviewFile,
        from: "outputs/draft.md",
        json: true,
      }).messages[0],
    ) as ReviewContentPayload;
    const accepted = updateReviewStatus(repoPath, {
      file: reviewFile,
      status: "accepted",
    });
    const acceptedJson = JSON.parse(
      updateReviewStatus(repoPath, {
        file: reviewFile,
        status: "accepted",
        json: true,
      }).messages[0],
    ) as ReviewStatusPayload;
    const dryRunJson = JSON.parse(applyReview(repoPath, { file: reviewFile, dryRun: true, json: true }).messages[0]) as ReviewApplyPayload;
    const applied = applyReview(repoPath, { file: reviewFile });

    assert.equal(inline.ok, true);
    assert.match(await readFile(path.join(repoPath, reviewFile), "utf8"), /# Inline/);
    assert.equal(fromFile.ok, true);
    assert.match(fromFile.messages.join("\n"), /outputs\/draft.md/);
    assert.equal(fromFileJson.ok, true);
    assert.equal(fromFileJson.review, reviewFile);
    assert.equal(fromFileJson.source, "outputs/draft.md");
    assert.match(fromFileJson.next.join("\n"), /review status/);
    assert.equal(accepted.ok, true);
    assert.equal(acceptedJson.ok, true);
    assert.equal(acceptedJson.review, reviewFile);
    assert.equal(acceptedJson.previousStatus, "accepted");
    assert.equal(acceptedJson.status, "accepted");
    assert.match(acceptedJson.next.join("\n"), /review apply/);
    assert.equal(dryRunJson.ok, true);
    assert.equal(dryRunJson.dryRun, true);
    assert.equal(dryRunJson.target, "wiki/Draft.md");
    assert.equal(dryRunJson.status, "accepted");
    assert.match(dryRunJson.content ?? "", /# Draft/);
    assert.match(dryRunJson.next.join("\n"), /review apply/);
    assert.equal(applied.ok, true);
    assert.match(await readFile(path.join(repoPath, "wiki", "Draft.md"), "utf8"), /# Draft/);
  } finally {
    await rm(repoPath, { recursive: true, force: true });
  }
});

test("updateReviewContent rejects ambiguous and unsafe inputs", async () => {
  const repoPath = await tempRepoPath();
  try {
    initRepo(repoPath);
    await writeFile(path.join(repoPath, "raw", "source.md"), "# Source\n", "utf8");
    createReview(repoPath, {
      title: "Unsafe content",
      targets: ["wiki/Unsafe.md"],
      sources: ["raw/source.md"],
    });

    const reviewFile = `reviews/${today()}-unsafe-content.md`;
    const missingInput = updateReviewContent(repoPath, { file: reviewFile });
    const ambiguous = updateReviewContent(repoPath, {
      file: reviewFile,
      content: "# Draft",
      from: "outputs/draft.md",
    });
    const outside = updateReviewContent(repoPath, {
      file: reviewFile,
      from: "../outside.md",
    });
    const self = updateReviewContent(repoPath, {
      file: reviewFile,
      from: reviewFile,
    });

    assert.equal(missingInput.ok, false);
    assert.match(missingInput.messages.join("\n"), /requires --content or --from/);
    assert.equal(ambiguous.ok, false);
    assert.match(ambiguous.messages.join("\n"), /either --content or --from/);
    assert.equal(outside.ok, false);
    assert.match(outside.messages.join("\n"), /outside repo/);
    assert.equal(self.ok, false);
    assert.match(self.messages.join("\n"), /cannot be the review file itself/);
  } finally {
    await rm(repoPath, { recursive: true, force: true });
  }
});

test("review lifecycle blocks unresolved compile draft markers", async () => {
  const repoPath = await tempRepoPath();
  try {
    initRepo(repoPath);
    await writeFile(path.join(repoPath, "raw", "source.md"), "# Source\n", "utf8");
    createReview(repoPath, {
      title: "Todo draft",
      targets: ["wiki/Todo.md"],
      sources: ["raw/source.md"],
      kind: "compile",
      status: "accepted",
      content: "---\ntitle: Todo\nsources:\n  - raw/source.md\n---\n# Todo\n\nTODO: Write a concise source-grounded summary.\n",
    });

    const reviewFile = `reviews/${today()}-todo-draft.md`;
    const queue = reviewQueue(repoPath);
    const doctor = doctorRepo(repoPath);
    const statusUpdate = updateReviewStatus(repoPath, {
      file: reviewFile,
      status: "accepted",
    });
    const apply = applyReview(repoPath, { file: reviewFile });

    assert.match(queue.messages[0], /unresolved draft marker/);
    assert.match(queue.messages[0], /TODO: Write a concise source-grounded summary/);
    assert.equal(doctor.ok, false);
    assert.match(doctor.messages.join("\n"), /unresolved draft markers/);
    assert.equal(statusUpdate.ok, false);
    assert.match(statusUpdate.messages.join("\n"), /Replace TODOs/);
    assert.equal(apply.ok, false);
    assert.match(apply.messages.join("\n"), /Replace TODOs/);
  } finally {
    await rm(repoPath, { recursive: true, force: true });
  }
});

test("applyReview writes accepted proposed content and marks review applied", async () => {
  const repoPath = await tempRepoPath();
  try {
    initRepo(repoPath);
    await writeFile(path.join(repoPath, "raw", "source.md"), "# Source\n", "utf8");
    const content = [
      "---",
      "title: Provenance",
      "status: draft",
      "kind: concept",
      "sources:",
      "  - raw/source.md",
      "confidence: medium",
      "---",
      "",
      "# Provenance",
      "",
      "## Evidence",
      "",
      "A source-grounded page.",
      "",
    ].join("\n");
    createReview(repoPath, {
      title: "Apply provenance article",
      targets: ["wiki/Provenance.md"],
      sources: ["raw/source.md"],
      kind: "compile",
      status: "accepted",
      content,
    });

    const reviewFile = `reviews/${today()}-apply-provenance-article.md`;
    const result = applyReview(repoPath, {
      file: reviewFile,
      note: "Applied after review.",
    });
    createReview(repoPath, {
      title: "Apply provenance article json",
      targets: ["wiki/ProvenanceJson.md"],
      sources: ["raw/source.md"],
      kind: "compile",
      status: "accepted",
      content,
    });
    const jsonReviewFile = `reviews/${today()}-apply-provenance-article-json.md`;
    const json = JSON.parse(
      applyReview(repoPath, {
        file: jsonReviewFile,
        note: "Applied after review.",
        json: true,
      }).messages[0],
    ) as ReviewApplyPayload;
    const score = scoreRepo(repoPath);

    assert.equal(result.ok, true);
    assert.equal(await readFile(path.join(repoPath, "wiki", "Provenance.md"), "utf8"), content);
    assert.equal(json.ok, true);
    assert.equal(json.dryRun, false);
    assert.equal(json.review, jsonReviewFile);
    assert.equal(json.target, "wiki/ProvenanceJson.md");
    assert.equal(json.previousStatus, "accepted");
    assert.equal(json.status, "applied");
    assert.equal(json.content, undefined);
    assert.match(json.next.join("\n"), /doctor/);
    assert.equal(await readFile(path.join(repoPath, "wiki", "ProvenanceJson.md"), "utf8"), content);
    assert.match(await readFile(path.join(repoPath, reviewFile), "utf8"), /Status: applied/);
    assert.match(await readFile(path.join(repoPath, jsonReviewFile), "utf8"), /Status: applied/);
    assert.match(await readFile(path.join(repoPath, reviewFile), "utf8"), /accepted` -> `applied/);
    assert.match(score.messages[0], /Trust Score: 100\/100/);
  } finally {
    await rm(repoPath, { recursive: true, force: true });
  }
});

test("applyReview can write accepted proposed content to claims", async () => {
  const repoPath = await tempRepoPath();
  try {
    initRepo(repoPath);
    await writeFile(path.join(repoPath, "raw", "source.md"), "# Source\n", "utf8");
    const content = [
      "# Claim: Review apply supports claim targets",
      "",
      "Status: reviewed",
      "Confidence: medium",
      "",
      "## Assertion",
      "",
      "Accepted reviews can file durable assertions into claims.",
      "",
      "## Sources",
      "",
      "- `raw/source.md`",
      "",
    ].join("\n");
    createReview(repoPath, {
      title: "Apply claim artifact",
      targets: ["claims/review-apply-supports-claim-targets.md"],
      sources: ["raw/source.md"],
      kind: "merge",
      status: "accepted",
      content,
    });

    const reviewFile = `reviews/${today()}-apply-claim-artifact.md`;
    const result = applyReview(repoPath, { file: reviewFile });

    assert.equal(result.ok, true);
    assert.equal(
      await readFile(path.join(repoPath, "claims", "review-apply-supports-claim-targets.md"), "utf8"),
      content,
    );
    assert.match(await readFile(path.join(repoPath, reviewFile), "utf8"), /Status: applied/);
  } finally {
    await rm(repoPath, { recursive: true, force: true });
  }
});

test("applyReview refuses proposed reviews and missing proposed content", async () => {
  const repoPath = await tempRepoPath();
  try {
    initRepo(repoPath);
    await writeFile(path.join(repoPath, "raw", "source.md"), "# Source\n", "utf8");
    createReview(repoPath, {
      title: "Proposed apply",
      targets: ["wiki/Proposed.md"],
      sources: ["raw/source.md"],
      status: "proposed",
      content: "# Proposed\n",
    });
    createReview(repoPath, {
      title: "No content apply",
      targets: ["wiki/Missing.md"],
      sources: ["raw/source.md"],
      status: "accepted",
    });

    const proposed = applyReview(repoPath, {
      file: `reviews/${today()}-proposed-apply.md`,
    });
    const missingContent = applyReview(repoPath, {
      file: `reviews/${today()}-no-content-apply.md`,
    });

    assert.equal(proposed.ok, false);
    assert.equal(proposed.messages.some((message) => message.includes("must be accepted")), true);
    assert.equal(missingContent.ok, false);
    assert.equal(missingContent.messages.some((message) => message.includes("Proposed Content")), true);
    await assert.rejects(readFile(path.join(repoPath, "wiki", "Proposed.md"), "utf8"));
    await assert.rejects(readFile(path.join(repoPath, "wiki", "Missing.md"), "utf8"));
  } finally {
    await rm(repoPath, { recursive: true, force: true });
  }
});

test("applyReview dry run does not write target or mark applied", async () => {
  const repoPath = await tempRepoPath();
  try {
    initRepo(repoPath);
    await writeFile(path.join(repoPath, "raw", "source.md"), "# Source\n", "utf8");
    createReview(repoPath, {
      title: "Dry run apply",
      targets: ["wiki/Dry Run.md"],
      sources: ["raw/source.md"],
      status: "accepted",
      content: "# Dry Run\n",
    });

    const reviewFile = `reviews/${today()}-dry-run-apply.md`;
    const result = applyReview(repoPath, {
      file: reviewFile,
      dryRun: true,
    });

    assert.equal(result.ok, true);
    assert.match(result.messages.join("\n"), /Dry run/);
    assert.match(await readFile(path.join(repoPath, reviewFile), "utf8"), /Status: accepted/);
    await assert.rejects(readFile(path.join(repoPath, "wiki", "Dry Run.md"), "utf8"));
  } finally {
    await rm(repoPath, { recursive: true, force: true });
  }
});

test("promoteOutput creates review content from an output and can apply to wiki", async () => {
  const repoPath = await tempRepoPath();
  try {
    initRepo(repoPath);
    await writeFile(path.join(repoPath, "raw", "source.md"), "# Source\n", "utf8");
    const outputContent = [
      "---",
      "title: Filed Output",
      "sources:",
      "  - raw/source.md",
      "---",
      "",
      "# Filed Output",
      "",
      "This durable note came from an output artifact.",
      "",
    ].join("\n");
    await writeFile(path.join(repoPath, "outputs", "filed-output.md"), outputContent, "utf8");

    const promoted = promoteOutput(repoPath, {
      file: "outputs/filed-output.md",
      target: "wiki/Filed Output.md",
      sources: ["raw/source.md"],
      title: "Promote filed output",
      status: "accepted",
      json: true,
    });
    const promotedPayload = JSON.parse(promoted.messages[0]) as PromoteOutputPayload;
    const reviewFile = `reviews/${today()}-promote-filed-output.md`;
    const applied = applyReview(repoPath, { file: reviewFile });

    assert.equal(promoted.ok, true);
    assert.equal(promotedPayload.ok, true);
    assert.equal(promotedPayload.output, "outputs/filed-output.md");
    assert.equal(promotedPayload.target, "wiki/Filed Output.md");
    assert.equal(promotedPayload.review, reviewFile);
    assert.equal(promotedPayload.status, "accepted");
    assert.equal(promotedPayload.title, "Promote filed output");
    assert.deepEqual(promotedPayload.sources, ["outputs/filed-output.md", "raw/source.md"]);
    assert.match(promotedPayload.next.join("\n"), /review apply/);
    const review = await readFile(path.join(repoPath, reviewFile), "utf8");
    assert.match(review, /outputs\/filed-output.md/);
    assert.match(review, /raw\/source.md/);
    assert.match(review, /# Filed Output/);
    assert.equal(applied.ok, true);
    assert.equal(await readFile(path.join(repoPath, "wiki", "Filed Output.md"), "utf8"), outputContent);
  } finally {
    await rm(repoPath, { recursive: true, force: true });
  }
});

test("promoteOutput blocks accepted outputs with unresolved draft markers", async () => {
  const repoPath = await tempRepoPath();
  try {
    initRepo(repoPath);
    await writeFile(path.join(repoPath, "raw", "source.md"), "# Source\n", "utf8");
    await writeFile(
      path.join(repoPath, "outputs", "answer-pack.md"),
      "# Answer Pack\n\nTODO: Answer the question using the evidence below.\n",
      "utf8",
    );

    const promoted = promoteOutput(repoPath, {
      file: "outputs/answer-pack.md",
      target: "wiki/Answer.md",
      sources: ["raw/source.md"],
      title: "Promote answer pack",
      status: "accepted",
    });
    const staged = promoteOutput(repoPath, {
      file: "outputs/answer-pack.md",
      target: "wiki/Answer.md",
      sources: ["raw/source.md"],
      title: "Stage answer pack",
    });

    assert.equal(promoted.ok, false);
    assert.match(promoted.messages.join("\n"), /unresolved draft markers/);
    assert.match(promoted.messages.join("\n"), /TODO: Answer the question/);
    assert.equal(staged.ok, true);
  } finally {
    await rm(repoPath, { recursive: true, force: true });
  }
});

test("promoteOutput can stage and apply an output as a claim", async () => {
  const repoPath = await tempRepoPath();
  try {
    initRepo(repoPath);
    await writeFile(path.join(repoPath, "raw", "source.md"), "# Source\n", "utf8");
    const outputContent = [
      "# Claim: Output promotion supports claims",
      "",
      "Status: reviewed",
      "Confidence: medium",
      "",
      "## Assertion",
      "",
      "Useful outputs can become durable claim artifacts after review.",
      "",
      "## Sources",
      "",
      "- `raw/source.md`",
      "",
    ].join("\n");
    await writeFile(path.join(repoPath, "outputs", "claim-output.md"), outputContent, "utf8");

    const promoted = promoteOutput(repoPath, {
      file: "outputs/claim-output.md",
      target: "claims/output-promotion-supports-claims.md",
      title: "Promote output claim",
      status: "accepted",
    });
    const applied = applyReview(repoPath, { file: `reviews/${today()}-promote-output-claim.md` });

    assert.equal(promoted.ok, true);
    assert.match(
      promoted.messages.join("\n"),
      /Promoted outputs\/claim-output.md -> claims\/output-promotion-supports-claims.md/,
    );
    assert.equal(applied.ok, true);
    assert.equal(
      await readFile(path.join(repoPath, "claims", "output-promotion-supports-claims.md"), "utf8"),
      outputContent,
    );
  } finally {
    await rm(repoPath, { recursive: true, force: true });
  }
});

test("promoteOutput rejects non-output files and non-filing targets", async () => {
  const repoPath = await tempRepoPath();
  try {
    initRepo(repoPath);
    await writeFile(path.join(repoPath, "raw", "source.md"), "# Source\n", "utf8");
    await writeFile(path.join(repoPath, "outputs", "answer.md"), "# Answer\n", "utf8");

    const rawFile = promoteOutput(repoPath, {
      file: "raw/source.md",
      target: "wiki/Answer.md",
    });
    const badTarget = promoteOutput(repoPath, {
      file: "outputs/answer.md",
      target: "indexes/answer.md",
    });

    assert.equal(rawFile.ok, false);
    assert.match(rawFile.messages[0], /outputs/);
    assert.equal(badTarget.ok, false);
    assert.match(badTarget.messages[0], /wiki\/ or claims\//);
  } finally {
    await rm(repoPath, { recursive: true, force: true });
  }
});

test("context prints an agent context pack", async () => {
  const repoPath = await tempRepoPath();
  try {
    initRepo(repoPath);
    await writeFile(path.join(repoPath, "raw", "source.md"), "# Source\n", "utf8");
    createClaim(repoPath, {
      title: "Context needs claims",
      sources: ["raw/source.md"],
    });
    createReview(repoPath, {
      title: "Compile context article",
      targets: ["wiki/Context.md"],
      sources: ["raw/source.md"],
    });

    const result = contextRepo(repoPath);

    assert.equal(result.ok, true);
    assert.match(result.messages[0], /# Agent Context/);
    assert.match(result.messages[0], /Open Reviews/);
    assert.match(result.messages[0], /Context needs claims/);
    assert.match(result.messages[0], /Compile context article/);
  } finally {
    await rm(repoPath, { recursive: true, force: true });
  }
});

test("context writes indexes/context.md when requested", async () => {
  const repoPath = await tempRepoPath();
  try {
    initRepo(repoPath);

    const result = contextRepo(repoPath, { write: true });

    assert.equal(result.ok, true);
    assert.match(await readFile(path.join(repoPath, "indexes", "context.md"), "utf8"), /# Agent Context/);
  } finally {
    await rm(repoPath, { recursive: true, force: true });
  }
});

test("score reports trust metrics for an example repo", async () => {
  const repoPath = await tempRepoPath();
  try {
    initRepo(repoPath, { example: true });

    const result = scoreRepo(repoPath);

    assert.equal(result.ok, true);
    assert.match(result.messages[0], /# Trust Score/);
    assert.match(result.messages[0], /Trust Score: 83\/100/);
    assert.match(result.messages[0], /wiki provenance coverage: 100%/);
    assert.match(result.messages[0], /claim provenance coverage: 100%/);
    assert.match(result.messages[0], /review source coverage: 100%/);
    assert.match(result.messages[0], /review debt clearance: 0%/);
    assert.match(result.messages[0], /doctor health: clean/);
  } finally {
    await rm(repoPath, { recursive: true, force: true });
  }
});

test("score writes indexes/score.md when requested", async () => {
  const repoPath = await tempRepoPath();
  try {
    initRepo(repoPath);

    const result = scoreRepo(repoPath, { write: true });

    assert.equal(result.ok, true);
    assert.match(result.messages[0], /indexes\/score.md/);
    assert.match(await readFile(path.join(repoPath, "indexes", "score.md"), "utf8"), /# Trust Score/);
  } finally {
    await rm(repoPath, { recursive: true, force: true });
  }
});

test("search finds text matches and respects scopes", async () => {
  const repoPath = await tempRepoPath();
  try {
    initRepo(repoPath);
    await writeFile(path.join(repoPath, "raw", "source.md"), "Raw provenance notes.\n", "utf8");
    await writeFile(
      path.join(repoPath, "wiki", "Provenance.md"),
      "---\nsources:\n  - raw/source.md\n---\n# Provenance\nClaim provenance keeps wiki pages safer.\n",
      "utf8",
    );

    const allResults = searchRepo(repoPath, { query: "provenance", limit: 5 });
    const wikiOnly = searchRepo(repoPath, { query: "provenance", scopes: ["wiki"], limit: 5 });

    assert.equal(allResults.ok, true);
    assert.match(allResults.messages[0], /raw\/source\.md/);
    assert.match(allResults.messages[0], /wiki\/Provenance\.md/);
    assert.equal(wikiOnly.ok, true);
    assert.doesNotMatch(wikiOnly.messages[0], /raw\/source\.md/);
    assert.match(wikiOnly.messages[0], /wiki\/Provenance\.md/);
  } finally {
    await rm(repoPath, { recursive: true, force: true });
  }
});

test("search reports no matches", async () => {
  const repoPath = await tempRepoPath();
  try {
    initRepo(repoPath);

    const result = searchRepo(repoPath, { query: "nonexistent" });

    assert.equal(result.ok, true);
    assert.match(result.messages[0], /No matches found/);
  } finally {
    await rm(repoPath, { recursive: true, force: true });
  }
});

test("ask creates an answer pack with search and inspected files", async () => {
  const repoPath = await tempRepoPath();
  try {
    initRepo(repoPath);
    await writeFile(path.join(repoPath, "raw", "source.md"), "Provenance evidence.\n", "utf8");
    await writeFile(
      path.join(repoPath, "wiki", "Provenance.md"),
      "---\nsources:\n  - raw/source.md\n---\n# Provenance\nProvenance keeps answers grounded.\n",
      "utf8",
    );

    const result = askRepo(repoPath, {
      question: "How does provenance help answers?",
      query: "provenance answers",
      files: ["wiki/Provenance.md"],
    });

    assert.equal(result.ok, true);
    assert.match(result.messages[0], /# Answer Pack/);
    assert.match(result.messages[0], /Question: How does provenance help answers/);
    assert.match(result.messages[0], /# Agent Context/);
    assert.match(result.messages[0], /# Search Results/);
    assert.match(result.messages[0], /# File Inspect/);
    assert.match(result.messages[0], /wiki\/Provenance.md/);
    assert.match(result.messages[0], /TODO: Answer the question/);
  } finally {
    await rm(repoPath, { recursive: true, force: true });
  }
});

test("ask writes answer packs to outputs", async () => {
  const repoPath = await tempRepoPath();
  try {
    initRepo(repoPath);

    const result = askRepo(repoPath, {
      question: "What should I read first?",
      write: true,
    });

    assert.equal(result.ok, true);
    assert.match(result.messages[0], /outputs\/.*what-should-i-read-first-answer-pack.md/);
    assert.match(
      await readFile(path.join(repoPath, "outputs", `${today()}-what-should-i-read-first-answer-pack.md`), "utf8"),
      /# Answer Pack/,
    );
  } finally {
    await rm(repoPath, { recursive: true, force: true });
  }
});

test("listOutputs shows generated outputs and review references", async () => {
  const repoPath = await tempRepoPath();
  try {
    initRepo(repoPath);
    await writeFile(path.join(repoPath, "raw", "source.md"), "# Source\n", "utf8");
    await writeFile(path.join(repoPath, "outputs", "answer.md"), "# Answer\n\nUseful output.\n", "utf8");
    createReview(repoPath, {
      title: "Promote answer",
      targets: ["wiki/Answer.md"],
      sources: ["outputs/answer.md", "raw/source.md"],
      kind: "merge",
    });

    const result = listOutputs(repoPath);
    const json = JSON.parse(listOutputs(repoPath, { json: true }).messages[0]) as OutputListPayload;

    assert.equal(result.ok, true);
    assert.match(result.messages[0], /# Output List/);
    assert.match(result.messages[0], /outputs\/answer.md/);
    assert.match(result.messages[0], /Answer/);
    assert.match(result.messages[0], /\| `outputs\/answer.md` \| Answer \| .* \| 1 \|/);
    assert.equal(json.ok, true);
    assert.equal(json.counts.outputs, 1);
    assert.equal(json.items[0].output, "outputs/answer.md");
    assert.equal(json.items[0].title, "Answer");
    assert.deepEqual(json.items[0].reviewRefs, [`reviews/${today()}-promote-answer.md`]);
  } finally {
    await rm(repoPath, { recursive: true, force: true });
  }
});

test("inspectOutput shows output metadata references and promotion guidance", async () => {
  const repoPath = await tempRepoPath();
  try {
    initRepo(repoPath);
    await writeFile(path.join(repoPath, "raw", "source.md"), "# Source\n", "utf8");
    await writeFile(
      path.join(repoPath, "outputs", "answer.md"),
      "---\ntitle: Answer\nsources:\n  - raw/source.md\n---\n# Answer\n\nUseful output.\n",
      "utf8",
    );
    createReview(repoPath, {
      title: "Promote answer",
      targets: ["wiki/Answer.md"],
      sources: ["outputs/answer.md", "raw/source.md"],
      kind: "merge",
    });

    const result = inspectOutput(repoPath, { file: "outputs/answer.md" });
    const json = JSON.parse(inspectOutput(repoPath, { file: "outputs/answer.md", json: true }).messages[0]) as OutputInspectPayload;
    const invalid = inspectOutput(repoPath, { file: "wiki/Home.md" });

    assert.equal(result.ok, true);
    assert.match(result.messages[0], /# Output Inspect/);
    assert.match(result.messages[0], /- title: Answer/);
    assert.match(result.messages[0], /Sources Mentioned By Output/);
    assert.match(result.messages[0], /`raw\/source.md`/);
    assert.match(result.messages[0], /Referenced As Source/);
    assert.match(result.messages[0], /`reviews\/.*promote-answer.md`/);
    assert.match(result.messages[0], /kforge promote --file outputs\/answer.md/);
    assert.equal(json.ok, true);
    assert.equal(json.output, "outputs/answer.md");
    assert.equal(json.title, "Answer");
    assert.equal(json.searchable, true);
    assert.deepEqual(json.headings, ["1 Answer"]);
    assert.deepEqual(json.sources, ["raw/source.md"]);
    assert.deepEqual(json.referencedBy, [`reviews/${today()}-promote-answer.md`]);
    assert.match(json.suggestedCommands.join("\n"), /kforge promote/);
    assert.equal(invalid.ok, false);
  } finally {
    await rm(repoPath, { recursive: true, force: true });
  }
});

test("inspect summarizes a wiki page and backlinks", async () => {
  const repoPath = await tempRepoPath();
  try {
    initRepo(repoPath);
    await writeFile(path.join(repoPath, "raw", "source.md"), "Source evidence.\n", "utf8");
    await writeFile(
      path.join(repoPath, "wiki", "Provenance.md"),
      "---\ntitle: Provenance\nstatus: draft\nkind: concept\nsources:\n  - raw/source.md\n---\n# Provenance\nSee [[Evidence]].\n",
      "utf8",
    );
    await writeFile(
      path.join(repoPath, "wiki", "Evidence.md"),
      "---\nsources:\n  - raw/source.md\n---\n# Evidence\nLinks back to [[Provenance]].\n",
      "utf8",
    );

    const result = inspectRepo(repoPath, { file: "wiki/Provenance.md" });

    assert.equal(result.ok, true);
    assert.match(result.messages[0], /# File Inspect/);
    assert.match(result.messages[0], /Path: `wiki\/Provenance.md`/);
    assert.match(result.messages[0], /- title: Provenance/);
    assert.match(result.messages[0], /`raw\/source.md`/);
    assert.match(result.messages[0], /`Evidence`/);
    assert.match(result.messages[0], /`wiki\/Evidence.md`/);
  } finally {
    await rm(repoPath, { recursive: true, force: true });
  }
});

test("inspect shows files that cite a raw source", async () => {
  const repoPath = await tempRepoPath();
  try {
    initRepo(repoPath);
    await writeFile(path.join(repoPath, "raw", "source.md"), "Source evidence.\n", "utf8");
    await writeFile(
      path.join(repoPath, "wiki", "Provenance.md"),
      "---\nsources:\n  - raw/source.md\n---\n# Provenance\n",
      "utf8",
    );
    createClaim(repoPath, { title: "Source is cited", sources: ["raw/source.md"] });
    createReview(repoPath, {
      title: "Source-backed edit",
      targets: ["wiki/Provenance.md"],
      sources: ["raw/source.md"],
    });

    const result = inspectRepo(repoPath, { file: "raw/source.md" });

    assert.equal(result.ok, true);
    assert.match(result.messages[0], /Referenced As Source/);
    assert.match(result.messages[0], /`wiki\/Provenance.md`/);
    assert.match(result.messages[0], /`claims\/source-is-cited.md`/);
    assert.match(result.messages[0], /`reviews\//);
  } finally {
    await rm(repoPath, { recursive: true, force: true });
  }
});

test("inspect rejects paths outside the repo", async () => {
  const repoPath = await tempRepoPath();
  try {
    initRepo(repoPath);

    const result = inspectRepo(repoPath, { file: "../outside.md" });

    assert.equal(result.ok, false);
    assert.equal(result.messages.some((message) => message.includes("outside repo")), true);
  } finally {
    await rm(repoPath, { recursive: true, force: true });
  }
});

test("inspect rejects symlinks that resolve outside the repo", async () => {
  const repoPath = await tempRepoPath();
  const outsideDir = await tempRepoPath();
  try {
    initRepo(repoPath);
    await writeFile(path.join(outsideDir, "secret.md"), "# Secret\n", "utf8");
    await symlink(path.join(outsideDir, "secret.md"), path.join(repoPath, "raw", "linked-secret.md"));

    const result = inspectRepo(repoPath, { file: "raw/linked-secret.md" });

    assert.equal(result.ok, false);
    assert.match(result.messages.join("\n"), /outside repo via symlink/);
  } finally {
    await rm(repoPath, { recursive: true, force: true });
    await rm(outsideDir, { recursive: true, force: true });
  }
});

test("review apply refuses targets under symlinked directories outside the repo", async () => {
  const repoPath = await tempRepoPath();
  const outsideDir = await tempRepoPath();
  try {
    initRepo(repoPath);
    await writeFile(path.join(repoPath, "raw", "source.md"), "# Source\n", "utf8");
    createReview(repoPath, {
      title: "Symlink escape",
      targets: ["wiki/linked-out/escape.md"],
      sources: ["raw/source.md"],
      status: "accepted",
      content: "# Escaped\n",
    });
    await symlink(outsideDir, path.join(repoPath, "wiki", "linked-out"));

    const result = applyReview(repoPath, { file: `reviews/${today()}-symlink-escape.md` });

    assert.equal(result.ok, false);
    assert.match(result.messages.join("\n"), /outside repo via symlink/);
    await assert.rejects(readFile(path.join(outsideDir, "escape.md"), "utf8"));
  } finally {
    await rm(repoPath, { recursive: true, force: true });
    await rm(outsideDir, { recursive: true, force: true });
  }
});

test("pack combines context search and inspected files", async () => {
  const repoPath = await tempRepoPath();
  try {
    initRepo(repoPath);
    await writeFile(path.join(repoPath, "raw", "source.md"), "Provenance evidence.\n", "utf8");
    await writeFile(
      path.join(repoPath, "wiki", "Provenance.md"),
      "---\nsources:\n  - raw/source.md\n---\n# Provenance\nProvenance evidence matters.\n",
      "utf8",
    );

    const result = packRepo(repoPath, {
      task: "Explain provenance",
      query: "provenance evidence",
      files: ["wiki/Provenance.md"],
    });

    assert.equal(result.ok, true);
    assert.match(result.messages[0], /# Agent Task Pack/);
    assert.match(result.messages[0], /Task: Explain provenance/);
    assert.match(result.messages[0], /# Agent Context/);
    assert.match(result.messages[0], /# Search Results/);
    assert.match(result.messages[0], /# File Inspect/);
    assert.match(result.messages[0], /wiki\/Provenance.md/);
  } finally {
    await rm(repoPath, { recursive: true, force: true });
  }
});

test("pack writes task packs to outputs", async () => {
  const repoPath = await tempRepoPath();
  try {
    initRepo(repoPath);

    const result = packRepo(repoPath, {
      task: "Summarize repo",
      write: true,
    });

    assert.equal(result.ok, true);
    assert.match(result.messages[0], /outputs\/.*summarize-repo-pack.md/);
    assert.match(
      await readFile(path.join(repoPath, "outputs", `${today()}-summarize-repo-pack.md`), "utf8"),
      /# Agent Task Pack/,
    );
  } finally {
    await rm(repoPath, { recursive: true, force: true });
  }
});

test("compile creates a source-to-wiki brief", async () => {
  const repoPath = await tempRepoPath();
  try {
    initRepo(repoPath);
    await writeFile(
      path.join(repoPath, "raw", "source.md"),
      "# Source\n\nProvenance keeps compiled wiki pages auditable.\n",
      "utf8",
    );
    await writeFile(
      path.join(repoPath, "wiki", "Provenance.md"),
      "---\nsources:\n  - raw/source.md\n---\n# Provenance\nExisting note.\n",
      "utf8",
    );

    const result = compileRepo(repoPath, {
      sources: ["raw/source.md"],
      target: "wiki/Provenance.md",
      title: "Provenance",
    });

    assert.equal(result.ok, true);
    assert.match(result.messages[0], /# Compile Brief/);
    assert.match(result.messages[0], /Target: `wiki\/Provenance.md`/);
    assert.match(result.messages[0], /raw\/source.md/);
    assert.match(result.messages[0], /Provenance keeps compiled wiki pages auditable/);
    assert.match(result.messages[0], /Existing Target Excerpt/);
    assert.match(result.messages[0], /last_compiled:/);
  } finally {
    await rm(repoPath, { recursive: true, force: true });
  }
});

test("compilePlan routes uncovered raw sources and marks covered sources", async () => {
  const repoPath = await tempRepoPath();
  try {
    initRepo(repoPath);
    await writeFile(path.join(repoPath, "raw", "covered.md"), "# Covered\n", "utf8");
    await writeFile(path.join(repoPath, "raw", "new-source.md"), "# New Source\n", "utf8");
    await import("node:fs/promises").then((fs) => fs.mkdir(path.join(repoPath, "raw", "_meta"), { recursive: true }));
    await writeFile(
      path.join(repoPath, "raw", "_meta", "new-source.md"),
      "# Source Metadata: New Research Source\n\nSource file: `raw/new-source.md`\nAdded: 2026-05-28\nOriginal path: `/tmp/new-source.md`\n",
      "utf8",
    );
    await writeFile(
      path.join(repoPath, "wiki", "Covered.md"),
      "---\nsources:\n  - raw/covered.md\n---\n# Covered\n",
      "utf8",
    );

    const result = compilePlanRepo(repoPath);
    const written = compilePlanRepo(repoPath, { write: true });
    const json = JSON.parse(compilePlanRepo(repoPath, { json: true }).messages[0]) as {
      counts: {
        rawSources: number;
        queuedSources: number;
        coveredSources: number;
      };
      queued: Array<{
        source: string;
        title: string;
        target: string;
        status: string;
        coveredBy: string[];
        command: string;
      }>;
      covered: Array<{
        source: string;
        coveredBy: string[];
        command: string;
      }>;
      items: Array<{
        source: string;
      }>;
    };

    assert.equal(result.ok, true);
    assert.match(result.messages[0], /# Compile Plan/);
    assert.match(result.messages[0], /queued sources: 1/);
    assert.match(result.messages[0], /already covered sources: 1/);
    assert.match(result.messages[0], /raw\/new-source.md/);
    assert.match(result.messages[0], /wiki\/New Research Source.md/);
    assert.match(result.messages[0], /kforge compile \. --source raw\/new-source.md --target 'wiki\/New Research Source.md' --write/);
    assert.match(result.messages[0], /raw\/covered.md/);
    assert.match(result.messages[0], /wiki\/Covered.md/);
    assert.equal(written.ok, true);
    assert.match(await readFile(path.join(repoPath, "indexes", "compile-plan.md"), "utf8"), /# Compile Plan/);
    assert.deepEqual(json.counts, {
      rawSources: 2,
      queuedSources: 1,
      coveredSources: 1,
    });
    assert.equal(json.queued[0].source, "raw/new-source.md");
    assert.equal(json.queued[0].title, "New Research Source");
    assert.equal(json.queued[0].target, "wiki/New Research Source.md");
    assert.equal(json.queued[0].status, "queued");
    assert.equal(json.queued[0].command, "kforge compile . --source raw/new-source.md --target 'wiki/New Research Source.md' --write");
    assert.equal(json.covered[0].source, "raw/covered.md");
    assert.deepEqual(json.covered[0].coveredBy, ["wiki/Covered.md"]);
    assert.equal(json.items.length, 2);
  } finally {
    await rm(repoPath, { recursive: true, force: true });
  }
});

test("compileReview creates proposed reviews from queued raw sources", async () => {
  const repoPath = await tempRepoPath();
  try {
    initRepo(repoPath);
    await writeFile(path.join(repoPath, "raw", "covered.md"), "# Covered\n", "utf8");
    await writeFile(path.join(repoPath, "raw", "new-source.md"), "# New Source\n", "utf8");
    await import("node:fs/promises").then((fs) => fs.mkdir(path.join(repoPath, "raw", "_meta"), { recursive: true }));
    await writeFile(
      path.join(repoPath, "raw", "_meta", "new-source.md"),
      "# Source Metadata: New Research Source\n\nSource file: `raw/new-source.md`\nAdded: 2026-05-28\nOriginal path: `/tmp/new-source.md`\n",
      "utf8",
    );
    await writeFile(
      path.join(repoPath, "wiki", "Covered.md"),
      "---\nsources:\n  - raw/covered.md\n---\n# Covered\n",
      "utf8",
    );

    const dryRun = compileReviewRepo(repoPath, { dryRun: true });
    const dryRunJson = JSON.parse(compileReviewRepo(repoPath, { dryRun: true, json: true }).messages[0]) as {
      dryRun: boolean;
      counts: {
        candidates: number;
        wouldCreate: number;
        created: number;
        skipped: number;
      };
      items: Array<{
        source: string;
        title: string;
        target: string;
        action: string;
        review?: string;
      }>;
    };
    const createdJson = JSON.parse(compileReviewRepo(repoPath, { json: true }).messages[0]) as {
      counts: {
        created: number;
        skipped: number;
      };
      items: Array<{
        action: string;
        review?: string;
      }>;
    };
    const duplicate = compileReviewRepo(repoPath);
    const duplicateJson = JSON.parse(compileReviewRepo(repoPath, { json: true }).messages[0]) as {
      counts: {
        skipped: number;
      };
      items: Array<{
        action: string;
        review?: string;
      }>;
    };

    assert.equal(dryRun.ok, true);
    assert.match(dryRun.messages.join("\n"), /Would create compile review for raw\/new-source.md -> wiki\/New Research Source.md/);
    assert.equal(dryRunJson.dryRun, true);
    assert.deepEqual(dryRunJson.counts, {
      candidates: 1,
      wouldCreate: 1,
      created: 0,
      skipped: 0,
    });
    assert.equal(dryRunJson.items[0].source, "raw/new-source.md");
    assert.equal(dryRunJson.items[0].title, "New Research Source");
    assert.equal(dryRunJson.items[0].target, "wiki/New Research Source.md");
    assert.equal(dryRunJson.items[0].action, "would_create");
    assert.equal(dryRunJson.items[0].review, undefined);
    assert.equal(createdJson.counts.created, 1);
    assert.equal(createdJson.counts.skipped, 0);
    assert.equal(createdJson.items[0].action, "created");
    assert.match(createdJson.items[0].review ?? "", /reviews\/.*compile-new-research-source\.md/);
    assert.equal(duplicate.ok, true);
    assert.match(duplicate.messages.join("\n"), /Skipped existing open compile review/);
    assert.match(duplicate.messages.join("\n"), /Created 0 compile review artifact/);
    assert.equal(duplicateJson.counts.skipped, 1);
    assert.equal(duplicateJson.items[0].action, "skipped_existing_open");
    assert.match(duplicateJson.items[0].review ?? "", /reviews\/.*compile-new-research-source\.md/);

    const reviewText = await readFile(path.join(repoPath, "reviews", `${today()}-compile-new-research-source.md`), "utf8");
    assert.match(reviewText, /Status: proposed/);
    assert.match(reviewText, /Kind: compile/);
    assert.match(reviewText, /- `wiki\/New Research Source.md`/);
    assert.match(reviewText, /- `raw\/new-source.md`/);
    assert.doesNotMatch(reviewText, /raw\/covered.md/);
  } finally {
    await rm(repoPath, { recursive: true, force: true });
  }
});

test("compileReview respects limits without writing during dry runs", async () => {
  const repoPath = await tempRepoPath();
  try {
    initRepo(repoPath);
    await writeFile(path.join(repoPath, "raw", "one.md"), "# One\n", "utf8");
    await writeFile(path.join(repoPath, "raw", "two.md"), "# Two\n", "utf8");

    const dryRun = compileReviewRepo(repoPath, { limit: 1, dryRun: true });

    assert.equal(dryRun.ok, true);
    assert.match(dryRun.messages.join("\n"), /Would create 1 compile review artifact/);
    await assertFileMissing(path.join(repoPath, "reviews", `${today()}-compile-one.md`));

    const result = compileReviewRepo(repoPath, { limit: 1 });
    const queue = reviewQueue(repoPath, { status: "open" });

    assert.equal(result.ok, true);
    assert.match(result.messages.join("\n"), /Created 1 compile review artifact/);
    assert.match(queue.messages[0], /Showing: 1\/1/);
  } finally {
    await rm(repoPath, { recursive: true, force: true });
  }
});

test("compile writes briefs to outputs", async () => {
  const repoPath = await tempRepoPath();
  try {
    initRepo(repoPath);
    await writeFile(path.join(repoPath, "raw", "source.md"), "# Source\n", "utf8");

    const result = compileRepo(repoPath, {
      sources: ["raw/source.md"],
      target: "wiki/New Article.md",
      write: true,
    });

    assert.equal(result.ok, true);
    assert.match(result.messages[0], /outputs\/.*new-article-compile-brief.md/);
    assert.match(
      await readFile(path.join(repoPath, "outputs", `${today()}-new-article-compile-brief.md`), "utf8"),
      /# Compile Brief/,
    );
  } finally {
    await rm(repoPath, { recursive: true, force: true });
  }
});

test("compile rejects unsafe paths and missing sources", async () => {
  const repoPath = await tempRepoPath();
  try {
    initRepo(repoPath);

    const outsideTarget = compileRepo(repoPath, {
      sources: ["raw/missing.md"],
      target: "../outside.md",
    });
    const missingSource = compileRepo(repoPath, {
      sources: ["raw/missing.md"],
      target: "wiki/Article.md",
    });

    assert.equal(outsideTarget.ok, false);
    assert.equal(outsideTarget.messages.some((message) => message.includes("outside repo")), true);
    assert.equal(missingSource.ok, false);
    assert.equal(missingSource.messages.some((message) => message.includes("raw/missing.md")), true);
  } finally {
    await rm(repoPath, { recursive: true, force: true });
  }
});

test("doctor fails on broken wikilinks", async () => {
  const repoPath = await tempRepoPath();
  try {
    initRepo(repoPath);
    await writeFile(
      path.join(repoPath, "wiki", "Concept.md"),
      "---\nsources: []\n---\n# Concept\n[[Missing Page]]\n",
      "utf8",
    );

    const result = doctorRepo(repoPath);

    assert.equal(result.ok, false);
    assert.equal(result.messages.some((message) => message.includes("Missing Page")), true);
  } finally {
    await rm(repoPath, { recursive: true, force: true });
  }
});

test("doctor writes a report when requested", async () => {
  const repoPath = await tempRepoPath();
  try {
    initRepo(repoPath, { example: true });

    const result = doctorRepo(repoPath, { write: true });

    assert.equal(result.ok, true);
    assert.match(result.messages[0], /indexes\/doctor.md/);
    assert.match(await readFile(path.join(repoPath, "indexes", "doctor.md"), "utf8"), /# Doctor Report/);
    assert.match(await readFile(path.join(repoPath, "indexes", "doctor.md"), "utf8"), /Status: clean/);
  } finally {
    await rm(repoPath, { recursive: true, force: true });
  }
});

test("doctor can return machine-readable JSON", async () => {
  const repoPath = await tempRepoPath();
  try {
    initRepo(repoPath, { example: true });

    const result = doctorRepo(repoPath, { json: true });
    const payload = JSON.parse(result.messages[0]) as {
      ok: boolean;
      status: string;
      messages: string[];
      checkedAt: string;
    };

    assert.equal(result.ok, true);
    assert.equal(payload.ok, true);
    assert.equal(payload.status, "clean");
    assert.deepEqual(payload.messages, ["no structural issues found"]);
    assert.match(payload.checkedAt, /^\d{4}-\d{2}-\d{2}$/);
  } finally {
    await rm(repoPath, { recursive: true, force: true });
  }
});

test("doctor fails on missing wiki and claim source references", async () => {
  const repoPath = await tempRepoPath();
  try {
    initRepo(repoPath);
    await writeFile(
      path.join(repoPath, "wiki", "Concept.md"),
      "---\nsources:\n  - raw/missing.md\n---\n# Concept\n",
      "utf8",
    );
    await writeFile(
      path.join(repoPath, "claims", "missing-source.md"),
      "# Claim: Missing source\n\nStatus: proposed\nConfidence: medium\n\n## Assertion\n\nA claim.\n\n## Sources\n\n- `raw/also-missing.md`\n",
      "utf8",
    );

    const result = doctorRepo(repoPath);

    assert.equal(result.ok, false);
    assert.equal(result.messages.some((message) => message.includes("raw/missing.md")), true);
    assert.equal(result.messages.some((message) => message.includes("raw/also-missing.md")), true);
  } finally {
    await rm(repoPath, { recursive: true, force: true });
  }
});

test("doctor fails on invalid review references", async () => {
  const repoPath = await tempRepoPath();
  try {
    initRepo(repoPath);
    await writeFile(
      path.join(repoPath, "reviews", "bad-review.md"),
      "# Review: Bad review\n\nStatus: proposed\nKind: compile\n\n## Summary\n\nBad refs.\n\n## Targets\n\n- `../outside.md`\n\n## Sources\n\n- `raw/missing.md`\n",
      "utf8",
    );

    const result = doctorRepo(repoPath);

    assert.equal(result.ok, false);
    assert.equal(result.messages.some((message) => message.includes("../outside.md")), true);
    assert.equal(result.messages.some((message) => message.includes("raw/missing.md")), true);
  } finally {
    await rm(repoPath, { recursive: true, force: true });
  }
});

test("doctor fails on invalid kb manifest fields", async () => {
  const repoPath = await tempRepoPath();
  try {
    initRepo(repoPath);
    await writeFile(
      path.join(repoPath, "kb.yaml"),
      "protocol: other\nversion: 9\npaths:\n  raw: raw\n",
      "utf8",
    );

    const result = doctorRepo(repoPath);

    assert.equal(result.ok, false);
    assert.match(result.messages.join("\n"), /invalid kb.yaml/);
    assert.match(result.messages.join("\n"), /protocol must be `kforge`/);
    assert.match(result.messages.join("\n"), /version must be `0.1`/);
    assert.match(result.messages.join("\n"), /directories.raw must be `raw`/);
  } finally {
    await rm(repoPath, { recursive: true, force: true });
  }
});

test("doctor fails on stale generated indexes", async () => {
  const repoPath = await tempRepoPath();
  try {
    initRepo(repoPath);
    await writeFile(path.join(repoPath, "raw", "source.md"), "# Source\n", "utf8");
    indexRepo(repoPath);
    await writeFile(path.join(repoPath, "raw", "new-source.md"), "# New Source\n", "utf8");

    const stale = doctorRepo(repoPath);
    const refreshed = indexRepo(repoPath);
    const clean = doctorRepo(repoPath);

    assert.equal(stale.ok, false);
    assert.match(stale.messages.join("\n"), /stale index files/);
    assert.match(stale.messages.join("\n"), /indexes\/source-inventory.md/);
    assert.equal(refreshed.ok, true);
    assert.equal(clean.ok, true);
  } finally {
    await rm(repoPath, { recursive: true, force: true });
  }
});

test("doctor fails on symlinks that resolve outside the repo", async () => {
  const repoPath = await tempRepoPath();
  const outsideDir = await tempRepoPath();
  try {
    initRepo(repoPath);
    await writeFile(path.join(outsideDir, "external.md"), "# External\n", "utf8");
    await symlink(path.join(outsideDir, "external.md"), path.join(repoPath, "raw", "external.md"));

    const result = doctorRepo(repoPath);

    assert.equal(result.ok, false);
    assert.match(result.messages.join("\n"), /symlinks resolving outside the repo/);
    assert.match(result.messages.join("\n"), /raw\/external.md/);
  } finally {
    await rm(repoPath, { recursive: true, force: true });
    await rm(outsideDir, { recursive: true, force: true });
  }
});

async function tempRepoPath(): Promise<string> {
  return mkdtemp(path.join(tmpdir(), "kforge-test-"));
}

async function assertFileExists(target: string): Promise<void> {
  const stats = await import("node:fs/promises").then((fs) => fs.stat(target));
  assert.equal(stats.isFile() || stats.isDirectory(), true);
}

async function assertFileMissing(target: string): Promise<void> {
  await assert.rejects(import("node:fs/promises").then((fs) => fs.stat(target)), { code: "ENOENT" });
}

async function fetchText(url: string): Promise<string> {
  const response = await fetch(url);
  assert.equal(response.ok, true);
  return response.text();
}

async function fetchJson(url: string, init?: RequestInit): Promise<unknown> {
  const response = await fetch(url, {
    headers: { "content-type": "application/json" },
    ...init,
  });
  assert.equal(response.ok, true);
  return response.json() as Promise<unknown>;
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
