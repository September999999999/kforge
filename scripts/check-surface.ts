import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const root = process.cwd();

async function main(): Promise<void> {
  const issues: string[] = [];

  const cliHelp = await readCliHelp();
  const helpCommands = extractKforgeCommands(cliHelp);

  const readme = await readFile(path.join(root, "README.md"), "utf8");
  const readmeCliBlock = extractFirstCodeBlockAfterHeading(readme, "## CLI", issues);
  const readmeCommands = extractKforgeCommands(readmeCliBlock);
  const readmeMcpCommands = extractKforgeMcpCommands(readmeCliBlock);

  compareOrderedLists("CLI help", helpCommands, "README CLI block", readmeCommands, issues);
  expect(readmeMcpCommands.includes("kforge-mcp [path]"), "README CLI block must include kforge-mcp [path]", issues);

  const mcpSource = await readFile(path.join(root, "src", "mcp.ts"), "utf8");
  const registeredTools = extractRegisteredMcpTools(mcpSource);
  const mcpDocs = await readFile(path.join(root, "docs", "mcp.md"), "utf8");
  const documentedTools = extractDocumentedMcpTools(mcpDocs);

  compareSets("src/mcp.ts registered tools", registeredTools, "docs/mcp.md tools", documentedTools, issues);

  if (issues.length > 0) {
    console.error("Surface check failed:");
    for (const issue of issues) {
      console.error(`- ${issue}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log("Surface check passed: CLI help, README commands, MCP registrations, and MCP docs are aligned.");
}

async function readCliHelp(): Promise<string> {
  const { stdout } = await execFileAsync("node", [path.join(root, "dist", "src", "cli.js"), "--help"], {
    cwd: root,
    maxBuffer: 10 * 1024 * 1024,
  });
  return stdout;
}

function extractFirstCodeBlockAfterHeading(markdown: string, heading: string, issues: string[]): string {
  const headingIndex = markdown.indexOf(`${heading}\n`);
  if (headingIndex < 0) {
    issues.push(`README is missing heading: ${heading}`);
    return "";
  }

  const fenceStart = markdown.indexOf("```", headingIndex);
  if (fenceStart < 0) {
    issues.push(`${heading} is missing a fenced command block`);
    return "";
  }

  const contentStart = markdown.indexOf("\n", fenceStart);
  if (contentStart < 0) {
    issues.push(`${heading} has an invalid fenced command block`);
    return "";
  }

  const fenceEnd = markdown.indexOf("```", contentStart + 1);
  if (fenceEnd < 0) {
    issues.push(`${heading} has an unterminated fenced command block`);
    return "";
  }

  return markdown.slice(contentStart + 1, fenceEnd);
}

function extractKforgeCommands(text: string): string[] {
  const commands = text
    .split(/\r?\n/)
    .map((line) => stripInlineDescription(line.trim()))
    .filter((line) => line.startsWith("kforge ") && !/^kforge \d+\.\d+\.\d+/.test(line));
  return unique(commands);
}

function extractKforgeMcpCommands(text: string): string[] {
  const commands = text
    .split(/\r?\n/)
    .map((line) => stripInlineDescription(line.trim()))
    .filter((line) => line.startsWith("kforge-mcp "));
  return unique(commands);
}

function stripInlineDescription(line: string): string {
  return line.replace(/\s{2,}\S.*$/, "").trim();
}

function extractRegisteredMcpTools(source: string): string[] {
  return unique([...source.matchAll(/server\.registerTool\(\s*["'](kforge_[a-z0-9_]+)["']/g)].map((match) => match[1]));
}

function extractDocumentedMcpTools(markdown: string): string[] {
  return unique([...markdown.matchAll(/^- `(kforge_[a-z0-9_]+)`:/gm)].map((match) => match[1]));
}

function compareOrderedLists(actualLabel: string, actual: string[], expectedLabel: string, expected: string[], issues: string[]): void {
  compareSets(actualLabel, actual, expectedLabel, expected, issues);
  if (actual.length === expected.length && actual.some((value, index) => value !== expected[index])) {
    issues.push(`${expectedLabel} must list commands in the same order as ${actualLabel}`);
  }
}

function compareSets(actualLabel: string, actual: string[], expectedLabel: string, expected: string[], issues: string[]): void {
  const missing = actual.filter((item) => !expected.includes(item));
  const extra = expected.filter((item) => !actual.includes(item));
  const actualDuplicates = duplicates(actual);
  const expectedDuplicates = duplicates(expected);

  for (const item of missing) {
    issues.push(`${expectedLabel} is missing ${actualLabel} entry: ${item}`);
  }
  for (const item of extra) {
    issues.push(`${expectedLabel} lists unknown ${actualLabel} entry: ${item}`);
  }
  for (const item of actualDuplicates) {
    issues.push(`${actualLabel} has duplicate entry: ${item}`);
  }
  for (const item of expectedDuplicates) {
    issues.push(`${expectedLabel} has duplicate entry: ${item}`);
  }
}

function expect(condition: boolean, message: string, issues: string[]): void {
  if (!condition) {
    issues.push(message);
  }
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

function duplicates(values: string[]): string[] {
  const seen = new Set<string>();
  const duplicateValues = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) {
      duplicateValues.add(value);
      continue;
    }
    seen.add(value);
  }
  return [...duplicateValues];
}

await main();
