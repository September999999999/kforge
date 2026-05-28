import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const root = process.cwd();
const registry = "https://registry.npmjs.org/";
const packageName = "kforge";
const version = "0.1.0";

async function main(): Promise<void> {
  await ensureCleanWorktree();
  await ensureNpmAuth();
  await ensureVersionUnpublished();

  await run("npm", ["run", "check:launch", "--", "--strict"]);
  await run("npm", ["publish", `--registry=${registry}`]);
  await run("npm", ["run", "check:published"]);
  await run("npm", ["run", "release:github"]);

  console.log(`npm and GitHub release completed for ${packageName}@${version}.`);
}

async function ensureCleanWorktree(): Promise<void> {
  const { stdout } = await run("git", ["status", "--short"]);
  if (stdout.trim()) {
    throw new Error(`working tree must be clean before publishing:\n${stdout}`);
  }
}

async function ensureNpmAuth(): Promise<void> {
  try {
    await run("npm", ["whoami", `--registry=${registry}`]);
  } catch {
    throw new Error(`npm is not logged in for ${registry}. Run: npm adduser --registry=${registry}`);
  }
}

async function ensureVersionUnpublished(): Promise<void> {
  const result = await runAllowFailure("npm", ["view", `${packageName}@${version}`, "version", `--registry=${registry}`, "--json"]);
  if (result.exitCode === 0 && result.stdout.trim()) {
    throw new Error(`${packageName}@${version} is already published on ${registry}`);
  }

  if (result.exitCode !== 0 && !/E404|not found/i.test(`${result.stdout}\n${result.stderr}`)) {
    throw new Error(`could not confirm ${packageName}@${version} is unpublished:\n${result.stderr || result.stdout}`);
  }
}

async function run(command: string, args: string[]): Promise<{ stdout: string; stderr: string }> {
  return execFileAsync(command, args, {
    cwd: root,
    maxBuffer: 30 * 1024 * 1024,
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
