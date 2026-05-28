import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const root = process.cwd();

async function main(): Promise<void> {
  const tempRoot = await mkdtemp(path.join(tmpdir(), "kforge-install-check-"));
  const packageDir = path.join(tempRoot, "package");
  const consumerDir = path.join(tempRoot, "consumer");
  const repoPath = path.join(tempRoot, "demo-repo");

  try {
    await mkdirp(packageDir);
    await mkdirp(consumerDir);

    const tarball = await packToTemp(packageDir);

    await writeFile(
      path.join(consumerDir, "package.json"),
      JSON.stringify(
        {
          private: true,
          type: "module",
          dependencies: {
            kforge: tarball,
          },
        },
        null,
        2,
      ),
      "utf8",
    );
    await run("npm", ["install", "--ignore-scripts", "--dry-run=false"], consumerDir);

    const kforgeBin = path.join(consumerDir, "node_modules", ".bin", "kforge");
    const mcpBin = path.join(consumerDir, "node_modules", ".bin", "kforge-mcp");

    await expectStdout(kforgeBin, ["version"], /^0\.1\.0$/m, consumerDir);
    await expectStdout(kforgeBin, ["--help"], /kforge agent draft/, consumerDir);
    await expectStdout(mcpBin, ["--help"], /kforge-mcp/, consumerDir);

    await expectStdout(kforgeBin, ["demo", repoPath], /Demo repo ready/, consumerDir);
    const agentNext = await runJson<{
      ok?: boolean;
      task?: { file?: string; status?: string; owner?: string; source?: string };
      run?: { file?: string; status?: string; agent?: string; task?: string };
    }>(kforgeBin, ["agent", "next", repoPath, "--agent", "installed-agent", "--json"], consumerDir);
    const taskRef = requireString(agentNext.task?.file, "installed CLI should claim a task");
    const runRef = requireString(agentNext.run?.file, "installed CLI should start a run");
    expect(agentNext.ok === true, "installed CLI agent next should return ok");
    expect(agentNext.task?.status === "claimed", "installed CLI should claim the demo task");
    expect(agentNext.task?.owner === "installed-agent", "installed CLI should assign the requested agent");
    expect(agentNext.task?.source === "reviews/demo-compile-provenance.md", "installed CLI should use the demo review");
    expect(agentNext.run?.status === "running", "installed CLI should start an auditable run");
    expect(agentNext.run?.agent === "installed-agent", "installed CLI should use the requested agent in run state");
    expect(agentNext.run?.task === taskRef, "installed CLI run should link to the claimed task");

    const agentStep = await runJson<{
      ok?: boolean;
      started?: boolean;
      run?: { file?: string };
      task?: { file?: string };
      commands?: string[];
    }>(kforgeBin, ["agent", "step", repoPath, "--agent", "installed-agent", "--json"], consumerDir);
    expect(agentStep.ok === true, "installed CLI agent step should return ok");
    expect(agentStep.started === false, "installed CLI agent step should continue the running run");
    expect(agentStep.run?.file === runRef, "installed CLI agent step should use the running run");
    expect(agentStep.task?.file === taskRef, "installed CLI agent step should use the claimed task");
    expect(agentStep.commands?.some((command) => command.includes("kforge agent draft")) === true, "installed CLI should suggest agent draft");

    const agentDraft = await runJson<{
      ok?: boolean;
      draft?: { written?: boolean; review?: string; output?: string };
      next?: string[];
    }>(kforgeBin, ["agent", "draft", repoPath, "--agent", "installed-agent", "--json"], consumerDir);
    const outputRef = requireString(agentDraft.draft?.output, "installed CLI should write a draft output");
    expect(agentDraft.ok === true, "installed CLI agent draft should return ok");
    expect(agentDraft.draft?.written === true, "installed CLI should write the agent draft");
    expect(agentDraft.draft?.review === "reviews/demo-compile-provenance.md", "installed CLI draft should link to the demo review");
    expect(agentDraft.next?.some((command) => command.includes("kforge review content")) === true, "installed CLI should suggest review content");

    await writeFile(path.join(repoPath, outputRef), editedDraft(), "utf8");
    await runJson(kforgeBin, ["review", "content", repoPath, "--file", "reviews/demo-compile-provenance.md", "--from", outputRef, "--json"], consumerDir);
    await runJson(kforgeBin, [
      "review",
      "status",
      repoPath,
      "--file",
      "reviews/demo-compile-provenance.md",
      "--status",
      "accepted",
      "--note",
      "Installed package walkthrough checked.",
      "--json",
    ], consumerDir);
    await runJson(kforgeBin, ["review", "apply", repoPath, "--file", "reviews/demo-compile-provenance.md", "--json"], consumerDir);

    const agentFinish = await runJson<{
      ok?: boolean;
      run?: { file?: string; status?: string };
      task?: { file?: string; status?: string };
    }>(kforgeBin, [
      "agent",
      "finish",
      repoPath,
      "--agent",
      "installed-agent",
      "--status",
      "success",
      "--task-done",
      "--note",
      "Installed package walkthrough filed.",
      "--json",
    ], consumerDir);
    expect(agentFinish.ok === true, "installed CLI agent finish should return ok");
    expect(agentFinish.run?.file === runRef, "installed CLI should finish the same run");
    expect(agentFinish.run?.status === "success", "installed CLI should mark the run successful");
    expect(agentFinish.task?.file === taskRef, "installed CLI should finish the same task");
    expect(agentFinish.task?.status === "done", "installed CLI should mark the task done");

    await expectStdout(kforgeBin, ["refresh", repoPath], /Refreshed derived artifacts/, consumerDir);
    const doctor = await runJson<{ ok?: boolean; status?: string }>(kforgeBin, ["doctor", repoPath, "--json"], consumerDir);
    expect(doctor.ok === true, "installed CLI doctor should pass after walkthrough");
    expect(doctor.status === "clean", "installed CLI doctor status should be clean");

    const importCheck = await run("node", ["-e", "import('kforge').then((m) => console.log(Boolean(m.initRepo && m.agentDraft && m.applyReview)))"], consumerDir);
    expect(/^true$/m.test(importCheck.stdout), "installed package should expose the public ESM API");

    const installedPackage = JSON.parse(await readFile(path.join(consumerDir, "node_modules", "kforge", "package.json"), "utf8")) as {
      files?: string[];
      bin?: Record<string, string>;
    };
    expect(installedPackage.bin?.kforge === "dist/src/cli.js", "installed package should expose the kforge bin");
    expect(installedPackage.bin?.["kforge-mcp"] === "dist/src/mcp.js", "installed package should expose the kforge-mcp bin");

    console.log("Install check passed: packed kforge installs into a clean project and the installed CLI/API run the demo agent loop.");
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
}

async function packToTemp(destination: string): Promise<string> {
  const { stdout } = await execFileAsync(
    "npm",
    ["pack", "--pack-destination", destination, "--json", "--ignore-scripts", "--dry-run=false"],
    {
      cwd: root,
      env: { ...process.env, npm_config_dry_run: "false" },
      maxBuffer: 20 * 1024 * 1024,
    },
  );
  const parsed = JSON.parse(stdout) as Array<{ filename?: string }>;
  const filename = parsed[0]?.filename;
  if (!filename) {
    throw new Error(`npm pack did not return a tarball filename: ${stdout}`);
  }
  return path.join(destination, filename);
}

function editedDraft(): string {
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
    "Provenance is the evidence trail that lets an installed kforge package keep compiled knowledge auditable.",
    "",
    "## Evidence",
    "",
    "- `raw/llm-knowledge-bases.md`: describes compiling raw sources into a Markdown wiki and filing outputs back into the knowledge base.",
    "",
  ].join("\n");
}

async function mkdirp(directory: string): Promise<void> {
  await mkdir(directory, { recursive: true });
}

async function expectStdout(command: string, args: string[], pattern: RegExp, cwd: string): Promise<string> {
  const { stdout } = await run(command, args, cwd);
  if (!pattern.test(stdout)) {
    throw new Error(`Expected ${pattern} in output for ${command} ${args.join(" ")}:\n${stdout}`);
  }
  return stdout;
}

async function runJson<T>(command: string, args: string[], cwd: string): Promise<T> {
  const { stdout } = await run(command, args, cwd);
  return JSON.parse(stdout) as T;
}

async function run(command: string, args: string[], cwd: string): Promise<{ stdout: string; stderr: string }> {
  return execFileAsync(command, args, {
    cwd,
    env: { ...process.env, npm_config_dry_run: "false" },
    maxBuffer: 20 * 1024 * 1024,
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
