import { readFile, stat } from "node:fs/promises";
import path from "node:path";

type PackageJson = {
  name?: string;
  version?: string;
  description?: string;
  type?: string;
  main?: string;
  types?: string;
  exports?: Record<string, unknown>;
  sideEffects?: boolean;
  license?: string;
  packageManager?: string;
  publishConfig?: { access?: string };
  bin?: Record<string, string>;
  files?: string[];
  scripts?: Record<string, string>;
  keywords?: string[];
  engines?: { node?: string };
  repository?: unknown;
  bugs?: unknown;
  homepage?: unknown;
  funding?: unknown;
};

const requiredFiles = [
  "dist/src",
  "dist/scripts",
  "docs",
  "examples/demo-repo",
  ".github/ISSUE_TEMPLATE",
  ".github/PULL_REQUEST_TEMPLATE.md",
  ".github/workflows/ci.yml",
  "AGENTS.md",
  "CHANGELOG.md",
  "CODE_OF_CONDUCT.md",
  "CONTRIBUTING.md",
  "README.md",
  "SECURITY.md",
  "LICENSE",
];

const requiredScripts = [
  "build",
  "check:install",
  "check:launch",
  "check:package",
  "check:release",
  "check:stack",
  "check:surface",
  "check:walkthrough",
  "clean",
  "demo:sync",
  "prepack",
  "smoke",
  "test",
];
const requiredKeywords = [
  "llm",
  "knowledge-base",
  "markdown",
  "obsidian",
  "agent",
  "mcp",
  "local-first",
  "repo",
  "provenance",
  "model-context-protocol",
];

const requiredReadmePhrases = [
  "local-first",
  "Markdown-first",
  "repo protocol",
  "not a RAG framework",
  "not an Obsidian plugin",
  "not a hosted AI app",
  "provider-neutral",
  "usable without a vector database",
  "kforge agent draft",
  "ten-minute agent draft walkthrough",
];

const requiredExamplesPhrases = [
  "## Ten-Minute Agent Draft Walkthrough",
  "kforge agent next . --agent local-agent --json",
  "kforge agent step . --agent local-agent --json",
  "kforge agent draft . --agent local-agent --json",
  "kforge review content .",
  "kforge review apply .",
  "kforge agent finish .",
  "Files changed by the loop",
];

const requiredContributingPhrases = [
  "## Project Invariants",
  "## Adding A Command",
  "src/repo.ts",
  "src/index.ts",
  "src/cli.ts",
  "src/mcp.ts",
  "tests/repo.test.ts",
  "tests/cli.test.ts",
  "tests/mcp.test.ts",
  "npm run check:stack",
  "npm run check:package",
  "npm run check:install",
  "npm run check:surface",
  "npm run check:walkthrough",
  "npm pack --dry-run",
];

const requiredGovernanceFiles = [
  ".github/ISSUE_TEMPLATE/bug_report.md",
  ".github/ISSUE_TEMPLATE/feature_request.md",
  ".github/PULL_REQUEST_TEMPLATE.md",
  ".github/workflows/ci.yml",
  "CODE_OF_CONDUCT.md",
  "SECURITY.md",
];

const requiredDemoRepoFiles = [
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

const requiredDocFiles = [
  "agent-templates.md",
  "quickstart.md",
  "tutorial.md",
  "vision.md",
  "architecture.md",
  "protocol.md",
  "mcp.md",
  "examples.md",
  "comparison.md",
  "roadmap.md",
  "publishing.md",
  "release-checklist.md",
  "release-notes-0.1.md",
  "launch-readiness.md",
];

async function main(): Promise<void> {
  const packageJson = JSON.parse(await readFile(path.join(process.cwd(), "package.json"), "utf8")) as PackageJson;
  const issues: string[] = [];

  expect(packageJson.name === "kforge", "name must be kforge", issues);
  expect(Boolean(packageJson.version?.match(/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/)), "version must be valid semver-like text", issues);
  expect(Boolean(packageJson.description?.includes("local-first")), "description should describe the local-first package", issues);
  expect(Boolean(packageJson.description?.includes("Markdown repo protocol")), "description should describe the Markdown repo protocol", issues);
  expect(Boolean(packageJson.description?.includes("LLM-maintained knowledge bases")), "description should mention LLM-maintained knowledge bases", issues);
  expect(packageJson.type === "module", "type must be module", issues);
  expect(packageJson.main === "./dist/src/index.js", "main must point to dist/src/index.js", issues);
  expect(packageJson.types === "./dist/src/index.d.ts", "types must point to dist/src/index.d.ts", issues);
  expect(packageJson.sideEffects === false, "sideEffects must be false", issues);
  expect(packageJson.license === "MIT", "license must be MIT", issues);
  expect(Boolean(packageJson.packageManager?.startsWith("npm@")), "packageManager must pin npm", issues);
  expect(packageJson.publishConfig?.access === "public", "publishConfig.access must be public", issues);
  expect(packageJson.engines?.node === ">=20", "engines.node must be >=20", issues);
  expect(packageJson.bin?.kforge === "./dist/src/cli.js", "bin.kforge must point to dist/src/cli.js", issues);
  expect(packageJson.bin?.["kforge-mcp"] === "./dist/src/mcp.js", "bin.kforge-mcp must point to dist/src/mcp.js", issues);

  const exportsRoot = packageJson.exports?.["."] as { import?: string; types?: string } | undefined;
  expect(exportsRoot?.import === "./dist/src/index.js", "exports[\".\"].import must point to dist/src/index.js", issues);
  expect(exportsRoot?.types === "./dist/src/index.d.ts", "exports[\".\"].types must point to dist/src/index.d.ts", issues);

  const files = packageJson.files ?? [];
  for (const requiredFile of requiredFiles) {
    expect(files.includes(requiredFile), `files must include ${requiredFile}`, issues);
  }
  for (const forbiddenFile of ["node_modules", "tests", "dist/tests", "*.tgz"]) {
    expect(!files.includes(forbiddenFile), `files must not include ${forbiddenFile}`, issues);
  }

  const scripts = packageJson.scripts ?? {};
  for (const script of requiredScripts) {
    expect(Boolean(scripts[script]), `scripts.${script} is required`, issues);
  }
  expect(scripts.prepack?.includes("check:stack") === true, "prepack must run check:stack", issues);
  expect(scripts.prepack?.includes("check:package") === true, "prepack must run check:package", issues);
  expect(scripts.prepack?.includes("check:surface") === true, "prepack must run check:surface", issues);
  expect(scripts.prepack?.includes("check:walkthrough") === true, "prepack must run check:walkthrough", issues);
  expect(scripts.prepack?.includes("check:install") === true, "prepack must run check:install", issues);
  expect(scripts.prepack?.includes("check:launch") === true, "prepack must run check:launch", issues);
  expect(scripts.prepack?.includes("check:release") === true, "prepack must run check:release", issues);
  expect(scripts.test?.includes("check:stack") === true, "test must run check:stack", issues);
  expect(scripts.test?.includes("check:package") === true, "test must run check:package", issues);
  expect(scripts.test?.includes("check:surface") === true, "test must run check:surface", issues);
  expect(scripts.test?.includes("check:walkthrough") === true, "test must run check:walkthrough", issues);
  expect(scripts["demo:sync"]?.includes("sync-demo") === true, "demo:sync must run sync-demo", issues);

  const keywords = packageJson.keywords ?? [];
  const duplicateKeywords = duplicates(keywords);
  for (const keyword of duplicateKeywords) {
    issues.push(`keywords must not contain duplicate value: ${keyword}`);
  }
  for (const keyword of requiredKeywords) {
    expect(keywords.includes(keyword), `keywords must include ${keyword}`, issues);
  }

  for (const field of ["repository", "bugs", "homepage", "funding"] as const) {
    const value = packageJson[field];
    if (value !== undefined) {
      const serialized = JSON.stringify(value);
      expect(!/[<>]|example\.com|localhost|TODO|TBD/i.test(serialized), `${field} must not contain placeholder metadata`, issues);
    }
  }

  for (const file of requiredDemoRepoFiles) {
    if (!(await fileExists(path.join(process.cwd(), "examples", "demo-repo", file)))) {
      issues.push(`examples/demo-repo must include ${file}`);
    }
  }

  for (const file of requiredDocFiles) {
    if (!(await fileExists(path.join(process.cwd(), "docs", file)))) {
      issues.push(`docs must include ${file}`);
    }
  }

  for (const file of requiredGovernanceFiles) {
    if (!(await fileExists(path.join(process.cwd(), file)))) {
      issues.push(`governance files must include ${file}`);
    }
  }

  const readme = await readFile(path.join(process.cwd(), "README.md"), "utf8");
  for (const phrase of requiredReadmePhrases) {
    expect(readme.includes(phrase), `README should preserve positioning phrase: ${phrase}`, issues);
  }

  const examples = await readFile(path.join(process.cwd(), "docs", "examples.md"), "utf8");
  for (const phrase of requiredExamplesPhrases) {
    expect(examples.includes(phrase), `docs/examples.md should preserve walkthrough phrase: ${phrase}`, issues);
  }

  const contributing = await readFile(path.join(process.cwd(), "CONTRIBUTING.md"), "utf8");
  for (const phrase of requiredContributingPhrases) {
    expect(contributing.includes(phrase), `CONTRIBUTING should preserve developer guidance phrase: ${phrase}`, issues);
  }

  if (issues.length > 0) {
    console.error("Package check failed:");
    for (const issue of issues) {
      console.error(`- ${issue}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log("Package check passed: npm metadata and publish gates look consistent.");
}

async function fileExists(file: string): Promise<boolean> {
  try {
    return (await stat(file)).isFile();
  } catch {
    return false;
  }
}

function expect(condition: boolean, message: string, issues: string[]): void {
  if (!condition) {
    issues.push(message);
  }
}

function duplicates(values: string[]): string[] {
  const seen = new Set<string>();
  const duplicateValues = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) {
      duplicateValues.add(value);
    }
    seen.add(value);
  }
  return [...duplicateValues].sort();
}

await main();
