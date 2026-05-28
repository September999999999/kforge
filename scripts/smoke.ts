import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const root = process.cwd();
const cli = path.join(root, "dist", "src", "cli.js");
const mcp = path.join(root, "dist", "src", "mcp.js");

async function main(): Promise<void> {
  const demoRepo = await mkdtemp(path.join(tmpdir(), "kforge-smoke-demo-"));
  const exampleRepo = await mkdtemp(path.join(tmpdir(), "kforge-smoke-example-"));
  const agentLoopRepo = await mkdtemp(path.join(tmpdir(), "kforge-smoke-agent-loop-"));

  try {
    await assertDemoRepoFixture();

    await expectStdout(["demo", exampleRepo], /Demo repo ready/);
    await runCli(["refresh", exampleRepo]);
    await expectStdout(["review", "queue", exampleRepo], /# Review Queue/);
    await expectStdout(["review", "next", exampleRepo], /# Next Review/);
    await expectStdout(["agent", "list"], /# Agent Templates/);
    await expectStdout(["agent", "print", "--template", "claude"], /# CLAUDE.md/);
    await expectStdout(["agent", "install", exampleRepo, "--template", "cursor"], /\.cursor\/rules\/kforge.mdc/);
    await assertAgentDraftLoop(agentLoopRepo);

    await runCli(["init", demoRepo]);
    const singleSource = path.join(demoRepo, "..", "single-source.md");
    await writeFile(singleSource, "# Single Source\n\nSingle evidence.\n", "utf8");
    const sourceAddJson = await runCli([
      "source",
      "add",
      demoRepo,
      "--file",
      singleSource,
      "--title",
      "Smoke Single",
      "--json",
    ]);
    const sourceAddPayload = JSON.parse(sourceAddJson.stdout) as {
      ok?: boolean;
      action?: string;
      source?: string;
      metadata?: string;
    };
    if (
      sourceAddPayload.ok !== true ||
      sourceAddPayload.action !== "added" ||
      sourceAddPayload.source !== "raw/smoke-single.md" ||
      sourceAddPayload.metadata !== "raw/_meta/smoke-single.md"
    ) {
      throw new Error(`source add JSON smoke check failed: ${sourceAddJson.stdout}`);
    }
    const bulkDir = path.join(demoRepo, "..", "bulk-sources");
    await mkdir(bulkDir, { recursive: true });
    await writeFile(path.join(bulkDir, "Bulk One.md"), "# Bulk One\n\nBulk evidence.\n", "utf8");
    await writeFile(path.join(bulkDir, "Bulk Two.md"), "# Bulk Two\n\nMore bulk evidence.\n", "utf8");
    await expectStdout(["source", "import", demoRepo, "--dir", bulkDir, "--dry-run"], /Dry run: would import 2 source file/);
    const sourceImportDryRunJson = await runCli(["source", "import", demoRepo, "--dir", bulkDir, "--title-prefix", "Smoke", "--dry-run", "--json"]);
    const sourceImportDryRunPayload = JSON.parse(sourceImportDryRunJson.stdout) as {
      ok?: boolean;
      dryRun?: boolean;
      counts?: {
        candidates?: number;
        wouldImport?: number;
        imported?: number;
      };
      items?: Array<{ source?: string; metadata?: string; action?: string }>;
    };
    if (
      sourceImportDryRunPayload.ok !== true ||
      sourceImportDryRunPayload.dryRun !== true ||
      sourceImportDryRunPayload.counts?.candidates !== 2 ||
      sourceImportDryRunPayload.counts?.wouldImport !== 2 ||
      sourceImportDryRunPayload.counts?.imported !== 0 ||
      sourceImportDryRunPayload.items?.[0]?.action !== "would_import" ||
      sourceImportDryRunPayload.items?.[0]?.source !== "raw/smoke-bulk-one.md"
    ) {
      throw new Error(`source import dry-run JSON smoke check failed: ${sourceImportDryRunJson.stdout}`);
    }
    const sourceImportJson = await runCli(["source", "import", demoRepo, "--dir", bulkDir, "--title-prefix", "Smoke", "--json"]);
    const sourceImportPayload = JSON.parse(sourceImportJson.stdout) as {
      ok?: boolean;
      dryRun?: boolean;
      counts?: {
        candidates?: number;
        imported?: number;
      };
      items?: Array<{ source?: string; metadata?: string; action?: string }>;
    };
    if (
      sourceImportPayload.ok !== true ||
      sourceImportPayload.dryRun !== false ||
      sourceImportPayload.counts?.candidates !== 2 ||
      sourceImportPayload.counts?.imported !== 2 ||
      sourceImportPayload.items?.[0]?.action !== "imported" ||
      sourceImportPayload.items?.[0]?.source !== "raw/smoke-bulk-one.md" ||
      sourceImportPayload.items?.[0]?.metadata !== "raw/_meta/smoke-bulk-one.md"
    ) {
      throw new Error(`source import JSON smoke check failed: ${sourceImportJson.stdout}`);
    }
    await expectStdout(["compile", "plan", demoRepo], /# Compile Plan/);
    const compilePlanJson = await runCli(["compile", "plan", demoRepo, "--json"]);
    const compilePlanPayload = JSON.parse(compilePlanJson.stdout) as {
      ok?: boolean;
      counts?: {
        queuedSources?: number;
      };
      queued?: Array<{ source?: string; command?: string }>;
    };
    if (
      compilePlanPayload.ok !== true ||
      compilePlanPayload.counts?.queuedSources !== 3 ||
      !compilePlanPayload.queued?.some((item) => item.source === "raw/smoke-single.md") ||
      !compilePlanPayload.queued?.some((item) => item.source === "raw/smoke-bulk-one.md") ||
      !compilePlanPayload.queued[0].command?.includes("kforge compile")
    ) {
      throw new Error(`compile plan JSON smoke check failed: ${compilePlanJson.stdout}`);
    }
    await expectStdout(["compile", "plan", demoRepo, "--write"], /indexes\/compile-plan.md/);
    const compileReviewDryRunJson = await runCli(["compile", "review", demoRepo, "--dry-run", "--json"]);
    const compileReviewDryRunPayload = JSON.parse(compileReviewDryRunJson.stdout) as {
      ok?: boolean;
      dryRun?: boolean;
      counts?: {
        candidates?: number;
        wouldCreate?: number;
        created?: number;
        skipped?: number;
      };
      items?: Array<{ source?: string; target?: string; action?: string; review?: string }>;
    };
    if (
      compileReviewDryRunPayload.ok !== true ||
      compileReviewDryRunPayload.dryRun !== true ||
      compileReviewDryRunPayload.counts?.wouldCreate !== 3 ||
      compileReviewDryRunPayload.counts?.created !== 0 ||
      compileReviewDryRunPayload.items?.[0]?.action !== "would_create" ||
      !compileReviewDryRunPayload.items?.some((item) => item.source === "raw/smoke-bulk-one.md") ||
      compileReviewDryRunPayload.items?.[0]?.review !== undefined
    ) {
      throw new Error(`compile review dry-run JSON smoke check failed: ${compileReviewDryRunJson.stdout}`);
    }
    const compileReviewJson = await runCli(["compile", "review", demoRepo, "--limit", "1", "--json"]);
    const compileReviewPayload = JSON.parse(compileReviewJson.stdout) as {
      ok?: boolean;
      dryRun?: boolean;
      counts?: {
        created?: number;
        skipped?: number;
      };
      items?: Array<{ action?: string; review?: string }>;
    };
    if (
      compileReviewPayload.ok !== true ||
      compileReviewPayload.dryRun !== false ||
      compileReviewPayload.counts?.created !== 1 ||
      compileReviewPayload.items?.[0]?.action !== "created" ||
      !compileReviewPayload.items?.[0]?.review?.includes("reviews/")
    ) {
      throw new Error(`compile review JSON smoke check failed: ${compileReviewJson.stdout}`);
    }
    const compileDraftJson = await runCli([
      "compile",
      "draft",
      demoRepo,
      "--review",
      `reviews/${today()}-compile-smoke-bulk-one.md`,
      "--write",
      "--json",
    ]);
    const compileDraftPayload = JSON.parse(compileDraftJson.stdout) as {
      ok?: boolean;
      written?: boolean;
      output?: string;
      next?: string[];
    };
    if (
      compileDraftPayload.ok !== true ||
      compileDraftPayload.written !== true ||
      compileDraftPayload.output !== `outputs/${today()}-smoke-bulk-one-draft.md` ||
      !compileDraftPayload.next?.some((command) => command.includes("kforge review content"))
    ) {
      throw new Error(`compile draft JSON smoke check failed: ${compileDraftJson.stdout}`);
    }
    await writeFile(path.join(demoRepo, "raw", "source.md"), "# Source\n\nEvidence for smoke tests.\n", "utf8");
    await runCli(["claim", "new", demoRepo, "--title", "Demo claim", "--source", "raw/source.md"]);
    await runCli([
      "review",
      "new",
      demoRepo,
      "--title",
      "Demo review",
      "--target",
      "wiki/Demo.md",
      "--source",
      "raw/source.md",
      "--kind",
      "compile",
    ]);
    await expectStdout(["review", "queue", demoRepo], /Demo review/);
    await expectStdout(["review", "queue", demoRepo, "--json"], /"suggestedCommands"/);
    await expectStdout(["review", "next", demoRepo, "--json"], /"next"/);
    const taskSeedJson = await runCli(["task", "seed", demoRepo, "--limit", "1", "--json"]);
    const taskSeedPayload = JSON.parse(taskSeedJson.stdout) as {
      ok?: boolean;
      counts?: { created?: number };
      items?: Array<{ task?: string; source?: string }>;
    };
    const taskRef = taskSeedPayload.items?.[0]?.task ?? "";
    if (
      taskSeedPayload.ok !== true ||
      taskSeedPayload.counts?.created !== 1 ||
      !taskRef.startsWith("tasks/")
    ) {
      throw new Error(`task seed JSON smoke check failed: ${taskSeedJson.stdout}`);
    }
    const taskClaimJson = await runCli(["task", "claim", demoRepo, "--task", taskRef, "--agent", "smoke-agent", "--json"]);
    const taskClaimPayload = JSON.parse(taskClaimJson.stdout) as {
      ok?: boolean;
      task?: { status?: string; owner?: string; file?: string };
    };
    if (
      taskClaimPayload.ok !== true ||
      taskClaimPayload.task?.file !== taskRef ||
      taskClaimPayload.task?.status !== "claimed" ||
      taskClaimPayload.task?.owner !== "smoke-agent"
    ) {
      throw new Error(`task claim JSON smoke check failed: ${taskClaimJson.stdout}`);
    }
    const taskReleaseJson = await runCli(["task", "release", demoRepo, "--task", taskRef, "--json"]);
    const taskReleasePayload = JSON.parse(taskReleaseJson.stdout) as {
      ok?: boolean;
      task?: { status?: string };
    };
    if (taskReleasePayload.ok !== true || taskReleasePayload.task?.status !== "open") {
      throw new Error(`task release JSON smoke check failed: ${taskReleaseJson.stdout}`);
    }
    await runCli(["task", "claim", demoRepo, "--task", taskRef, "--agent", "smoke-agent", "--json"]);
    const taskDoneJson = await runCli(["task", "done", demoRepo, "--task", taskRef, "--note", "smoke done", "--json"]);
    const taskDonePayload = JSON.parse(taskDoneJson.stdout) as {
      ok?: boolean;
      task?: { status?: string; owner?: string };
    };
    if (
      taskDonePayload.ok !== true ||
      taskDonePayload.task?.status !== "done" ||
      taskDonePayload.task?.owner !== "smoke-agent"
    ) {
      throw new Error(`task done JSON smoke check failed: ${taskDoneJson.stdout}`);
    }
    await runCli([
      "review",
      "new",
      demoRepo,
      "--title",
      "Demo next task",
      "--target",
      "wiki/DemoNext.md",
      "--source",
      "raw/source.md",
      "--kind",
      "compile",
    ]);
    const runNextJson = await runCli(["run", "next", demoRepo, "--agent", "smoke-agent-next", "--note", "smoke run", "--json"]);
    const runNextPayload = JSON.parse(runNextJson.stdout) as {
      ok?: boolean;
      seeded?: { counts?: { created?: number } };
      task?: { file?: string; status?: string; owner?: string; source?: string };
      run?: { file?: string; status?: string; agent?: string; task?: string };
    };
    const runRef = runNextPayload.run?.file ?? "";
    if (
      runNextPayload.ok !== true ||
      !runNextPayload.seeded?.counts?.created ||
      !runNextPayload.task?.file ||
      runNextPayload.task?.status !== "claimed" ||
      runNextPayload.task?.owner !== "smoke-agent-next" ||
      !runNextPayload.task?.source?.startsWith("reviews/") ||
      !runRef.startsWith("runs/") ||
      runNextPayload.run?.status !== "running" ||
      runNextPayload.run?.agent !== "smoke-agent-next" ||
      runNextPayload.run?.task !== runNextPayload.task.file
    ) {
      throw new Error(`run next JSON smoke check failed: ${runNextJson.stdout}`);
    }
    const runLogJson = await runCli(["run", "log", demoRepo, "--run", runRef, "--message", "smoke logged work", "--json"]);
    const runLogPayload = JSON.parse(runLogJson.stdout) as {
      ok?: boolean;
      run?: { logCount?: number };
    };
    if (runLogPayload.ok !== true || runLogPayload.run?.logCount !== 2) {
      throw new Error(`run log JSON smoke check failed: ${runLogJson.stdout}`);
    }
    const runFinishJson = await runCli(["run", "finish", demoRepo, "--run", runRef, "--status", "success", "--note", "smoke done", "--json"]);
    const runFinishPayload = JSON.parse(runFinishJson.stdout) as {
      ok?: boolean;
      run?: { status?: string; logCount?: number };
    };
    if (runFinishPayload.ok !== true || runFinishPayload.run?.status !== "success" || runFinishPayload.run?.logCount !== 3) {
      throw new Error(`run finish JSON smoke check failed: ${runFinishJson.stdout}`);
    }
    await runCli(["refresh", demoRepo]);
    await expectStdout(["search", demoRepo, "--query", "Evidence", "--scope", "raw"], /raw\/source.md/);
    await expectStdout(["inspect", demoRepo, "--file", "raw/source.md"], /# File Inspect|# Source Inspect/);
    await runCli(["pack", demoRepo, "--task", "Explain source evidence", "--query", "Evidence", "--file", "raw/source.md", "--write"]);
    await runCli(["ask", demoRepo, "--question", "Explain source evidence", "--query", "Evidence", "--file", "raw/source.md", "--write"]);
    await expectStdout(["output", "list", demoRepo], /answer-pack/);
    const outputListJson = await runCli(["output", "list", demoRepo, "--json"]);
    const outputListPayload = JSON.parse(outputListJson.stdout) as {
      ok?: boolean;
      counts?: { outputs?: number };
      items?: Array<{ output?: string; title?: string }>;
    };

    const answerPack = `outputs/${today()}-explain-source-evidence-answer-pack.md`;
    await expectStdout(["output", "inspect", demoRepo, "--file", answerPack], /# Output Inspect/);
    const outputInspectJson = await runCli(["output", "inspect", demoRepo, "--file", answerPack, "--json"]);
    const outputInspectPayload = JSON.parse(outputInspectJson.stdout) as {
      ok?: boolean;
      output?: string;
      title?: string;
      suggestedCommands?: string[];
    };
    if (
      outputListPayload.ok !== true ||
      !outputListPayload.counts?.outputs ||
      !outputListPayload.items?.some((item) => item.output === answerPack) ||
      outputInspectPayload.ok !== true ||
      outputInspectPayload.output !== answerPack ||
      outputInspectPayload.title !== "Answer Pack" ||
      !outputInspectPayload.suggestedCommands?.some((command) => command.includes("kforge promote"))
    ) {
      throw new Error(`output JSON smoke check failed: ${outputListJson.stdout}\n${outputInspectJson.stdout}`);
    }
    await expectFailure(["promote", demoRepo, "--file", answerPack, "--target", "wiki/SourceEvidence.md", "--source", "raw/source.md", "--status", "accepted"], /unresolved draft markers/);
    await writeFile(
      path.join(demoRepo, "outputs", "demo-draft.md"),
      "---\ntitle: Demo\nsources:\n  - raw/source.md\n---\n# Demo\n",
      "utf8",
    );
    await writeFile(
      path.join(demoRepo, "outputs", "source-evidence.md"),
      "---\ntitle: Source Evidence\nsources:\n  - raw/source.md\n---\n# Source Evidence\n\nThe source says this repo has evidence for smoke tests.\n",
      "utf8",
    );
    await expectStdout([
      "review",
      "content",
      demoRepo,
      "--file",
      `reviews/${today()}-demo-review.md`,
      "--from",
      "outputs/demo-draft.md",
    ], /Updated Proposed Content/);
    const reviewContentJson = await runCli([
      "review",
      "content",
      demoRepo,
      "--file",
      `reviews/${today()}-demo-review.md`,
      "--from",
      "outputs/demo-draft.md",
      "--json",
    ]);
    const reviewContentPayload = JSON.parse(reviewContentJson.stdout) as {
      ok?: boolean;
      review?: string;
      source?: string;
      next?: string[];
    };
    if (
      reviewContentPayload.ok !== true ||
      reviewContentPayload.review !== `reviews/${today()}-demo-review.md` ||
      reviewContentPayload.source !== "outputs/demo-draft.md" ||
      !reviewContentPayload.next?.some((command) => command.includes("review status"))
    ) {
      throw new Error(`review content JSON smoke check failed: ${reviewContentJson.stdout}`);
    }
    const promoteJson = await runCli([
      "promote",
      demoRepo,
      "--file",
      "outputs/source-evidence.md",
      "--target",
      "wiki/SourceEvidence.md",
      "--source",
      "raw/source.md",
      "--title",
      "Promote source evidence",
      "--status",
      "accepted",
      "--json",
    ]);
    const promotePayload = JSON.parse(promoteJson.stdout) as {
      ok?: boolean;
      output?: string;
      target?: string;
      review?: string;
      status?: string;
      sources?: string[];
      next?: string[];
    };
    if (
      promotePayload.ok !== true ||
      promotePayload.output !== "outputs/source-evidence.md" ||
      promotePayload.target !== "wiki/SourceEvidence.md" ||
      promotePayload.review !== `reviews/${today()}-promote-source-evidence.md` ||
      promotePayload.status !== "accepted" ||
      !promotePayload.sources?.includes("raw/source.md") ||
      !promotePayload.next?.some((command) => command.includes("review apply"))
    ) {
      throw new Error(`promote JSON smoke check failed: ${promoteJson.stdout}`);
    }
    await expectStdout(["review", "queue", demoRepo, "--status", "accepted"], /Promote source evidence/);
    const reviewApplyDryRunJson = await runCli(["review", "apply", demoRepo, "--file", `reviews/${today()}-promote-source-evidence.md`, "--dry-run", "--json"]);
    const reviewApplyDryRunPayload = JSON.parse(reviewApplyDryRunJson.stdout) as {
      ok?: boolean;
      dryRun?: boolean;
      target?: string;
      content?: string;
    };
    if (
      reviewApplyDryRunPayload.ok !== true ||
      reviewApplyDryRunPayload.dryRun !== true ||
      reviewApplyDryRunPayload.target !== "wiki/SourceEvidence.md" ||
      !reviewApplyDryRunPayload.content?.includes("# Source Evidence")
    ) {
      throw new Error(`review apply dry-run JSON smoke check failed: ${reviewApplyDryRunJson.stdout}`);
    }
    const reviewApplyJson = await runCli(["review", "apply", demoRepo, "--file", `reviews/${today()}-promote-source-evidence.md`, "--json"]);
    const reviewApplyPayload = JSON.parse(reviewApplyJson.stdout) as {
      ok?: boolean;
      dryRun?: boolean;
      status?: string;
      target?: string;
    };
    if (
      reviewApplyPayload.ok !== true ||
      reviewApplyPayload.dryRun !== false ||
      reviewApplyPayload.status !== "applied" ||
      reviewApplyPayload.target !== "wiki/SourceEvidence.md"
    ) {
      throw new Error(`review apply JSON smoke check failed: ${reviewApplyJson.stdout}`);
    }
    await runCli(["refresh", demoRepo]);

    const doctor = await runCli(["doctor", demoRepo, "--json"]);
    const doctorPayload = JSON.parse(doctor.stdout) as { ok?: boolean };
    if (doctorPayload.ok !== true) {
      throw new Error(`doctor smoke check failed: ${doctor.stdout}`);
    }

    await runNode([mcp, "--help"], /kforge-mcp/);
    await runNode(["-e", "import('./dist/src/index.js').then((m) => console.log(Boolean(m.initRepo && m.reviewQueue && m.installAgentTemplate && m.importSources && m.compilePlanRepo && m.compileReviewRepo && m.compileDraftRepo && m.agentDraft && m.updateReviewContent)))"], /true/);

    console.log("Smoke checks passed.");
  } finally {
    await rm(demoRepo, { recursive: true, force: true });
    await rm(exampleRepo, { recursive: true, force: true });
    await rm(agentLoopRepo, { recursive: true, force: true });
  }
}

async function assertAgentDraftLoop(repoPath: string): Promise<void> {
  await runCli(["init", repoPath]);
  await writeFile(path.join(repoPath, "raw", "agent-source.md"), "# Agent Source\n\nAgent evidence for the draft loop.\n", "utf8");
  await runCli([
    "review",
    "new",
    repoPath,
    "--title",
    "Agent Draft Loop",
    "--target",
    "wiki/AgentDraftLoop.md",
    "--source",
    "raw/agent-source.md",
    "--kind",
    "compile",
  ]);

  const agentNextJson = await runCli(["agent", "next", repoPath, "--agent", "smoke-agent-loop", "--note", "start high-level agent loop", "--json"]);
  const agentNextPayload = JSON.parse(agentNextJson.stdout) as {
    ok?: boolean;
    task?: { file?: string; status?: string; owner?: string; source?: string };
    run?: { file?: string; status?: string; agent?: string; task?: string };
  };
  const runRef = agentNextPayload.run?.file ?? "";
  if (
    agentNextPayload.ok !== true ||
    agentNextPayload.task?.status !== "claimed" ||
    agentNextPayload.task?.owner !== "smoke-agent-loop" ||
    agentNextPayload.task?.source !== `reviews/${today()}-agent-draft-loop.md` ||
    !runRef.startsWith("runs/") ||
    agentNextPayload.run?.status !== "running" ||
    agentNextPayload.run?.agent !== "smoke-agent-loop" ||
    agentNextPayload.run?.task !== agentNextPayload.task.file
  ) {
    throw new Error(`agent next JSON smoke check failed: ${agentNextJson.stdout}`);
  }

  const agentStepJson = await runCli(["agent", "step", repoPath, "--agent", "smoke-agent-loop", "--json"]);
  const agentStepPayload = JSON.parse(agentStepJson.stdout) as {
    ok?: boolean;
    started?: boolean;
    run?: { file?: string };
    task?: { file?: string };
    commands?: string[];
  };
  if (
    agentStepPayload.ok !== true ||
    agentStepPayload.started !== false ||
    agentStepPayload.run?.file !== runRef ||
    agentStepPayload.task?.file !== agentNextPayload.task.file ||
    !agentStepPayload.commands?.some((command) => command.includes("kforge agent draft"))
  ) {
    throw new Error(`agent step JSON smoke check failed: ${agentStepJson.stdout}`);
  }

  const agentDraftJson = await runCli(["agent", "draft", repoPath, "--agent", "smoke-agent-loop", "--json"]);
  const agentDraftPayload = JSON.parse(agentDraftJson.stdout) as {
    ok?: boolean;
    run?: { file?: string };
    task?: { file?: string; source?: string };
    draft?: { written?: boolean; review?: string; output?: string };
    next?: string[];
  };
  const outputRef = agentDraftPayload.draft?.output ?? "";
  if (
    agentDraftPayload.ok !== true ||
    agentDraftPayload.run?.file !== runRef ||
    agentDraftPayload.task?.file !== agentNextPayload.task.file ||
    agentDraftPayload.draft?.written !== true ||
    agentDraftPayload.draft?.review !== agentNextPayload.task.source ||
    !outputRef.startsWith("outputs/") ||
    !agentDraftPayload.next?.some((command) => command.includes("kforge review content"))
  ) {
    throw new Error(`agent draft JSON smoke check failed: ${agentDraftJson.stdout}`);
  }
  if (!/TODO/.test(await readFile(path.join(repoPath, outputRef), "utf8"))) {
    throw new Error(`agent draft output should start as an editable template: ${outputRef}`);
  }

  await writeFile(
    path.join(repoPath, outputRef),
    [
      "---",
      "title: Agent Draft Loop",
      "status: published",
      "kind: concept",
      "sources:",
      "  - raw/agent-source.md",
      "confidence: medium",
      `last_compiled: ${today()}`,
      "---",
      "",
      "# Agent Draft Loop",
      "",
      "The source says this repo has agent evidence for the draft loop.",
      "",
      "## Evidence",
      "",
      "- `raw/agent-source.md`: Agent evidence for the draft loop.",
      "",
    ].join("\n"),
    "utf8",
  );

  const reviewContentJson = await runCli(["review", "content", repoPath, "--file", agentNextPayload.task.source ?? "", "--from", outputRef, "--json"]);
  const reviewContentPayload = JSON.parse(reviewContentJson.stdout) as {
    ok?: boolean;
    review?: string;
    source?: string;
  };
  if (
    reviewContentPayload.ok !== true ||
    reviewContentPayload.review !== agentNextPayload.task.source ||
    reviewContentPayload.source !== outputRef
  ) {
    throw new Error(`agent review content JSON smoke check failed: ${reviewContentJson.stdout}`);
  }

  const reviewStatusJson = await runCli([
    "review",
    "status",
    repoPath,
    "--file",
    agentNextPayload.task.source ?? "",
    "--status",
    "accepted",
    "--note",
    "Agent draft checked.",
    "--json",
  ]);
  const reviewStatusPayload = JSON.parse(reviewStatusJson.stdout) as {
    ok?: boolean;
    status?: string;
  };
  if (reviewStatusPayload.ok !== true || reviewStatusPayload.status !== "accepted") {
    throw new Error(`agent review status JSON smoke check failed: ${reviewStatusJson.stdout}`);
  }

  const reviewApplyJson = await runCli(["review", "apply", repoPath, "--file", agentNextPayload.task.source ?? "", "--json"]);
  const reviewApplyPayload = JSON.parse(reviewApplyJson.stdout) as {
    ok?: boolean;
    status?: string;
    target?: string;
  };
  if (
    reviewApplyPayload.ok !== true ||
    reviewApplyPayload.status !== "applied" ||
    reviewApplyPayload.target !== "wiki/AgentDraftLoop.md" ||
    !/# Agent Draft Loop/.test(await readFile(path.join(repoPath, "wiki", "AgentDraftLoop.md"), "utf8"))
  ) {
    throw new Error(`agent review apply JSON smoke check failed: ${reviewApplyJson.stdout}`);
  }

  await runCli(["run", "log", repoPath, "--run", runRef, "--message", `Filed agent draft ${outputRef}.`, "--json"]);
  const agentFinishJson = await runCli(["agent", "finish", repoPath, "--agent", "smoke-agent-loop", "--task-done", "--note", "agent draft loop filed", "--json"]);
  const agentFinishPayload = JSON.parse(agentFinishJson.stdout) as {
    ok?: boolean;
    run?: { status?: string; file?: string };
    task?: { status?: string; file?: string };
  };
  if (
    agentFinishPayload.ok !== true ||
    agentFinishPayload.run?.status !== "success" ||
    agentFinishPayload.run?.file !== runRef ||
    agentFinishPayload.task?.status !== "done" ||
    agentFinishPayload.task?.file !== agentNextPayload.task.file
  ) {
    throw new Error(`agent finish JSON smoke check failed: ${agentFinishJson.stdout}`);
  }

  await runCli(["refresh", repoPath]);
  const doctor = await runCli(["doctor", repoPath, "--json"]);
  const doctorPayload = JSON.parse(doctor.stdout) as { ok?: boolean };
  if (doctorPayload.ok !== true) {
    throw new Error(`agent loop doctor smoke check failed: ${doctor.stdout}`);
  }
}

async function assertDemoRepoFixture(): Promise<void> {
  const requiredFiles = [
    "kb.yaml",
    "AGENTS.md",
    "raw/llm-knowledge-bases.md",
    "wiki/LLM Knowledge Bases.md",
    "wiki/Provenance.md",
    "claims/source-grounded-wikis.md",
    "reviews/demo-compile-provenance.md",
    "outputs/example-task-pack.md",
    "indexes/source-inventory.md",
    "indexes/doctor.md",
  ];

  for (const file of requiredFiles) {
    await stat(path.join(root, "examples", "demo-repo", file));
  }
}

async function expectStdout(args: string[], pattern: RegExp): Promise<void> {
  const result = await runCli(args);
  if (!pattern.test(result.stdout)) {
    throw new Error(`Expected ${pattern} in output for ${args.join(" ")}:\n${result.stdout}`);
  }
}

async function runCli(args: string[]): Promise<{ stdout: string; stderr: string }> {
  return runNode([cli, ...args]);
}

async function expectFailure(args: string[], stdoutPattern: RegExp): Promise<void> {
  try {
    await runCli(args);
  } catch (error) {
    const failed = error as { stdout?: string; stderr?: string };
    const output = `${failed.stdout ?? ""}\n${failed.stderr ?? ""}`;
    if (!stdoutPattern.test(output)) {
      throw new Error(`Expected ${stdoutPattern} in failure output for ${args.join(" ")}:\n${output}`);
    }
    return;
  }

  throw new Error(`Expected command to fail: ${args.join(" ")}`);
}

async function runNode(args: string[], stdoutPattern?: RegExp): Promise<{ stdout: string; stderr: string }> {
  const result = await execFileAsync(process.execPath, args, {
    cwd: root,
    maxBuffer: 10 * 1024 * 1024,
  });

  if (stdoutPattern && !stdoutPattern.test(result.stdout)) {
    throw new Error(`Expected ${stdoutPattern} in output for node ${args.join(" ")}:\n${result.stdout}`);
  }

  return result;
}

function today(): string {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

await main();
