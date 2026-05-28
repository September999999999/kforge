import { readFile } from "node:fs/promises";
import path from "node:path";

type PackageJson = {
  name?: string;
  version?: string;
  repository?: { type?: string; url?: string } | string;
  bugs?: { url?: string } | string;
  homepage?: string;
};

const root = process.cwd();
const strict = process.argv.includes("--strict");

async function main(): Promise<void> {
  const issues: string[] = [];
  const warnings: string[] = [];
  const packageJson = JSON.parse(await readFile(path.join(root, "package.json"), "utf8")) as PackageJson;

  expect(packageJson.name === "kforge", "package name must stay kforge", issues);
  expect(Boolean(packageJson.version?.match(/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/)), "package version must be semver-like", issues);

  const metadata = readMetadata(packageJson);
  const hasAnyPublicMetadata = Boolean(metadata.repositoryUrl || metadata.bugsUrl || metadata.homepage);
  const hasCompletePublicMetadata = Boolean(metadata.repositoryUrl && metadata.bugsUrl && metadata.homepage);

  if (hasAnyPublicMetadata || strict) {
    expect(metadata.repositoryUrl !== undefined, "package.json repository.url is required for public launch", issues);
    expect(metadata.bugsUrl !== undefined, "package.json bugs.url is required for public launch", issues);
    expect(metadata.homepage !== undefined, "package.json homepage is required for public launch", issues);
  }

  if (metadata.repositoryUrl) {
    expect(/^git\+https:\/\/github\.com\/[^/]+\/kforge\.git$/.test(metadata.repositoryUrl), "repository.url must be git+https://github.com/<owner>/kforge.git", issues);
    expect(!hasPlaceholder(metadata.repositoryUrl), "repository.url must not contain placeholders", issues);
  }
  if (metadata.bugsUrl) {
    expect(/^https:\/\/github\.com\/[^/]+\/kforge\/issues$/.test(metadata.bugsUrl), "bugs.url must be https://github.com/<owner>/kforge/issues", issues);
    expect(!hasPlaceholder(metadata.bugsUrl), "bugs.url must not contain placeholders", issues);
  }
  if (metadata.homepage) {
    expect(/^https:\/\/github\.com\/[^/]+\/kforge#readme$/.test(metadata.homepage), "homepage must be https://github.com/<owner>/kforge#readme", issues);
    expect(!hasPlaceholder(metadata.homepage), "homepage must not contain placeholders", issues);
  }

  if (!hasCompletePublicMetadata) {
    warnings.push("public repository metadata is intentionally absent or incomplete; run npm run check:launch -- --strict after creating the real GitHub repo");
  }

  const publishing = await readFile(path.join(root, "docs", "publishing.md"), "utf8");
  const releaseChecklist = await readFile(path.join(root, "docs", "release-checklist.md"), "utf8");
  const launchChecklist = await readFile(path.join(root, "docs", "launch-readiness.md"), "utf8");
  for (const phrase of [
    "npm view kforge name version description repository homepage bugs --json",
    "npm run check:launch -- --strict",
    "git+https://github.com/<owner>/kforge.git",
  ]) {
    expect(publishing.includes(phrase), `docs/publishing.md must mention: ${phrase}`, issues);
  }
  for (const phrase of ["npm run check:launch", "npm run check:launch -- --strict", "docs/launch-readiness.md"]) {
    expect(releaseChecklist.includes(phrase), `docs/release-checklist.md must mention: ${phrase}`, issues);
  }
  for (const phrase of [
    "# Launch Readiness",
    "npm view kforge name version description repository homepage bugs --json",
    "npm run check:launch -- --strict",
    "repository",
    "bugs",
    "homepage",
  ]) {
    expect(launchChecklist.includes(phrase), `docs/launch-readiness.md must mention: ${phrase}`, issues);
  }

  if (issues.length > 0) {
    console.error(strict ? "Strict launch check failed:" : "Launch check failed:");
    for (const issue of issues) {
      console.error(`- ${issue}`);
    }
    process.exitCode = 1;
    return;
  }

  for (const warning of warnings) {
    console.warn(`Launch check warning: ${warning}`);
  }
  console.log(strict ? "Strict launch check passed: public package metadata is ready." : "Launch check passed: local launch docs and metadata policy are consistent.");
}

function readMetadata(packageJson: PackageJson): { repositoryUrl?: string; bugsUrl?: string; homepage?: string } {
  return {
    repositoryUrl: typeof packageJson.repository === "string" ? packageJson.repository : packageJson.repository?.url,
    bugsUrl: typeof packageJson.bugs === "string" ? packageJson.bugs : packageJson.bugs?.url,
    homepage: packageJson.homepage,
  };
}

function hasPlaceholder(value: string): boolean {
  return /<[^>]+>|example\.com|localhost|TODO|TBD/i.test(value);
}

function expect(condition: boolean, message: string, issues: string[]): void {
  if (!condition) {
    issues.push(message);
  }
}

await main();
