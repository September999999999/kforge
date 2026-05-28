import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const registry = "https://registry.npmjs.org/";
const packageName = "kforge";
const expectedVersion = "0.1.0";

async function main(): Promise<void> {
  const published = await npmView<{
    name?: string;
    version?: string;
    repository?: { url?: string };
    bugs?: { url?: string };
    homepage?: string;
  }>([`${packageName}@${expectedVersion}`, "name", "version", "repository", "homepage", "bugs", "--json"]);

  expect(published.name === packageName, "published package name should be kforge");
  expect(published.version === expectedVersion, `published package version should be ${expectedVersion}`);
  expect(published.repository?.url === "git+https://github.com/September999999999/kforge.git", "published package should include GitHub repository metadata");
  expect(published.bugs?.url === "https://github.com/September999999999/kforge/issues", "published package should include issue tracker metadata");
  expect(published.homepage === "https://github.com/September999999999/kforge#readme", "published package should include homepage metadata");

  const tempRoot = await mkdtemp(path.join(tmpdir(), "kforge-published-check-"));
  try {
    await writeFile(
      path.join(tempRoot, "package.json"),
      JSON.stringify(
        {
          private: true,
          type: "module",
          dependencies: {
            kforge: expectedVersion,
          },
        },
        null,
        2,
      ),
      "utf8",
    );

    await run("npm", ["install", "--ignore-scripts", `--registry=${registry}`], tempRoot);

    const kforgeBin = path.join(tempRoot, "node_modules", ".bin", "kforge");
    const mcpBin = path.join(tempRoot, "node_modules", ".bin", "kforge-mcp");
    await expectStdout(kforgeBin, ["version"], /^0\.1\.0$/m, tempRoot);
    await expectStdout(kforgeBin, ["--help"], /kforge agent draft/, tempRoot);
    await expectStdout(mcpBin, ["--help"], /kforge-mcp/, tempRoot);

    const importCheck = await run("node", ["-e", "import('kforge').then((m) => console.log(Boolean(m.initRepo && m.agentDraft && m.applyReview)))"], tempRoot);
    expect(/^true$/m.test(importCheck.stdout), "published package should expose the public ESM API");

    console.log("Published check passed: npmjs kforge@0.1.0 metadata, bins, and ESM API are installable.");
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
}

async function npmView<T>(args: string[]): Promise<T> {
  const { stdout } = await run("npm", ["view", ...args, `--registry=${registry}`], process.cwd());
  return JSON.parse(stdout) as T;
}

async function expectStdout(command: string, args: string[], pattern: RegExp, cwd: string): Promise<string> {
  const { stdout } = await run(command, args, cwd);
  if (!pattern.test(stdout)) {
    throw new Error(`Expected ${pattern} in output for ${command} ${args.join(" ")}:\n${stdout}`);
  }
  return stdout;
}

async function run(command: string, args: string[], cwd: string): Promise<{ stdout: string; stderr: string }> {
  return execFileAsync(command, args, {
    cwd,
    maxBuffer: 20 * 1024 * 1024,
  });
}

function expect(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

await main();
