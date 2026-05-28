import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const root = process.cwd();
const version = "0.1.0";
const tag = `v${version}`;
const repo = "September999999999/kforge";

async function main(): Promise<void> {
  await ensureCleanWorktree();
  await ensurePublishedPackage();
  await ensureTagAvailable();

  const releaseNotes = await readFile(path.join(root, "docs", "release-notes-0.1.md"), "utf8");
  const releaseNotesPath = path.join(root, "docs", "release-notes-0.1.md");

  await run("git", ["tag", "-a", tag, "-m", `kforge ${version}`]);
  await run("git", ["push", "origin", tag]);
  await run("gh", ["release", "create", tag, "--repo", repo, "--title", `kforge ${version}`, "--notes-file", releaseNotesPath]);

  if (!releaseNotes.includes("# kforge 0.1 Release Notes")) {
    throw new Error("release notes file did not contain the expected heading");
  }

  console.log(`GitHub release created: https://github.com/${repo}/releases/tag/${tag}`);
}

async function ensureCleanWorktree(): Promise<void> {
  const { stdout } = await run("git", ["status", "--short"]);
  if (stdout.trim()) {
    throw new Error(`working tree must be clean before creating ${tag}:\n${stdout}`);
  }
}

async function ensurePublishedPackage(): Promise<void> {
  await run("npm", ["run", "check:published"]);
}

async function ensureTagAvailable(): Promise<void> {
  const localTag = await runAllowFailure("git", ["rev-parse", "--verify", tag]);
  if (localTag.exitCode === 0) {
    throw new Error(`local tag already exists: ${tag}`);
  }

  const remoteTag = await runAllowFailure("git", ["ls-remote", "--tags", "origin", tag]);
  if (remoteTag.stdout.trim()) {
    throw new Error(`remote tag already exists: ${tag}`);
  }

  const release = await runAllowFailure("gh", ["release", "view", tag, "--repo", repo]);
  if (release.exitCode === 0) {
    throw new Error(`GitHub release already exists: ${tag}`);
  }
}

async function run(command: string, args: string[]): Promise<{ stdout: string; stderr: string }> {
  return execFileAsync(command, args, {
    cwd: root,
    maxBuffer: 20 * 1024 * 1024,
  });
}

async function runAllowFailure(command: string, args: string[]): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  try {
    const result = await run(command, args);
    return { ...result, exitCode: 0 };
  } catch (error) {
    const failed = error as { stdout?: string; stderr?: string; code?: number };
    return {
      stdout: failed.stdout ?? "",
      stderr: failed.stderr ?? "",
      exitCode: typeof failed.code === "number" ? failed.code : 1,
    };
  }
}

await main();
