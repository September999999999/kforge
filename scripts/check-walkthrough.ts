import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const root = process.cwd();
const cli = path.join(root, "dist", "src", "cli.js");

async function main(): Promise<void> {
  const repoPath = await mkdtemp(path.join(tmpdir(), "kforge-walkthrough-"));

  try {
    await expectText(["demo", repoPath], /Demo repo ready/);

    const queue = await runJson<{
      ok?: boolean;
      showing?: number;
      total?: number;
      next?: { file?: string; targets?: string[]; sources?: string[] };
    }>(["review", "queue", repoPath, "--json"]);
    expect(queue.ok === true, "review queue should return ok");
    expect(queue.showing === 1 && queue.total === 1, "demo repo should start with one actionable review");
    expect(queue.next?.file === "reviews/demo-compile-provenance.md", "demo next review should be the provenance compile review");
    expect(queue.next?.targets?.includes("wiki/Provenance.md") === true, "demo next review should target wiki/Provenance.md");
    expect(queue.next?.sources?.includes("raw/llm-knowledge-bases.md") === true, "demo next review should cite the raw source");

    const agentNext = await runJson<{
      ok?: boolean;
      task?: { file?: string; status?: string; owner?: string; source?: string };
      run?: { file?: string; status?: string; agent?: string; task?: string };
    }>(["agent", "next", repoPath, "--agent", "walkthrough-agent", "--json"]);
    const taskRef = requireString(agentNext.task?.file, "agent next should return a task ref");
    const runRef = requireString(agentNext.run?.file, "agent next should return a run ref");
    expect(agentNext.ok === true, "agent next should return ok");
    expect(agentNext.task?.status === "claimed", "agent next should claim the task");
    expect(agentNext.task?.owner === "walkthrough-agent", "agent next should assign the agent");
    expect(agentNext.task?.source === "reviews/demo-compile-provenance.md", "agent task should point at the demo review");
    expect(agentNext.run?.status === "running", "agent next should start a run");
    expect(agentNext.run?.agent === "walkthrough-agent", "agent run should use the requested agent");
    expect(agentNext.run?.task === taskRef, "agent run should link to the claimed task");

    const agentStep = await runJson<{
      ok?: boolean;
      started?: boolean;
      run?: { file?: string };
      task?: { file?: string };
      read?: string[];
      commands?: string[];
      finish?: string[];
    }>(["agent", "step", repoPath, "--agent", "walkthrough-agent", "--json"]);
    expect(agentStep.ok === true, "agent step should return ok");
    expect(agentStep.started === false, "agent step should continue the current run");
    expect(agentStep.run?.file === runRef, "agent step should use the existing run");
    expect(agentStep.task?.file === taskRef, "agent step should use the claimed task");
    expect(agentStep.read?.includes("reviews/demo-compile-provenance.md") === true, "agent step should include the review in read refs");
    expect(agentStep.commands?.some((command) => command.includes("kforge agent draft")) === true, "agent step should suggest agent draft");
    expect(agentStep.finish?.some((command) => command.includes("kforge agent finish")) === true, "agent step should suggest agent finish");

    const agentDraft = await runJson<{
      ok?: boolean;
      run?: { file?: string };
      task?: { file?: string; source?: string };
      draft?: { written?: boolean; review?: string; output?: string };
      next?: string[];
    }>(["agent", "draft", repoPath, "--agent", "walkthrough-agent", "--json"]);
    const outputRef = requireString(agentDraft.draft?.output, "agent draft should return an output ref");
    expect(agentDraft.ok === true, "agent draft should return ok");
    expect(agentDraft.run?.file === runRef, "agent draft should use the existing run");
    expect(agentDraft.task?.file === taskRef, "agent draft should use the claimed task");
    expect(agentDraft.task?.source === "reviews/demo-compile-provenance.md", "agent draft should use the demo review task source");
    expect(agentDraft.draft?.written === true, "agent draft should write an output");
    expect(agentDraft.draft?.review === "reviews/demo-compile-provenance.md", "agent draft should link to the demo review");
    expect(outputRef === `outputs/${today()}-provenance-draft.md`, "agent draft should use the documented output path");
    expect(agentDraft.next?.some((command) => command.includes("kforge review content")) === true, "agent draft should suggest review content writeback");
    expect(/TODO/.test(await readFile(path.join(repoPath, outputRef), "utf8")), "draft should start as an editable template with TODO markers");

    await expectText(["output", "inspect", repoPath, "--file", outputRef], /# Output Inspect/);
    await writeFile(path.join(repoPath, outputRef), editedProvenanceDraft(), "utf8");

    const reviewContent = await runJson<{
      ok?: boolean;
      review?: string;
      source?: string;
      next?: string[];
    }>(["review", "content", repoPath, "--file", "reviews/demo-compile-provenance.md", "--from", outputRef, "--json"]);
    expect(reviewContent.ok === true, "review content should return ok");
    expect(reviewContent.review === "reviews/demo-compile-provenance.md", "review content should update the demo review");
    expect(reviewContent.source === outputRef, "review content should use the edited output");
    expect(reviewContent.next?.some((command) => command.includes("review status")) === true, "review content should suggest status update");

    const reviewStatus = await runJson<{
      ok?: boolean;
      status?: string;
    }>([
      "review",
      "status",
      repoPath,
      "--file",
      "reviews/demo-compile-provenance.md",
      "--status",
      "accepted",
      "--note",
      "Walkthrough checked source path and proposed content.",
      "--json",
    ]);
    expect(reviewStatus.ok === true, "review status should return ok");
    expect(reviewStatus.status === "accepted", "review should become accepted");

    const reviewApply = await runJson<{
      ok?: boolean;
      dryRun?: boolean;
      status?: string;
      target?: string;
    }>(["review", "apply", repoPath, "--file", "reviews/demo-compile-provenance.md", "--json"]);
    expect(reviewApply.ok === true, "review apply should return ok");
    expect(reviewApply.dryRun === false, "review apply should write by default");
    expect(reviewApply.status === "applied", "review should become applied");
    expect(reviewApply.target === "wiki/Provenance.md", "review apply should update wiki/Provenance.md");
    expect(/Provenance is the evidence trail/.test(await readFile(path.join(repoPath, "wiki", "Provenance.md"), "utf8")), "wiki page should contain the edited draft content");

    const agentFinish = await runJson<{
      ok?: boolean;
      run?: { file?: string; status?: string };
      task?: { file?: string; status?: string };
    }>([
      "agent",
      "finish",
      repoPath,
      "--agent",
      "walkthrough-agent",
      "--status",
      "success",
      "--task-done",
      "--note",
      "Filed reviewed draft.",
      "--json",
    ]);
    expect(agentFinish.ok === true, "agent finish should return ok");
    expect(agentFinish.run?.file === runRef, "agent finish should close the walkthrough run");
    expect(agentFinish.run?.status === "success", "agent finish should mark the run successful");
    expect(agentFinish.task?.file === taskRef, "agent finish should update the walkthrough task");
    expect(agentFinish.task?.status === "done", "agent finish should mark the task done");

    await expectText(["refresh", repoPath], /Refreshed derived artifacts/);

    const doctor = await runJson<{ ok?: boolean; status?: string }>(["doctor", repoPath, "--json"]);
    expect(doctor.ok === true, "doctor should pass after the walkthrough");
    expect(doctor.status === "clean", "doctor status should be clean after the walkthrough");

    await expectText(["score", repoPath], /# Trust Score/);

    console.log("Walkthrough check passed: demo -> agent draft -> review apply -> finish -> refresh -> doctor is runnable.");
  } finally {
    await rm(repoPath, { recursive: true, force: true });
  }
}

function editedProvenanceDraft(): string {
  return [
    "---",
    "title: Provenance",
    "status: published",
    "kind: concept",
    "sources:",
    "  - raw/llm-knowledge-bases.md",
    "confidence: medium",
    `last_compiled: ${today()}`,
    "---",
    "",
    "# Provenance",
    "",
    "Provenance is the evidence trail that lets a compiled knowledge repo stay auditable.",
    "In this demo, the raw source stays under `raw/`, the proposed wiki change is reviewed",
    "under `reviews/`, and the accepted content lands in `wiki/`.",
    "",
    "## Evidence",
    "",
    "- `raw/llm-knowledge-bases.md`: describes compiling raw sources into a wiki and filing outputs back into the knowledge base.",
    "",
  ].join("\n");
}

async function expectText(args: string[], pattern: RegExp): Promise<string> {
  const result = await runCli(args);
  if (!pattern.test(result.stdout)) {
    throw new Error(`Expected ${pattern} in output for kforge ${args.join(" ")}:\n${result.stdout}`);
  }
  return result.stdout;
}

async function runJson<T>(args: string[]): Promise<T> {
  const result = await runCli(args);
  return JSON.parse(result.stdout) as T;
}

async function runCli(args: string[]): Promise<{ stdout: string; stderr: string }> {
  return execFileAsync(process.execPath, [cli, ...args], {
    cwd: root,
    maxBuffer: 10 * 1024 * 1024,
  });
}

function expect(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

function requireString(value: string | undefined, message: string): string {
  if (!value) {
    throw new Error(message);
  }
  return value;
}

function today(): string {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

await main();
