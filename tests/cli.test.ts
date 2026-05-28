import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import http from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import test from "node:test";
import assert from "node:assert/strict";

const execFileAsync = promisify(execFile);

test("cli help exposes the public command surface", async () => {
  const result = await runCli(["--help"]);

  assert.equal(result.exitCode, 0);
  assert.match(result.stdout, /kforge 0\.1\.0/);
  assert.match(result.stdout, /kforge demo \[path\] \[--force\]/);
  assert.match(result.stdout, /kforge bootstrap \[path\].*\[--agent <name>\].*\[--json\]/);
  assert.match(result.stdout, /kforge refresh \[path\]/);
  assert.match(result.stdout, /kforge doctor \[path\] \[--write\] \[--json\]/);
  assert.match(result.stdout, /kforge handoff \[path\] \[--write\]/);
  assert.match(result.stdout, /kforge workflow \[path\] \[--write\]/);
  assert.match(result.stdout, /kforge dashboard \[path\] \[--write\] \[--json\]/);
  assert.match(result.stdout, /kforge agent next \[path\].*--agent <name>.*\[--json\]/);
  assert.match(result.stdout, /kforge agent step \[path\].*--agent <name>.*\[--json\]/);
  assert.match(result.stdout, /kforge agent draft \[path\].*--agent <name>.*\[--json\]/);
  assert.match(result.stdout, /kforge agent status \[path\].*--agent <name>.*\[--json\]/);
  assert.match(result.stdout, /kforge agent board \[path\] \[--json\]/);
  assert.match(result.stdout, /kforge agent plan \[path\].*--agent <name>.*--agent <name>.*\[--json\]/);
  assert.match(result.stdout, /kforge agent launch \[path\].*--agent <name>.*--agent <name>.*\[--exec\].*\[--json\]/);
  assert.match(result.stdout, /kforge agent finish \[path\].*--agent <name>.*\[--task-done\].*\[--json\]/);
  assert.match(result.stdout, /kforge agent list/);
  assert.match(result.stdout, /kforge agent install \[path\]/);
  assert.match(result.stdout, /kforge compile plan \[path\] \[--write\] \[--json\]/);
  assert.match(result.stdout, /kforge compile review \[path\] \[--limit <n>\] \[--dry-run\] \[--json\]/);
  assert.match(result.stdout, /kforge compile draft \[path\] .* \[--json\]/);
  assert.match(result.stdout, /kforge source add \[path\] --file <local-file> .* \[--json\]/);
  assert.match(result.stdout, /kforge source fetch \[path\] --url <url> .* \[--json\]/);
  assert.match(result.stdout, /kforge source fetch-list \[path\] --file <urls\.txt> .* \[--json\]/);
  assert.match(result.stdout, /kforge source import \[path\] --dir <local-dir> .* \[--json\]/);
  assert.match(result.stdout, /kforge compile draft \[path\]/);
  assert.match(result.stdout, /kforge review queue \[path\]/);
  assert.match(result.stdout, /kforge review next \[path\]/);
  assert.match(result.stdout, /kforge review content \[path\]/);
  assert.match(result.stdout, /kforge review content \[path\].*\[--json\]/);
  assert.match(result.stdout, /kforge review status \[path\].*\[--json\]/);
  assert.match(result.stdout, /kforge review apply \[path\]/);
  assert.match(result.stdout, /kforge review apply \[path\].*\[--json\]/);
  assert.match(result.stdout, /kforge task seed \[path\] \[--limit <n>\] \[--json\]/);
  assert.match(result.stdout, /kforge task list \[path\]/);
  assert.match(result.stdout, /kforge task claim \[path\].*--agent <name>.*\[--json\]/);
    assert.match(result.stdout, /kforge task next \[path\].*--agent <name>.*\[--json\]/);
    assert.match(result.stdout, /kforge run start \[path\].*--task <tasks\/file\.md>.*--agent <name>.*\[--json\]/);
    assert.match(result.stdout, /kforge run next \[path\].*--agent <name>.*\[--json\]/);
    assert.match(result.stdout, /kforge run inspect \[path\].*--run <runs\/file\.md>.*\[--json\]/);
    assert.match(result.stdout, /kforge run finish \[path\].*--status <success\|failure>.*\[--json\]/);
  assert.match(result.stdout, /kforge version/);
});

test("cli can run the documented demo workflow", async () => {
  const repoPath = await mkdtemp(path.join(tmpdir(), "kforge-cli-test-"));
  try {
    const init = await runCli(["init", repoPath, "--example"]);
    const refresh = await runCli(["refresh", repoPath]);
    const search = await runCli(["search", repoPath, "--query", "provenance"]);
    const inspect = await runCli(["inspect", repoPath, "--file", "wiki/Provenance.md"]);
    const dashboard = await runCli(["dashboard", repoPath]);
    const dashboardJson = await runCli(["dashboard", repoPath, "--json"]);
    const dashboardWriteJson = await runCli(["dashboard", repoPath, "--write", "--json"]);
    const handoff = await runCli(["handoff", repoPath]);
    const reviewQueue = await runCli(["review", "queue", repoPath]);
    const reviewQueueJson = await runCli(["review", "queue", repoPath, "--json"]);
    const reviewNext = await runCli(["review", "next", repoPath]);
    const reviewNextJson = await runCli(["review", "next", repoPath, "--json"]);
    const claimAudit = await runCli(["claim", "audit", repoPath, "--json"]);
    const claimReviewDrift = await runCli(["claim", "review-drift", repoPath, "--dry-run"]);
    const doctor = await runCli(["doctor", repoPath, "--write"]);

    assert.equal(init.exitCode, 0);
    assert.match(init.stdout, /Initialized knowledge repo/);
    assert.equal(refresh.exitCode, 0);
    assert.match(refresh.stdout, /Refreshed derived artifacts/);
    assert.match(await readFile(path.join(repoPath, "indexes", "workflow.md"), "utf8"), /# Agent Workflow Runbook/);
    assert.equal(search.exitCode, 0);
    assert.match(search.stdout, /# Search Results/);
    assert.equal(inspect.exitCode, 0);
    assert.match(inspect.stdout, /# File Inspect/);
    assert.equal(dashboard.exitCode, 0);
    assert.match(dashboard.stdout, /# Knowledge Dashboard/);
    assert.match(dashboard.stdout, /## Open In Obsidian/);
    assert.equal(dashboardJson.exitCode, 0);
    assert.equal(JSON.parse(dashboardJson.stdout).counts.rawSources, 1);
    assert.equal(dashboardWriteJson.exitCode, 0);
    assert.equal(JSON.parse(dashboardWriteJson.stdout).health.doctor, "clean");
    assert.match(await readFile(path.join(repoPath, "indexes", "dashboard.md"), "utf8"), /# Knowledge Dashboard/);
    assert.equal(handoff.exitCode, 0);
    assert.match(handoff.stdout, /# Agent Handoff/);
    assert.equal(reviewQueue.exitCode, 0);
    assert.match(reviewQueue.stdout, /# Review Queue/);
    assert.equal(reviewQueueJson.exitCode, 0);
    assert.equal(JSON.parse(reviewQueueJson.stdout).next.file, "reviews/demo-compile-provenance.md");
    assert.equal(reviewNext.exitCode, 0);
    assert.match(reviewNext.stdout, /# Next Review/);
    assert.equal(reviewNextJson.exitCode, 0);
    assert.equal(JSON.parse(reviewNextJson.stdout).next.file, "reviews/demo-compile-provenance.md");
    assert.equal(claimAudit.exitCode, 0);
    assert.equal(JSON.parse(claimAudit.stdout).counts.claims, 1);
    assert.equal(claimReviewDrift.exitCode, 0);
    assert.match(claimReviewDrift.stdout, /No source drift warnings found|Would create .* stale review/);
    assert.equal(doctor.exitCode, 0);
    assert.match(doctor.stdout, /indexes\/doctor.md/);
    assert.match(await readFile(path.join(repoPath, "indexes", "doctor.md"), "utf8"), /Status: clean/);
  } finally {
    await rm(repoPath, { recursive: true, force: true });
  }
});

test("cli demo creates a ready-to-browse repo", async () => {
  const parentPath = await mkdtemp(path.join(tmpdir(), "kforge-cli-demo-parent-"));
  const repoPath = path.join(parentPath, "demo");
  try {
    const result = await runCli(["demo", repoPath]);

    assert.equal(result.exitCode, 0);
    assert.match(result.stdout, /Demo repo ready/);
    assert.match(result.stdout, /kforge review queue/);
    assert.match(await readFile(path.join(repoPath, "indexes", "doctor.md"), "utf8"), /Status: clean/);
  } finally {
    await rm(parentPath, { recursive: true, force: true });
  }
});

test("cli can list print and install agent templates", async () => {
  const repoPath = await mkdtemp(path.join(tmpdir(), "kforge-cli-agent-"));
  try {
    await runCli(["init", repoPath]);

    const list = await runCli(["agent", "list"]);
    const print = await runCli(["agent", "print", "--template", "claude"]);
    const install = await runCli(["agent", "install", repoPath, "--template", "cursor"]);
    const duplicate = await runCli(["agent", "install", repoPath, "--template", "cursor"]);
    const force = await runCli(["agent", "install", repoPath, "--template", "cursor", "--force"]);

    assert.equal(list.exitCode, 0);
    assert.match(list.stdout, /# Agent Templates/);
    assert.match(list.stdout, /claude/);
    assert.equal(print.exitCode, 0);
    assert.match(print.stdout, /# CLAUDE.md/);
    assert.match(print.stdout, /kforge context \./);
    assert.equal(install.exitCode, 0);
    assert.match(install.stdout, /\.cursor\/rules\/kforge.mdc/);
    assert.match(
      await readFile(path.join(repoPath, ".cursor", "rules", "kforge.mdc"), "utf8"),
      /# kforge Agent Rules/,
    );
    assert.equal(duplicate.exitCode, 1);
    assert.match(duplicate.stdout, /already exists/);
    assert.equal(force.exitCode, 0);
  } finally {
    await rm(repoPath, { recursive: true, force: true });
  }
});

test("cli agent next starts the next auditable run", async () => {
  const repoPath = await mkdtemp(path.join(tmpdir(), "kforge-cli-agent-next-"));
  try {
    await runCli(["init", repoPath]);
    await writeFile(path.join(repoPath, "raw", "source.md"), "# Source\n", "utf8");
    await runCli([
      "review",
      "new",
      repoPath,
      "--title",
      "Agent Next",
      "--target",
      "wiki/Agent Next.md",
      "--source",
      "raw/source.md",
      "--kind",
      "compile",
    ]);

    const next = await runCli(["agent", "next", repoPath, "--agent", "cli-agent-next", "--note", "start agent loop", "--json"]);
    const payload = JSON.parse(next.stdout) as {
      task?: { status?: string; owner?: string; file?: string };
      run?: { status?: string; agent?: string; task?: string; file?: string };
      next?: string[];
    };
    const step = await runCli(["agent", "step", repoPath, "--agent", "cli-agent-next", "--json"]);
    const stepPayload = JSON.parse(step.stdout) as {
      started?: boolean;
      run?: { file?: string };
      task?: { file?: string };
      read?: string[];
      commands?: string[];
      finish?: string[];
    };
    const draft = await runCli(["agent", "draft", repoPath, "--agent", "cli-agent-next", "--json"]);
    const draftPayload = JSON.parse(draft.stdout) as {
      run?: { file?: string };
      task?: { file?: string; source?: string };
      draft?: { written?: boolean; review?: string; output?: string };
      next?: string[];
    };
    const status = await runCli(["agent", "status", repoPath, "--agent", "cli-agent-next", "--json"]);
    const statusPayload = JSON.parse(status.stdout) as {
      agent?: string;
      runningRuns?: Array<{ file?: string }>;
      claimedTasks?: Array<{ file?: string }>;
      next?: string[];
    };
    const finished = await runCli(["agent", "finish", repoPath, "--agent", "cli-agent-next", "--task-done", "--note", "finished loop", "--json"]);
    const finishedPayload = JSON.parse(finished.stdout) as {
      run?: { status?: string; file?: string };
      task?: { status?: string; file?: string };
      next?: string[];
    };

    assert.equal(next.exitCode, 0);
    assert.equal(payload.task?.status, "claimed");
    assert.equal(payload.task?.owner, "cli-agent-next");
    assert.equal(payload.run?.status, "running");
    assert.equal(payload.run?.agent, "cli-agent-next");
    assert.equal(payload.run?.task, payload.task?.file);
    assert.match(payload.next?.[0] ?? "", /^kforge run log/);
    assert.equal(step.exitCode, 0);
    assert.equal(stepPayload.started, false);
    assert.equal(stepPayload.run?.file, payload.run?.file);
    assert.equal(stepPayload.task?.file, payload.task?.file);
    assert.equal(stepPayload.read?.includes(payload.run?.file ?? ""), true);
    assert.match(stepPayload.commands?.join("\n") ?? "", /kforge agent draft/);
    assert.match(stepPayload.finish?.[0] ?? "", /^kforge agent finish/);
    assert.equal(draft.exitCode, 0);
    assert.equal(draftPayload.run?.file, payload.run?.file);
    assert.equal(draftPayload.task?.file, payload.task?.file);
    assert.equal(draftPayload.draft?.written, true);
    assert.equal(draftPayload.draft?.review, draftPayload.task?.source);
    assert.match(draftPayload.draft?.output ?? "", /^outputs\/.*agent-next-draft.*\.md$/);
    assert.match(await readFile(path.join(repoPath, draftPayload.draft?.output ?? ""), "utf8"), /# Agent Next/);
    assert.match(draftPayload.next?.join("\n") ?? "", /kforge review content/);
    assert.equal(status.exitCode, 0);
    assert.equal(statusPayload.agent, "cli-agent-next");
    assert.equal(statusPayload.runningRuns?.[0]?.file, payload.run?.file);
    assert.equal(statusPayload.claimedTasks?.[0]?.file, payload.task?.file);
    assert.match(statusPayload.next?.[0] ?? "", /^kforge agent step/);
    assert.equal(finished.exitCode, 0);
    assert.equal(finishedPayload.run?.status, "success");
    assert.equal(finishedPayload.run?.file, payload.run?.file);
    assert.equal(finishedPayload.task?.status, "done");
    assert.equal(finishedPayload.task?.file, payload.task?.file);
    assert.match(finishedPayload.next?.[0] ?? "", /^kforge agent status/);
  } finally {
    await rm(repoPath, { recursive: true, force: true });
  }
});

test("cli agent plan assigns multiple agent runs", async () => {
  const repoPath = await mkdtemp(path.join(tmpdir(), "kforge-cli-agent-plan-"));
  try {
    await runCli(["init", repoPath]);
    await writeFile(path.join(repoPath, "raw", "source.md"), "# Source\n", "utf8");
    await runCli([
      "review",
      "new",
      repoPath,
      "--title",
      "CLI Parallel One",
      "--target",
      "wiki/CLI Parallel One.md",
      "--source",
      "raw/source.md",
      "--kind",
      "compile",
    ]);
    await runCli([
      "review",
      "new",
      repoPath,
      "--title",
      "CLI Parallel Two",
      "--target",
      "wiki/CLI Parallel Two.md",
      "--source",
      "raw/source.md",
      "--kind",
      "compile",
    ]);

    const plan = await runCli([
      "agent",
      "plan",
      repoPath,
      "--agent",
      "cli-plan-a",
      "--agent",
      "cli-plan-b",
      "--note",
      "parallel",
      "--json",
    ]);
    const payload = JSON.parse(plan.stdout) as {
      requested?: number;
      started?: number;
      assignments?: Array<{ agent?: string; task?: { file?: string; owner?: string }; run?: { file?: string; agent?: string }; commands?: string[] }>;
      unassignedAgents?: string[];
      next?: string[];
    };

    assert.equal(plan.exitCode, 0);
    assert.equal(payload.requested, 2);
    assert.equal(payload.started, 2);
    assert.deepEqual(payload.unassignedAgents, []);
    assert.equal(payload.assignments?.[0]?.agent, "cli-plan-a");
    assert.equal(payload.assignments?.[1]?.agent, "cli-plan-b");
    assert.equal(payload.assignments?.[0]?.task?.owner, "cli-plan-a");
    assert.equal(payload.assignments?.[1]?.run?.agent, "cli-plan-b");
    assert.notEqual(payload.assignments?.[0]?.task?.file, payload.assignments?.[1]?.task?.file);
    assert.match(payload.assignments?.[0]?.commands?.join("\n") ?? "", /kforge agent draft/);
    assert.match(payload.next?.join("\n") ?? "", /kforge agent step/);
    assert.match(await readFile(path.join(repoPath, payload.assignments?.[0]?.run?.file ?? ""), "utf8"), /parallel/);

    const board = await runCli(["agent", "board", repoPath, "--json"]);
    const boardPayload = JSON.parse(board.stdout) as {
      counts?: { agents?: number; runningRuns?: number; claimedTasks?: number };
      agents?: Array<{ agent?: string; runningRuns?: unknown[]; claimedTasks?: unknown[] }>;
      next?: string[];
    };
    assert.equal(board.exitCode, 0);
    assert.equal(boardPayload.counts?.agents, 2);
    assert.equal(boardPayload.counts?.runningRuns, 2);
    assert.equal(boardPayload.counts?.claimedTasks, 2);
    assert.equal(boardPayload.agents?.[0]?.agent, "cli-plan-a");
    assert.match(boardPayload.next?.join("\n") ?? "", /task list/);
  } finally {
    await rm(repoPath, { recursive: true, force: true });
  }
});

test("cli agent launch writes a parallel worker launcher", async () => {
  const repoPath = await mkdtemp(path.join(tmpdir(), "kforge-cli-agent-launch-"));
  try {
    await runCli(["init", repoPath]);
    await writeFile(path.join(repoPath, "raw", "source.md"), "# Source\n", "utf8");
    await runCli([
      "review",
      "new",
      repoPath,
      "--title",
      "Launch One",
      "--target",
      "wiki/Launch One.md",
      "--source",
      "raw/source.md",
      "--kind",
      "compile",
    ]);
    await runCli([
      "review",
      "new",
      repoPath,
      "--title",
      "Launch Two",
      "--target",
      "wiki/Launch Two.md",
      "--source",
      "raw/source.md",
      "--kind",
      "compile",
    ]);

    const launch = await runCli([
      "agent",
      "launch",
      repoPath,
      "--agent",
      "cli-launch-a",
      "--agent",
      "cli-launch-b",
      "--command",
      "printf {agent}:{task}",
      "--write",
      "--json",
    ]);
    const payload = JSON.parse(launch.stdout) as {
      items?: Array<{ agent?: string; command?: string; log?: string }>;
      script?: { file?: string; content?: string };
      written?: boolean;
      next?: string[];
    };

    assert.equal(launch.exitCode, 0);
    assert.equal(payload.written, true);
    assert.equal(payload.items?.length, 2);
    assert.equal(payload.items?.[0]?.agent, "cli-launch-a");
    assert.match(payload.items?.[0]?.command ?? "", /printf cli-launch-a:tasks\//);
    assert.match(payload.script?.content ?? "", /pids=\(\)/);
    assert.match(payload.next?.join("\n") ?? "", /bash runs\//);
    assert.match(await readFile(path.join(repoPath, payload.script?.file ?? ""), "utf8"), /cli-launch-b/);
  } finally {
    await rm(repoPath, { recursive: true, force: true });
  }
});

test("cli bootstrap stages research work for multiple agents", async () => {
  const repoPath = await mkdtemp(path.join(tmpdir(), "kforge-cli-bootstrap-"));
  try {
    await runCli(["init", repoPath]);
    await writeFile(path.join(repoPath, "raw", "one.md"), "# One\n", "utf8");
    await writeFile(path.join(repoPath, "raw", "two.md"), "# Two\n", "utf8");

    const dryRun = await runCli(["bootstrap", repoPath, "--dry-run", "--json"]);
    const dryRunPayload = JSON.parse(dryRun.stdout) as {
      dryRun?: boolean;
      counts?: { compileReviewsWouldCreate?: number; tasksCreated?: number };
    };
    const result = await runCli(["bootstrap", repoPath, "--agent", "boot-a", "--agent", "boot-b", "--limit", "2", "--json"]);
    const payload = JSON.parse(result.stdout) as {
      dryRun?: boolean;
      counts?: { compileReviewsCreated?: number; tasksCreated?: number; agentRunsStarted?: number };
      agentPlan?: { assignments?: Array<{ agent?: string; run?: { file?: string } }> };
      next?: string[];
    };

    assert.equal(dryRun.exitCode, 0);
    assert.equal(dryRunPayload.dryRun, true);
    assert.equal(dryRunPayload.counts?.compileReviewsWouldCreate, 2);
    assert.equal(dryRunPayload.counts?.tasksCreated, 0);
    assert.equal(result.exitCode, 0);
    assert.equal(payload.dryRun, false);
    assert.equal(payload.counts?.compileReviewsCreated, 2);
    assert.equal(payload.counts?.tasksCreated, 2);
    assert.equal(payload.counts?.agentRunsStarted, 2);
    assert.equal(payload.agentPlan?.assignments?.[0]?.agent, "boot-a");
    assert.match(payload.next?.join("\n") ?? "", /kforge agent step/);
    assert.match(await readFile(path.join(repoPath, "indexes", "dashboard.md"), "utf8"), /# Knowledge Dashboard/);
  } finally {
    await rm(repoPath, { recursive: true, force: true });
  }
});

test("cli imports a source directory", async () => {
  const repoPath = await mkdtemp(path.join(tmpdir(), "kforge-cli-source-import-"));
  const sourceDir = await mkdtemp(path.join(tmpdir(), "kforge-cli-source-dir-"));
  try {
    await runCli(["init", repoPath]);
    await writeFile(path.join(sourceDir, "One.md"), "# One\n", "utf8");
    await writeFile(path.join(sourceDir, "Two.md"), "# Two\n", "utf8");

    const dryRun = await runCli(["source", "import", repoPath, "--dir", sourceDir, "--dry-run"]);
    const dryRunJson = await runCli(["source", "import", repoPath, "--dir", sourceDir, "--dry-run", "--json"]);
    const result = await runCli(["source", "import", repoPath, "--dir", sourceDir, "--title-prefix", "Batch"]);
    const resultJson = await runCli(["source", "import", repoPath, "--dir", sourceDir, "--title-prefix", "Json Batch", "--json"]);
    const list = await runCli(["source", "list", repoPath]);
    const dryRunPayload = JSON.parse(dryRunJson.stdout) as {
      dryRun?: boolean;
      counts?: { candidates?: number; wouldImport?: number; imported?: number };
      items?: Array<{ source?: string; metadata?: string; action?: string }>;
    };
    const resultPayload = JSON.parse(resultJson.stdout) as {
      dryRun?: boolean;
      counts?: { candidates?: number; imported?: number };
      items?: Array<{ source?: string; metadata?: string; action?: string }>;
    };

    assert.equal(dryRun.exitCode, 0);
    assert.match(dryRun.stdout, /Dry run: would import 2 source file/);
    assert.equal(dryRunJson.exitCode, 0);
    assert.equal(dryRunPayload.dryRun, true);
    assert.equal(dryRunPayload.counts?.wouldImport, 2);
    assert.equal(dryRunPayload.counts?.imported, 0);
    assert.equal(dryRunPayload.items?.[0]?.action, "would_import");
    assert.equal(dryRunPayload.items?.[0]?.source, "raw/one.md");
    assert.equal(dryRunPayload.items?.[0]?.metadata, "raw/_meta/one.md");
    assert.equal(result.exitCode, 0);
    assert.match(result.stdout, /Imported 2 source file/);
    assert.equal(resultJson.exitCode, 0);
    assert.equal(resultPayload.dryRun, false);
    assert.equal(resultPayload.counts?.imported, 2);
    assert.equal(resultPayload.items?.[0]?.action, "imported");
    assert.equal(resultPayload.items?.[0]?.source, "raw/json-batch-one.md");
    assert.match(list.stdout, /raw\/batch-one.md/);
    assert.match(list.stdout, /raw\/batch-two.md/);
    assert.match(list.stdout, /raw\/json-batch-one.md/);
  } finally {
    await rm(repoPath, { recursive: true, force: true });
    await rm(sourceDir, { recursive: true, force: true });
  }
});

test("cli adds a source as JSON", async () => {
  const repoPath = await mkdtemp(path.join(tmpdir(), "kforge-cli-source-add-"));
  const sourceDir = await mkdtemp(path.join(tmpdir(), "kforge-cli-source-file-"));
  const sourcePath = path.join(sourceDir, "Source.md");
  try {
    await runCli(["init", repoPath]);
    await writeFile(sourcePath, "# Source\n", "utf8");

    const result = await runCli(["source", "add", repoPath, "--file", sourcePath, "--title", "Json Source", "--json"]);
    const payload = JSON.parse(result.stdout) as {
      ok?: boolean;
      action?: string;
      source?: string;
      metadata?: string;
      originalPath?: string;
      next?: string[];
    };

    assert.equal(result.exitCode, 0);
    assert.equal(payload.ok, true);
    assert.equal(payload.action, "added");
    assert.equal(payload.source, "raw/json-source.md");
    assert.equal(payload.metadata, "raw/_meta/json-source.md");
    assert.equal(payload.originalPath, sourcePath);
    assert.match(payload.next?.join("\n") ?? "", /kforge source inspect/);
    assert.equal(await readFile(path.join(repoPath, "raw", "json-source.md"), "utf8"), "# Source\n");
    assert.match(await readFile(path.join(repoPath, "raw", "_meta", "json-source.md"), "utf8"), /Json Source/);
  } finally {
    await rm(repoPath, { recursive: true, force: true });
    await rm(sourceDir, { recursive: true, force: true });
  }
});

test("cli fetches a URL source as JSON", async () => {
  const repoPath = await mkdtemp(path.join(tmpdir(), "kforge-cli-source-fetch-"));
  const server = await startHttpServer({
    "/note": {
      contentType: "text/html; charset=utf-8",
      body: "<html><head><title>CLI Web Note</title></head><body><h1>CLI Web Note</h1><p>Fetched evidence.</p></body></html>",
    },
  });
  try {
    await runCli(["init", repoPath]);

    const result = await runCli(["source", "fetch", repoPath, "--url", `${server.url}/note`, "--json"]);
    const payload = JSON.parse(result.stdout) as {
      ok?: boolean;
      action?: string;
      source?: string;
      metadata?: string;
      status?: number;
      next?: string[];
    };

    assert.equal(result.exitCode, 0);
    assert.equal(payload.ok, true);
    assert.equal(payload.action, "fetched");
    assert.equal(payload.source, "raw/cli-web-note.md");
    assert.equal(payload.metadata, "raw/_meta/cli-web-note.md");
    assert.equal(payload.status, 200);
    assert.match(payload.next?.join("\n") ?? "", /kforge source inspect/);
    assert.match(await readFile(path.join(repoPath, "raw", "cli-web-note.md"), "utf8"), /# CLI Web Note/);
    assert.match(await readFile(path.join(repoPath, "raw", "_meta", "cli-web-note.md"), "utf8"), /Fetched from URL/);
  } finally {
    await server.close();
    await rm(repoPath, { recursive: true, force: true });
  }
});

test("cli fetches a URL list with dry-run and JSON", async () => {
  const repoPath = await mkdtemp(path.join(tmpdir(), "kforge-cli-source-fetch-list-"));
  const listDir = await mkdtemp(path.join(tmpdir(), "kforge-cli-url-list-"));
  const listPath = path.join(listDir, "urls.txt");
  const server = await startHttpServer({
    "/one": {
      contentType: "text/html; charset=utf-8",
      body: "<html><head><title>CLI List One</title></head><body><h1>CLI List One</h1></body></html>",
    },
    "/two": {
      contentType: "text/plain; charset=utf-8",
      body: "# CLI List Two\n",
    },
  });
  try {
    await runCli(["init", repoPath]);
    await writeFile(listPath, `One | ${server.url}/one\nTwo | ${server.url}/two\n`, "utf8");

    const dryRun = await runCli(["source", "fetch-list", repoPath, "--file", listPath, "--dry-run", "--json"]);
    const dryRunPayload = JSON.parse(dryRun.stdout) as {
      dryRun?: boolean;
      counts?: { wouldFetch?: number; fetched?: number };
      items?: Array<{ action?: string; title?: string }>;
    };
    const result = await runCli(["source", "fetch-list", repoPath, "--file", listPath, "--title-prefix", "Batch", "--json"]);
    const payload = JSON.parse(result.stdout) as {
      dryRun?: boolean;
      counts?: { fetched?: number; failed?: number };
      items?: Array<{ action?: string; source?: string; metadata?: string }>;
    };

    assert.equal(dryRun.exitCode, 0);
    assert.equal(dryRunPayload.dryRun, true);
    assert.equal(dryRunPayload.counts?.wouldFetch, 2);
    assert.equal(dryRunPayload.items?.[0]?.action, "would_fetch");
    assert.equal(result.exitCode, 0);
    assert.equal(payload.dryRun, false);
    assert.equal(payload.counts?.fetched, 2);
    assert.equal(payload.counts?.failed, 0);
    assert.equal(payload.items?.[0]?.source, "raw/batch-one.md");
    assert.equal(payload.items?.[1]?.metadata, "raw/_meta/batch-two.md");
    assert.match(await readFile(path.join(repoPath, "raw", "batch-one.md"), "utf8"), /# CLI List One/);
  } finally {
    await server.close();
    await rm(repoPath, { recursive: true, force: true });
    await rm(listDir, { recursive: true, force: true });
  }
});

test("cli can print and write a compile plan", async () => {
  const repoPath = await mkdtemp(path.join(tmpdir(), "kforge-cli-compile-plan-"));
  try {
    await runCli(["init", repoPath]);
    await writeFile(path.join(repoPath, "raw", "source.md"), "# Source\n", "utf8");

    const printed = await runCli(["compile", "plan", repoPath]);
    const printedJson = await runCli(["compile", "plan", repoPath, "--json"]);
    const written = await runCli(["compile", "plan", repoPath, "--write"]);
    const writtenJson = await runCli(["compile", "plan", repoPath, "--write", "--json"]);

    assert.equal(printed.exitCode, 0);
    assert.match(printed.stdout, /# Compile Plan/);
    assert.match(printed.stdout, /raw\/source.md/);
    assert.match(printed.stdout, /kforge compile/);
    assert.equal(printedJson.exitCode, 0);
    assert.equal(JSON.parse(printedJson.stdout).queued[0].source, "raw/source.md");
    assert.equal(written.exitCode, 0);
    assert.match(written.stdout, /indexes\/compile-plan.md/);
    assert.equal(writtenJson.exitCode, 0);
    assert.equal(JSON.parse(writtenJson.stdout).counts.queuedSources, 1);
    assert.match(await readFile(path.join(repoPath, "indexes", "compile-plan.md"), "utf8"), /# Compile Plan/);
  } finally {
    await rm(repoPath, { recursive: true, force: true });
  }
});

test("cli can dry-run and create compile reviews", async () => {
  const repoPath = await mkdtemp(path.join(tmpdir(), "kforge-cli-compile-review-"));
  try {
    await runCli(["init", repoPath]);
    await writeFile(path.join(repoPath, "raw", "source.md"), "# Source\n", "utf8");

    const dryRun = await runCli(["compile", "review", repoPath, "--dry-run"]);
    const dryRunJson = await runCli(["compile", "review", repoPath, "--dry-run", "--json"]);
    const result = await runCli(["compile", "review", repoPath, "--limit", "1", "--json"]);
    const duplicate = await runCli(["compile", "review", repoPath]);

    assert.equal(dryRun.exitCode, 0);
    assert.match(dryRun.stdout, /Would create compile review for raw\/source.md -> wiki\/Source.md/);
    assert.equal(JSON.parse(dryRunJson.stdout).items[0].action, "would_create");
    assert.equal(result.exitCode, 0);
    assert.equal(JSON.parse(result.stdout).counts.created, 1);
    assert.match(JSON.parse(result.stdout).items[0].review, /reviews\/.*compile-source\.md/);
    assert.equal(duplicate.exitCode, 0);
    assert.match(duplicate.stdout, /Skipped existing open compile review/);
    assert.match(await readFile(path.join(repoPath, "reviews", `${today()}-compile-source.md`), "utf8"), /Kind: compile/);
  } finally {
    await rm(repoPath, { recursive: true, force: true });
  }
});

test("cli can write compile draft templates", async () => {
  const repoPath = await mkdtemp(path.join(tmpdir(), "kforge-cli-compile-draft-"));
  try {
    await runCli(["init", repoPath]);
    await writeFile(path.join(repoPath, "raw", "source.md"), "# Source\n", "utf8");
    await runCli(["compile", "review", repoPath, "--limit", "1"]);

    const printed = await runCli([
      "compile",
      "draft",
      repoPath,
      "--review",
      `reviews/${today()}-compile-source.md`,
    ]);
    const written = await runCli([
      "compile",
      "draft",
      repoPath,
      "--review",
      `reviews/${today()}-compile-source.md`,
      "--write",
    ]);
    const printedJson = await runCli([
      "compile",
      "draft",
      repoPath,
      "--review",
      `reviews/${today()}-compile-source.md`,
      "--json",
    ]);
    const writtenJson = await runCli([
      "compile",
      "draft",
      repoPath,
      "--review",
      `reviews/${today()}-compile-source.md`,
      "--write",
      "--json",
    ]);
    const printedPayload = JSON.parse(printedJson.stdout) as {
      written?: boolean;
      target?: string;
      content?: string;
      output?: string;
    };
    const writtenPayload = JSON.parse(writtenJson.stdout) as {
      written?: boolean;
      output?: string;
      next?: string[];
    };

    assert.equal(printed.exitCode, 0);
    assert.match(printed.stdout, /# Source/);
    assert.match(printed.stdout, /TODO: Write a concise source-grounded summary/);
    assert.match(printed.stdout, /## Source Excerpts/);
    assert.match(printed.stdout, /## Existing Target/);
    assert.equal(written.exitCode, 0);
    assert.match(written.stdout, /Created outputs\/.*source-draft.md/);
    assert.match(await readFile(path.join(repoPath, "outputs", `${today()}-source-draft.md`), "utf8"), /# Source/);
    assert.equal(printedJson.exitCode, 0);
    assert.equal(printedPayload.written, false);
    assert.equal(printedPayload.target, "wiki/Source.md");
    assert.match(printedPayload.content ?? "", /# Source/);
    assert.equal(printedPayload.output, undefined);
    assert.equal(writtenJson.exitCode, 0);
    assert.equal(writtenPayload.written, true);
    assert.equal(writtenPayload.output, `outputs/${today()}-source-draft-2.md`);
    assert.match(writtenPayload.next?.join("\n") ?? "", /kforge review content/);
    assert.match(await readFile(path.join(repoPath, "outputs", `${today()}-source-draft-2.md`), "utf8"), /# Source/);
  } finally {
    await rm(repoPath, { recursive: true, force: true });
  }
});

test("cli can update review proposed content from a repo file", async () => {
  const repoPath = await mkdtemp(path.join(tmpdir(), "kforge-cli-review-content-"));
  try {
    await runCli(["init", repoPath]);
    await writeFile(path.join(repoPath, "raw", "source.md"), "# Source\n", "utf8");
    await writeFile(
      path.join(repoPath, "outputs", "draft.md"),
      "---\ntitle: Draft\nsources:\n  - raw/source.md\n---\n# Draft\n",
      "utf8",
    );
    await runCli([
      "review",
      "new",
      repoPath,
      "--title",
      "CLI content",
      "--target",
      "wiki/Draft.md",
      "--source",
      "raw/source.md",
      "--kind",
      "compile",
    ]);

    const content = await runCli([
      "review",
      "content",
      repoPath,
      "--file",
      `reviews/${today()}-cli-content.md`,
      "--from",
      "outputs/draft.md",
    ]);
    const contentJson = await runCli([
      "review",
      "content",
      repoPath,
      "--file",
      `reviews/${today()}-cli-content.md`,
      "--from",
      "outputs/draft.md",
      "--json",
    ]);
    const status = await runCli([
      "review",
      "status",
      repoPath,
      "--file",
      `reviews/${today()}-cli-content.md`,
      "--status",
      "accepted",
    ]);
    const statusJson = await runCli([
      "review",
      "status",
      repoPath,
      "--file",
      `reviews/${today()}-cli-content.md`,
      "--status",
      "accepted",
      "--json",
    ]);
    const dryRunJson = await runCli([
      "review",
      "apply",
      repoPath,
      "--file",
      `reviews/${today()}-cli-content.md`,
      "--dry-run",
      "--json",
    ]);
    const apply = await runCli([
      "review",
      "apply",
      repoPath,
      "--file",
      `reviews/${today()}-cli-content.md`,
    ]);
    const contentPayload = JSON.parse(contentJson.stdout) as { review?: string; source?: string; next?: string[] };
    const statusPayload = JSON.parse(statusJson.stdout) as { previousStatus?: string; status?: string; next?: string[] };
    const dryRunPayload = JSON.parse(dryRunJson.stdout) as { dryRun?: boolean; target?: string; content?: string; status?: string };

    assert.equal(content.exitCode, 0);
    assert.match(content.stdout, /Updated Proposed Content/);
    assert.equal(contentJson.exitCode, 0);
    assert.equal(contentPayload.review, `reviews/${today()}-cli-content.md`);
    assert.equal(contentPayload.source, "outputs/draft.md");
    assert.match(contentPayload.next?.join("\n") ?? "", /review status/);
    assert.equal(status.exitCode, 0);
    assert.equal(statusJson.exitCode, 0);
    assert.equal(statusPayload.previousStatus, "accepted");
    assert.equal(statusPayload.status, "accepted");
    assert.match(statusPayload.next?.join("\n") ?? "", /review apply/);
    assert.equal(dryRunJson.exitCode, 0);
    assert.equal(dryRunPayload.dryRun, true);
    assert.equal(dryRunPayload.target, "wiki/Draft.md");
    assert.equal(dryRunPayload.status, "accepted");
    assert.match(dryRunPayload.content ?? "", /# Draft/);
    assert.equal(apply.exitCode, 0);
    assert.match(await readFile(path.join(repoPath, "wiki", "Draft.md"), "utf8"), /# Draft/);
  } finally {
    await rm(repoPath, { recursive: true, force: true });
  }
});

test("cli can inspect and promote outputs as JSON", async () => {
  const repoPath = await mkdtemp(path.join(tmpdir(), "kforge-cli-output-json-"));
  try {
    await runCli(["init", repoPath]);
    await writeFile(path.join(repoPath, "raw", "source.md"), "# Source\n", "utf8");
    await writeFile(
      path.join(repoPath, "outputs", "answer.md"),
      "---\ntitle: Answer\nsources:\n  - raw/source.md\n---\n# Answer\n\nFiled through JSON automation.\n",
      "utf8",
    );

    const list = await runCli(["output", "list", repoPath, "--json"]);
    const inspect = await runCli(["output", "inspect", repoPath, "--file", "outputs/answer.md", "--json"]);
    const promote = await runCli([
      "promote",
      repoPath,
      "--file",
      "outputs/answer.md",
      "--target",
      "wiki/Answer.md",
      "--source",
      "raw/source.md",
      "--title",
      "CLI promote output",
      "--status",
      "accepted",
      "--json",
    ]);
    const listPayload = JSON.parse(list.stdout) as {
      ok?: boolean;
      counts?: { outputs?: number };
      items?: Array<{ output?: string; title?: string; reviewRefs?: string[] }>;
    };
    const inspectPayload = JSON.parse(inspect.stdout) as {
      ok?: boolean;
      output?: string;
      title?: string;
      sources?: string[];
      referencedBy?: string[];
      suggestedCommands?: string[];
    };
    const promotePayload = JSON.parse(promote.stdout) as {
      ok?: boolean;
      output?: string;
      target?: string;
      review?: string;
      status?: string;
      sources?: string[];
      next?: string[];
    };

    assert.equal(list.exitCode, 0);
    assert.equal(listPayload.ok, true);
    assert.equal(listPayload.counts?.outputs, 1);
    assert.equal(listPayload.items?.[0]?.output, "outputs/answer.md");
    assert.equal(listPayload.items?.[0]?.title, "Answer");
    assert.deepEqual(listPayload.items?.[0]?.reviewRefs, []);
    assert.equal(inspect.exitCode, 0);
    assert.equal(inspectPayload.ok, true);
    assert.equal(inspectPayload.output, "outputs/answer.md");
    assert.equal(inspectPayload.title, "Answer");
    assert.deepEqual(inspectPayload.sources, ["raw/source.md"]);
    assert.deepEqual(inspectPayload.referencedBy, []);
    assert.match(inspectPayload.suggestedCommands?.join("\n") ?? "", /kforge promote/);
    assert.equal(promote.exitCode, 0);
    assert.equal(promotePayload.ok, true);
    assert.equal(promotePayload.output, "outputs/answer.md");
    assert.equal(promotePayload.target, "wiki/Answer.md");
    assert.equal(promotePayload.review, `reviews/${today()}-cli-promote-output.md`);
    assert.equal(promotePayload.status, "accepted");
    assert.deepEqual(promotePayload.sources, ["outputs/answer.md", "raw/source.md"]);
    assert.match(promotePayload.next?.join("\n") ?? "", /review apply/);
    assert.match(await readFile(path.join(repoPath, "reviews", `${today()}-cli-promote-output.md`), "utf8"), /outputs\/answer.md/);
  } finally {
    await rm(repoPath, { recursive: true, force: true });
  }
});

test("cli can seed and claim parallel agent tasks as JSON", async () => {
  const repoPath = await mkdtemp(path.join(tmpdir(), "kforge-cli-task-json-"));
  try {
    await runCli(["init", repoPath]);
    await writeFile(path.join(repoPath, "raw", "source.md"), "# Source\n", "utf8");
    await runCli([
      "review",
      "new",
      repoPath,
      "--title",
      "CLI Task",
      "--target",
      "wiki/CLI Task.md",
      "--source",
      "raw/source.md",
      "--kind",
      "compile",
    ]);

    const seed = await runCli(["task", "seed", repoPath, "--json"]);
    const seedPayload = JSON.parse(seed.stdout) as {
      counts?: { created?: number };
      items?: Array<{ task?: string; source?: string; action?: string }>;
    };
    const task = seedPayload.items?.[0]?.task ?? "";
    const list = await runCli(["task", "list", repoPath, "--json"]);
    const claim = await runCli(["task", "claim", repoPath, "--task", task, "--agent", "cli-agent", "--json"]);
    const release = await runCli(["task", "release", repoPath, "--task", task, "--note", "pause", "--json"]);
    const reclaim = await runCli(["task", "claim", repoPath, "--task", task, "--agent", "cli-agent-2", "--json"]);
    const done = await runCli(["task", "done", repoPath, "--task", task, "--note", "finished", "--json"]);
    const listPayload = JSON.parse(list.stdout) as { items?: Array<{ status?: string; source?: string }> };
    const claimPayload = JSON.parse(claim.stdout) as { task?: { status?: string; owner?: string; file?: string } };
    const releasePayload = JSON.parse(release.stdout) as { task?: { status?: string; owner?: string } };
    const reclaimPayload = JSON.parse(reclaim.stdout) as { task?: { status?: string; owner?: string } };
    const donePayload = JSON.parse(done.stdout) as { task?: { status?: string; owner?: string } };

    assert.equal(seed.exitCode, 0);
    assert.equal(seedPayload.counts?.created, 1);
    assert.match(task, /^tasks\/.*cli-task\.md$/);
    assert.equal(seedPayload.items?.[0]?.source, `reviews/${today()}-cli-task.md`);
    assert.equal(list.exitCode, 0);
    assert.equal(listPayload.items?.[0]?.status, "open");
    assert.equal(listPayload.items?.[0]?.source, `reviews/${today()}-cli-task.md`);
    assert.equal(claim.exitCode, 0);
    assert.equal(claimPayload.task?.file, task);
    assert.equal(claimPayload.task?.status, "claimed");
    assert.equal(claimPayload.task?.owner, "cli-agent");
    assert.equal(releasePayload.task?.status, "open");
    assert.equal(releasePayload.task?.owner, undefined);
    assert.equal(reclaimPayload.task?.owner, "cli-agent-2");
    assert.equal(donePayload.task?.status, "done");
    assert.equal(donePayload.task?.owner, "cli-agent-2");
    assert.match(await readFile(path.join(repoPath, task), "utf8"), /finished/);

    await runCli([
      "review",
      "new",
      repoPath,
      "--title",
      "CLI Next",
      "--target",
      "wiki/CLI Next.md",
      "--source",
      "raw/source.md",
      "--kind",
      "compile",
    ]);
    const next = await runCli(["task", "next", repoPath, "--agent", "cli-agent-3", "--json"]);
    const nextPayload = JSON.parse(next.stdout) as {
      seeded?: { counts?: { created?: number } };
      task?: { status?: string; owner?: string; source?: string };
    };
    assert.equal(next.exitCode, 0);
    assert.equal((nextPayload.seeded?.counts?.created ?? 0) >= 1, true);
    assert.equal(nextPayload.task?.status, "claimed");
    assert.equal(nextPayload.task?.owner, "cli-agent-3");
    assert.match(nextPayload.task?.source ?? "", /^reviews\/.*\.md$/);
  } finally {
    await rm(repoPath, { recursive: true, force: true });
  }
});

test("cli can record run logs as JSON", async () => {
  const repoPath = await mkdtemp(path.join(tmpdir(), "kforge-cli-run-json-"));
  try {
    await runCli(["init", repoPath]);
    await writeFile(path.join(repoPath, "raw", "source.md"), "# Source\n", "utf8");
    await runCli([
      "review",
      "new",
      repoPath,
      "--title",
      "CLI Run",
      "--target",
      "wiki/CLI Run.md",
      "--source",
      "raw/source.md",
      "--kind",
      "compile",
    ]);
    const taskNext = await runCli(["task", "next", repoPath, "--agent", "cli-runner", "--json"]);
    const taskRef = (JSON.parse(taskNext.stdout) as { task?: { file?: string } }).task?.file ?? "";
    const started = await runCli(["run", "start", repoPath, "--task", taskRef, "--agent", "cli-runner", "--note", "begin", "--json"]);
    const runRef = (JSON.parse(started.stdout) as { run?: { file?: string } }).run?.file ?? "";
    const listed = await runCli(["run", "list", repoPath, "--json"]);
    const logged = await runCli(["run", "log", repoPath, "--run", runRef, "--message", "did work", "--json"]);
    const inspectedRunning = await runCli(["run", "inspect", repoPath, "--run", runRef, "--json"]);
    const finished = await runCli(["run", "finish", repoPath, "--run", runRef, "--status", "success", "--note", "done", "--json"]);
    const inspectedFinished = await runCli(["run", "inspect", repoPath, "--run", runRef, "--json"]);
    const success = await runCli(["run", "list", repoPath, "--status", "success", "--json"]);
    const listedPayload = JSON.parse(listed.stdout) as { items?: Array<{ file?: string; status?: string }> };
    const loggedPayload = JSON.parse(logged.stdout) as { run?: { logCount?: number } };
    const inspectedRunningPayload = JSON.parse(inspectedRunning.stdout) as { run?: { file?: string }; task?: { file?: string }; logs?: Array<{ message?: string }> };
    const finishedPayload = JSON.parse(finished.stdout) as { run?: { status?: string; logCount?: number } };
    const inspectedFinishedPayload = JSON.parse(inspectedFinished.stdout) as { run?: { status?: string }; logs?: Array<{ message?: string }>; next?: string[] };
    const successPayload = JSON.parse(success.stdout) as { items?: Array<{ file?: string }> };

    assert.equal(started.exitCode, 0);
    assert.match(runRef, /^runs\/.*cli-run-cli-runner\.md$/);
    assert.equal(listedPayload.items?.[0]?.file, runRef);
    assert.equal(listedPayload.items?.[0]?.status, "running");
    assert.equal(loggedPayload.run?.logCount, 2);
    assert.equal(inspectedRunningPayload.run?.file, runRef);
    assert.equal(inspectedRunningPayload.task?.file, taskRef);
    assert.equal(inspectedRunningPayload.logs?.[0]?.message, "did work");
    assert.equal(finishedPayload.run?.status, "success");
    assert.equal(finishedPayload.run?.logCount, 3);
    assert.equal(inspectedFinishedPayload.run?.status, "success");
    assert.equal(inspectedFinishedPayload.logs?.length, 3);
    assert.match(inspectedFinishedPayload.next?.[0] ?? "", /^kforge task done/);
    assert.equal(successPayload.items?.[0]?.file, runRef);
    assert.match(await readFile(path.join(repoPath, runRef), "utf8"), /did work/);

    await runCli([
      "review",
      "new",
      repoPath,
      "--title",
      "CLI Run Next",
      "--target",
      "wiki/CLI Run Next.md",
      "--source",
      "raw/source.md",
      "--kind",
      "compile",
    ]);
    const next = await runCli(["run", "next", repoPath, "--agent", "cli-runner-next", "--note", "one step", "--json"]);
    const nextPayload = JSON.parse(next.stdout) as {
      task?: { status?: string; owner?: string; file?: string };
      run?: { status?: string; agent?: string; task?: string; file?: string };
    };
    assert.equal(next.exitCode, 0);
    assert.equal(nextPayload.task?.status, "claimed");
    assert.equal(nextPayload.task?.owner, "cli-runner-next");
    assert.equal(nextPayload.run?.status, "running");
    assert.equal(nextPayload.run?.agent, "cli-runner-next");
    assert.equal(nextPayload.run?.task, nextPayload.task?.file);
  } finally {
    await rm(repoPath, { recursive: true, force: true });
  }
});

test("cli doctor json is parseable and preserves failing exit codes", async () => {
  const repoPath = await mkdtemp(path.join(tmpdir(), "kforge-cli-doctor-json-"));
  try {
    await runCli(["init", repoPath]);
    await writeFile(
      path.join(repoPath, "wiki", "Broken.md"),
      "---\nsources: []\n---\n# Broken\n[[Missing Page]]\n",
      "utf8",
    );

    const result = await runCli(["doctor", repoPath, "--json"]);
    const payload = JSON.parse(result.stdout) as { ok: boolean; status: string; messages: string[]; checkedAt: string };

    assert.equal(result.exitCode, 1);
    assert.equal(payload.ok, false);
    assert.equal(payload.status, "needs_attention");
    assert.equal(payload.messages.some((message) => message.includes("Missing Page")), true);
    assert.match(payload.checkedAt, /^\d{4}-\d{2}-\d{2}$/);
  } finally {
    await rm(repoPath, { recursive: true, force: true });
  }
});

test("cli returns nonzero for invalid repo-local file paths", async () => {
  const repoPath = await mkdtemp(path.join(tmpdir(), "kforge-cli-invalid-"));
  try {
    await runCli(["init", repoPath]);

    const result = await runCli(["inspect", repoPath, "--file", "../outside.md"]);

    assert.equal(result.exitCode, 1);
    assert.match(result.stdout, /inspect path check failed/);
  } finally {
    await rm(repoPath, { recursive: true, force: true });
  }
});

async function runCli(args: string[]): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  try {
    const { stdout, stderr } = await execFileAsync(process.execPath, [path.resolve("dist/src/cli.js"), ...args], {
      cwd: path.resolve("."),
    });

    return { exitCode: 0, stdout, stderr };
  } catch (error) {
    const failed = error as { code?: number; stdout?: string; stderr?: string };
    return {
      exitCode: failed.code ?? 1,
      stdout: failed.stdout ?? "",
      stderr: failed.stderr ?? "",
    };
  }
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
