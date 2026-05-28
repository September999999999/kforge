import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

const skipDirs = new Set([".git", ".serena", "coverage", "dist", "node_modules"]);
const pythonPackageFiles = new Set([
  ".python-version",
  "Pipfile",
  "Pipfile.lock",
  "poetry.lock",
  "pyproject.toml",
  "requirements.txt",
  "setup.cfg",
  "setup.py",
  "uv.lock",
]);

const pythonRuntimePattern = /\b(python3?|pip3?|poetry|uv|conda|mamba|pytest|ipython|jupyter)\b/i;
const shebangPythonPattern = /^#!.*\bpython3?\b/im;

type Violation = {
  path: string;
  reason: string;
};

async function main(): Promise<void> {
  const root = process.cwd();
  const files = await listFiles(root);
  const violations: Violation[] = [];

  for (const file of files) {
    const relativePath = path.relative(root, file).split(path.sep).join("/");
    const segments = relativePath.split("/");
    const basename = path.basename(relativePath);

    if (segments.includes("raw")) {
      continue;
    }

    if (relativePath.endsWith(".py")) {
      violations.push({ path: relativePath, reason: "Python implementation file" });
      continue;
    }

    if (pythonPackageFiles.has(basename) || /^requirements[-.].*\.txt$/i.test(basename)) {
      violations.push({ path: relativePath, reason: "Python runtime or package manifest" });
      continue;
    }

    if (isLikelyExecutableScript(relativePath)) {
      const contents = await readFile(file, "utf8");
      if (shebangPythonPattern.test(contents)) {
        violations.push({ path: relativePath, reason: "Python shebang" });
      }
    }
  }

  const packageJson = JSON.parse(await readFile(path.join(root, "package.json"), "utf8")) as {
    scripts?: Record<string, string>;
  };
  for (const [name, command] of Object.entries(packageJson.scripts ?? {})) {
    if (pythonRuntimePattern.test(command)) {
      violations.push({ path: "package.json", reason: `npm script "${name}" calls a Python runtime` });
    }
  }

  if (violations.length > 0) {
    console.error("Stack check failed: kforge core must stay TypeScript-first and no-Python.");
    for (const violation of violations) {
      console.error(`- ${violation.path}: ${violation.reason}`);
    }
    console.error("Use TypeScript for core implementation. Reserve Rust for optional profiled acceleration.");
    process.exitCode = 1;
    return;
  }

  console.log("Stack check passed: TypeScript-first core, no Python implementation files found.");
}

async function listFiles(root: string): Promise<string[]> {
  const entries = await readdir(root, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (skipDirs.has(entry.name)) {
        continue;
      }
      files.push(...(await listFiles(path.join(root, entry.name))));
      continue;
    }

    if (entry.isFile()) {
      files.push(path.join(root, entry.name));
    }
  }

  return files;
}

function isLikelyExecutableScript(relativePath: string): boolean {
  return /\.(cjs|js|mjs|sh|ts)$/.test(relativePath) || !path.extname(relativePath);
}

await main();
