import { execFile } from "node:child_process";
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const root = process.cwd();

const requiredPublishingPhrases = [
  "public repository metadata should only be added when the real repository location is known",
  "Do not add placeholder repository, bugs, funding, or homepage URLs",
  "npm test",
  "npm run check:install",
  "npm run check:launch",
  "npm run check:surface",
  "npm run check:walkthrough",
  "npm run check:release",
  "npm run smoke",
  "npm pack --dry-run",
];

const requiredChecklistPhrases = [
  "repo protocol first",
  "not a RAG framework",
  "npm run check:install",
  "npm run check:launch",
  "npm run check:surface",
  "npm run check:walkthrough",
  "npm run check:release",
  "docs/release-notes-0.1.md",
  "node dist/src/cli.js agent draft",
  "npm pack --dry-run",
];

const requiredReleaseNotesPhrases = [
  "# kforge 0.1 Release Notes",
  "raw evidence -> agent draft -> review -> wiki/claims -> health checks",
  "not a RAG framework",
  "## What Ships",
  "### Agent Draft Loop",
  "### Release Guards",
  "npm run check:release",
  "## Known Boundaries",
];

const requiredPackFiles = [
  ".github/ISSUE_TEMPLATE/bug_report.md",
  ".github/ISSUE_TEMPLATE/feature_request.md",
  ".github/PULL_REQUEST_TEMPLATE.md",
  ".github/workflows/ci.yml",
  "dist/src/index.js",
  "dist/src/cli.js",
  "dist/src/mcp.js",
  "dist/scripts/check-install.js",
  "dist/scripts/check-launch.js",
  "dist/scripts/check-package.js",
  "dist/scripts/check-published.js",
  "dist/scripts/check-release.js",
  "dist/scripts/check-stack.js",
  "dist/scripts/check-surface.js",
  "dist/scripts/check-walkthrough.js",
  "dist/scripts/smoke.js",
  "README.md",
  "CONTRIBUTING.md",
  "CHANGELOG.md",
  "SECURITY.md",
  "LICENSE",
  "docs/examples.md",
  "docs/publishing.md",
  "docs/launch-readiness.md",
  "docs/release-checklist.md",
  "docs/release-notes-0.1.md",
  "examples/demo-repo/kb.yaml",
  "examples/demo-repo/indexes/workflow.md",
];

const requiredGovernancePhrases: Array<[string, string[]]> = [
  [
    ".github/PULL_REQUEST_TEMPLATE.md",
    ["npm run check:install", "npm run check:launch", "npm run check:surface", "npm run check:walkthrough", "npm run check:release", "Protocol Impact"],
  ],
  [
    ".github/workflows/ci.yml",
    ["npm run check:install", "npm run check:launch", "npm run check:surface", "npm run check:walkthrough", "npm run check:release", "npm pack --dry-run"],
  ],
  [
    ".github/ISSUE_TEMPLATE/bug_report.md",
    ["Minimal repo shape", "Node.js"],
  ],
  [
    ".github/ISSUE_TEMPLATE/feature_request.md",
    ["Protocol impact", "Non-goals"],
  ],
  [
    "SECURITY.md",
    ["Security Policy", "no mandatory network access", "no Python runtime scripts"],
  ],
  [
    "CODE_OF_CONDUCT.md",
    ["Code of Conduct", "Respect privacy"],
  ],
];

const forbiddenPackEntries = [
  "tests/",
  "dist/tests/",
  "node_modules/",
  ".git/",
];

async function main(): Promise<void> {
  const issues: string[] = [];

  const packageJson = JSON.parse(await readFile(path.join(root, "package.json"), "utf8")) as {
    scripts?: Record<string, string>;
    publishConfig?: { registry?: string };
    repository?: unknown;
    bugs?: unknown;
    homepage?: unknown;
    funding?: unknown;
  };

  expect(packageJson.scripts?.["check:release"] === "node dist/scripts/check-release.js", "scripts.check:release must run dist/scripts/check-release.js", issues);
  expect(packageJson.scripts?.["check:install"] === "node dist/scripts/check-install.js", "scripts.check:install must run dist/scripts/check-install.js", issues);
  expect(packageJson.scripts?.["check:launch"] === "node dist/scripts/check-launch.js", "scripts.check:launch must run dist/scripts/check-launch.js", issues);
  expect(packageJson.scripts?.["check:surface"] === "node dist/scripts/check-surface.js", "scripts.check:surface must run dist/scripts/check-surface.js", issues);
  expect(packageJson.scripts?.["check:published"] === "node dist/scripts/check-published.js", "scripts.check:published must run dist/scripts/check-published.js", issues);
  expect(packageJson.scripts?.["check:walkthrough"] === "node dist/scripts/check-walkthrough.js", "scripts.check:walkthrough must run dist/scripts/check-walkthrough.js", issues);
  expect(packageJson.scripts?.prepack?.includes("check:surface") === true, "prepack must run check:surface", issues);
  expect(packageJson.scripts?.prepack?.includes("check:walkthrough") === true, "prepack must run check:walkthrough", issues);
  expect(packageJson.scripts?.prepack?.includes("check:install") === true, "prepack must run check:install", issues);
  expect(packageJson.scripts?.prepack?.includes("check:launch") === true, "prepack must run check:launch", issues);
  expect(packageJson.scripts?.prepack?.includes("check:release") === true, "prepack must run check:release", issues);
  expect(packageJson.publishConfig?.registry === "https://registry.npmjs.org/", "publishConfig.registry must point to npmjs", issues);

  for (const field of ["repository", "bugs", "homepage", "funding"] as const) {
    const value = packageJson[field];
    if (value !== undefined) {
      const serialized = JSON.stringify(value);
      expect(!/[<>]|example\.com|localhost|TODO|TBD/i.test(serialized), `${field} must not contain placeholder metadata`, issues);
    }
  }

  const publishing = await readFile(path.join(root, "docs", "publishing.md"), "utf8");
  for (const phrase of requiredPublishingPhrases) {
    expect(publishing.includes(phrase), `docs/publishing.md must mention: ${phrase}`, issues);
  }

  const releaseChecklist = await readFile(path.join(root, "docs", "release-checklist.md"), "utf8");
  for (const phrase of requiredChecklistPhrases) {
    expect(releaseChecklist.includes(phrase), `docs/release-checklist.md must mention: ${phrase}`, issues);
  }

  const releaseNotes = await readFile(path.join(root, "docs", "release-notes-0.1.md"), "utf8");
  for (const phrase of requiredReleaseNotesPhrases) {
    expect(releaseNotes.includes(phrase), `docs/release-notes-0.1.md must mention: ${phrase}`, issues);
  }

  for (const [file, phrases] of requiredGovernancePhrases) {
    const contents = await readFile(path.join(root, file), "utf8");
    for (const phrase of phrases) {
      expect(contents.includes(phrase), `${file} must mention: ${phrase}`, issues);
    }
  }

  const staleTarballs = (await readdir(root)).filter((file) => /^kforge-\d+\.\d+\.\d+.*\.tgz$/.test(file));
  expect(staleTarballs.length === 0, `remove generated tarballs before release: ${staleTarballs.join(", ")}`, issues);

  const packList = await npmPackDryRunFiles();
  for (const file of requiredPackFiles) {
    expect(packList.includes(file), `npm pack must include ${file}`, issues);
  }
  for (const forbidden of forbiddenPackEntries) {
    expect(!packList.some((file) => file === forbidden.slice(0, -1) || file.startsWith(forbidden)), `npm pack must not include ${forbidden}`, issues);
  }

  const missingBuiltFiles = await missingFiles(requiredPackFiles.filter((file) => file.startsWith("dist/")));
  expect(missingBuiltFiles.length === 0, `build output missing before release check: ${missingBuiltFiles.join(", ")}`, issues);

  if (issues.length > 0) {
    console.error("Release check failed:");
    for (const issue of issues) {
      console.error(`- ${issue}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log("Release check passed: docs, metadata, build outputs, and pack contents are release-ready.");
}

async function npmPackDryRunFiles(): Promise<string[]> {
  const { stdout } = await execFileAsync("npm", ["pack", "--dry-run", "--json", "--ignore-scripts"], {
    cwd: root,
    maxBuffer: 10 * 1024 * 1024,
  });
  const parsed = JSON.parse(stdout) as Array<{ files?: Array<{ path?: string }> }>;
  return (parsed[0]?.files ?? [])
    .map((file) => file.path)
    .filter((file): file is string => Boolean(file))
    .sort();
}

async function missingFiles(files: string[]): Promise<string[]> {
  const missing: string[] = [];
  for (const file of files) {
    try {
      const info = await stat(path.join(root, file));
      if (!info.isFile()) {
        missing.push(file);
      }
    } catch {
      missing.push(file);
    }
  }
  return missing;
}

function expect(condition: boolean, message: string, issues: string[]): void {
  if (!condition) {
    issues.push(message);
  }
}

await main();
