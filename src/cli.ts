#!/usr/bin/env node

import { homedir } from "node:os";
import path from "node:path";
import { VERSION } from "./version.js";
import {
  addSource,
  agentBoard,
  agentDraft,
  agentFinish,
  agentPlan,
  agentStatus,
  agentStep,
  auditClaims,
  askRepo,
  applyReview,
  claimTask,
  compileDraftRepo,
  compilePlanRepo,
  compileReviewRepo,
  compileRepo,
  completeTask,
  contextRepo,
  createClaim,
  createReview,
  dashboardRepo,
  demoRepo,
  doctorRepo,
  fetchSource,
  fetchSources,
  finishRun,
  graphRepo,
  handoffRepo,
  indexRepo,
  initRepo,
  importSources,
  installAgentTemplate,
  inspectRepo,
  inspectOutput,
  inspectSource,
  listAgentTemplates,
  listOutputs,
  listSources,
  inspectRun,
  listRuns,
  logRun,
  nextRun,
  nextTask,
  packRepo,
  printAgentTemplate,
  promoteOutput,
  releaseTask,
  refreshRepo,
  reviewClaimDrift,
  reviewNext,
  reviewQueue,
  searchRepo,
  scoreRepo,
  seedTasks,
  startRun,
  taskList,
  updateReviewContent,
  updateReviewStatus,
  workflowRepo,
  type AgentTemplateKind,
  type CommandResult,
  type ClaimConfidence,
  type ClaimStatus,
  type PromoteStatus,
  type ReviewStatus,
  type SearchScope,
  type RunStatusFilter,
  type TaskStatusFilter,
} from "./repo.js";

type Command =
  | "init"
  | "demo"
  | "index"
  | "refresh"
  | "doctor"
  | "score"
  | "context"
  | "dashboard"
  | "handoff"
  | "workflow"
  | "graph"
  | "agent"
  | "compile"
  | "ask"
  | "search"
  | "inspect"
  | "pack"
  | "promote"
  | "output"
  | "task"
  | "run"
  | "source"
  | "claim"
  | "review"
  | "version";

async function main(argv: string[] = process.argv.slice(2)): Promise<number> {
  const [command, ...args] = argv;

  if (!command || command === "--help" || command === "-h") {
    printHelp();
    return command ? 0 : 2;
  }

  if (!isCommand(command)) {
    console.error(`Unknown command: ${command}`);
    printHelp();
    return 2;
  }

  if (command === "version") {
    console.log(VERSION);
    return 0;
  }

  try {
    let result: CommandResult;
    if (command === "source") {
      result = await runSourceCommand(args);
    } else if (command === "output") {
      result = runOutputCommand(args);
    } else if (command === "claim") {
      result = runClaimCommand(args);
    } else if (command === "review") {
      result = runReviewCommand(args);
    } else if (command === "task") {
      result = runTaskCommand(args);
    } else if (command === "run") {
      result = runRunCommand(args);
    } else if (command === "agent") {
      result = runAgentCommand(args);
    } else if (command === "search") {
      result = runSearchCommand(args);
    } else if (command === "ask") {
      result = runAskCommand(args);
    } else if (command === "inspect") {
      result = runInspectCommand(args);
    } else if (command === "compile") {
      result = runCompileCommand(args);
    } else if (command === "pack") {
      result = runPackCommand(args);
    } else if (command === "promote") {
      result = runPromoteCommand(args);
    } else {
      result = runRepoCommand(command, args);
    }
    printResult(result);
    return result.ok ? 0 : 1;
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    return 1;
  }
}

function runRepoCommand(
  command: Exclude<Command, "version" | "agent" | "claim" | "review" | "task" | "run" | "search" | "ask" | "inspect" | "compile" | "pack" | "promote" | "output">,
  args: string[],
): CommandResult {
  const force = args.includes("--force");
  const example = args.includes("--example");
  const write = args.includes("--write");
  const json = args.includes("--json");
  const positional = args.filter(
    (arg) => arg !== "--force" && arg !== "--example" && arg !== "--write" && arg !== "--json",
  );
  const repoPath = resolveRepoPath(positional[0] ?? (command === "demo" ? "./kforge-demo" : "."));

  if (command === "init") {
    return initRepo(repoPath, { force, example });
  }

  if (command === "demo") {
    return demoRepo(repoPath, { force });
  }

  if (command === "index") {
    return indexRepo(repoPath);
  }

  if (command === "refresh") {
    return refreshRepo(repoPath);
  }

  if (command === "score") {
    return scoreRepo(repoPath, { write });
  }

  if (command === "context") {
    return contextRepo(repoPath, { write });
  }

  if (command === "dashboard") {
    return dashboardRepo(repoPath, { write, json });
  }

  if (command === "handoff") {
    return handoffRepo(repoPath, { write });
  }

  if (command === "workflow") {
    return workflowRepo(repoPath, { write });
  }

  if (command === "graph") {
    return graphRepo(repoPath, { write });
  }

  return doctorRepo(repoPath, { write, json });
}

function runOutputCommand(args: string[]): CommandResult {
  const [subcommand, ...rest] = args;
  if (subcommand === "list") {
    const parsed = parseArgs(rest);
    const repoPath = resolveRepoPath(parsed.positionals[0] ?? ".");
    const json = flagOption(parsed.options, "json");
    return listOutputs(repoPath, { json });
  }

  if (subcommand === "inspect") {
    const parsed = parseArgs(rest);
    const repoPath = resolveRepoPath(parsed.positionals[0] ?? ".");
    const file = oneOption(parsed.options, "file");
    const json = flagOption(parsed.options, "json");

    if (!file) {
      throw new Error("Missing required option: --file");
    }

    return inspectOutput(repoPath, { file, json });
  }

  throw new Error("Usage: kforge output list [path] [--json]\n       kforge output inspect [path] --file <outputs/file> [--json]");
}

function runTaskCommand(args: string[]): CommandResult {
  const [subcommand, ...rest] = args;

  if (subcommand === "seed") {
    const parsed = parseArgs(rest);
    const repoPath = resolveRepoPath(parsed.positionals[0] ?? ".");
    const limitValue = oneOption(parsed.options, "limit", false);
    const json = flagOption(parsed.options, "json");
    const limit = limitValue ? parsePositiveInteger(limitValue, "--limit") : undefined;
    return seedTasks(repoPath, { limit, json });
  }

  if (subcommand === "list") {
    const parsed = parseArgs(rest);
    const repoPath = resolveRepoPath(parsed.positionals[0] ?? ".");
    const status = oneOption(parsed.options, "status", false) ?? "open";
    const json = flagOption(parsed.options, "json");
    if (!["open", "claimed", "done", "all"].includes(status)) {
      throw new Error("--status must be one of: open, claimed, done, all");
    }
    return taskList(repoPath, { status: status as TaskStatusFilter, json });
  }

  if (subcommand === "claim") {
    const parsed = parseArgs(rest);
    const repoPath = resolveRepoPath(parsed.positionals[0] ?? ".");
    const task = oneOption(parsed.options, "task", false);
    const agent = oneOption(parsed.options, "agent");
    const json = flagOption(parsed.options, "json");
    if (!agent) {
      throw new Error("Missing required option: --agent");
    }
    return claimTask(repoPath, { task, agent, json });
  }

  if (subcommand === "next") {
    const parsed = parseArgs(rest);
    const repoPath = resolveRepoPath(parsed.positionals[0] ?? ".");
    const agent = oneOption(parsed.options, "agent");
    const limitValue = oneOption(parsed.options, "limit", false);
    const seed = !flagOption(parsed.options, "no-seed");
    const json = flagOption(parsed.options, "json");
    const limit = limitValue ? parsePositiveInteger(limitValue, "--limit") : undefined;
    if (!agent) {
      throw new Error("Missing required option: --agent");
    }
    return nextTask(repoPath, { agent, seed, limit, json });
  }

  if (subcommand === "done") {
    const parsed = parseArgs(rest);
    const repoPath = resolveRepoPath(parsed.positionals[0] ?? ".");
    const task = oneOption(parsed.options, "task");
    const note = oneOption(parsed.options, "note", false);
    const json = flagOption(parsed.options, "json");
    if (!task) {
      throw new Error("Missing required option: --task");
    }
    return completeTask(repoPath, { task, note, json });
  }

  if (subcommand === "release") {
    const parsed = parseArgs(rest);
    const repoPath = resolveRepoPath(parsed.positionals[0] ?? ".");
    const task = oneOption(parsed.options, "task");
    const note = oneOption(parsed.options, "note", false);
    const json = flagOption(parsed.options, "json");
    if (!task) {
      throw new Error("Missing required option: --task");
    }
    return releaseTask(repoPath, { task, note, json });
  }

  throw new Error(
    "Usage: kforge task seed [path] [--limit <n>] [--json]\n       kforge task list [path] [--status <open|claimed|done|all>] [--json]\n       kforge task claim [path] [--task <tasks/file.md>] --agent <name> [--json]\n       kforge task next [path] --agent <name> [--limit <n>] [--no-seed] [--json]\n       kforge task done [path] --task <tasks/file.md> [--note <text>] [--json]\n       kforge task release [path] --task <tasks/file.md> [--note <text>] [--json]",
  );
}

function runRunCommand(args: string[]): CommandResult {
  const [subcommand, ...rest] = args;

  if (subcommand === "start") {
    const parsed = parseArgs(rest);
    const repoPath = resolveRepoPath(parsed.positionals[0] ?? ".");
    const task = oneOption(parsed.options, "task");
    const agent = oneOption(parsed.options, "agent");
    const note = oneOption(parsed.options, "note", false);
    const json = flagOption(parsed.options, "json");
    if (!task) {
      throw new Error("Missing required option: --task");
    }
    if (!agent) {
      throw new Error("Missing required option: --agent");
    }
    return startRun(repoPath, { task, agent, note, json });
  }

  if (subcommand === "next") {
    const parsed = parseArgs(rest);
    const repoPath = resolveRepoPath(parsed.positionals[0] ?? ".");
    const agent = oneOption(parsed.options, "agent");
    const limitValue = oneOption(parsed.options, "limit", false);
    const seed = !flagOption(parsed.options, "no-seed");
    const note = oneOption(parsed.options, "note", false);
    const json = flagOption(parsed.options, "json");
    const limit = limitValue ? parsePositiveInteger(limitValue, "--limit") : undefined;
    if (!agent) {
      throw new Error("Missing required option: --agent");
    }
    return nextRun(repoPath, { agent, seed, limit, note, json });
  }

  if (subcommand === "list") {
    const parsed = parseArgs(rest);
    const repoPath = resolveRepoPath(parsed.positionals[0] ?? ".");
    const status = oneOption(parsed.options, "status", false) ?? "running";
    const json = flagOption(parsed.options, "json");
    if (!["running", "success", "failure", "all"].includes(status)) {
      throw new Error("--status must be one of: running, success, failure, all");
    }
    return listRuns(repoPath, { status: status as RunStatusFilter, json });
  }

  if (subcommand === "inspect") {
    const parsed = parseArgs(rest);
    const repoPath = resolveRepoPath(parsed.positionals[0] ?? ".");
    const run = oneOption(parsed.options, "run");
    const json = flagOption(parsed.options, "json");
    if (!run) {
      throw new Error("Missing required option: --run");
    }
    return inspectRun(repoPath, { run, json });
  }

  if (subcommand === "log") {
    const parsed = parseArgs(rest);
    const repoPath = resolveRepoPath(parsed.positionals[0] ?? ".");
    const run = oneOption(parsed.options, "run");
    const message = oneOption(parsed.options, "message");
    const json = flagOption(parsed.options, "json");
    if (!run) {
      throw new Error("Missing required option: --run");
    }
    if (!message) {
      throw new Error("Missing required option: --message");
    }
    return logRun(repoPath, { run, message, json });
  }

  if (subcommand === "finish") {
    const parsed = parseArgs(rest);
    const repoPath = resolveRepoPath(parsed.positionals[0] ?? ".");
    const run = oneOption(parsed.options, "run");
    const status = oneOption(parsed.options, "status");
    const note = oneOption(parsed.options, "note", false);
    const json = flagOption(parsed.options, "json");
    if (!run) {
      throw new Error("Missing required option: --run");
    }
    if (status !== "success" && status !== "failure") {
      throw new Error("--status must be one of: success, failure");
    }
    return finishRun(repoPath, { run, status, note, json });
  }

  throw new Error(
    "Usage: kforge run start [path] --task <tasks/file.md> --agent <name> [--note <text>] [--json]\n       kforge run next [path] --agent <name> [--limit <n>] [--no-seed] [--note <text>] [--json]\n       kforge run list [path] [--status <running|success|failure|all>] [--json]\n       kforge run inspect [path] --run <runs/file.md> [--json]\n       kforge run log [path] --run <runs/file.md> --message <text> [--json]\n       kforge run finish [path] --run <runs/file.md> --status <success|failure> [--note <text>] [--json]",
  );
}

function runAskCommand(args: string[]): CommandResult {
  const parsed = parseArgs(args);
  const repoPath = resolveRepoPath(parsed.positionals[0] ?? ".");
  const question = oneOption(parsed.options, "question");
  const query = oneOption(parsed.options, "query", false);
  const limitValue = oneOption(parsed.options, "limit", false);
  const files = manyOptions(parsed.options, "file");
  const scopes = parseScopes(manyOptions(parsed.options, "scope"));
  const write = flagOption(parsed.options, "write");

  if (!question) {
    throw new Error("Missing required option: --question");
  }

  const limit = limitValue ? parsePositiveInteger(limitValue, "--limit") : undefined;

  return askRepo(repoPath, { question, query, files, limit, scopes, write });
}

function runPromoteCommand(args: string[]): CommandResult {
  const parsed = parseArgs(args);
  const repoPath = resolveRepoPath(parsed.positionals[0] ?? ".");
  const file = oneOption(parsed.options, "file");
  const target = oneOption(parsed.options, "target");
  const sources = manyOptions(parsed.options, "source");
  const title = oneOption(parsed.options, "title", false);
  const summary = oneOption(parsed.options, "summary", false);
  const status = oneOption(parsed.options, "status", false);
  const json = flagOption(parsed.options, "json");

  if (!file) {
    throw new Error("Missing required option: --file");
  }

  if (!target) {
    throw new Error("Missing required option: --target");
  }

  if (status && !["proposed", "accepted", "rejected"].includes(status)) {
    throw new Error("--status must be one of: proposed, accepted, rejected");
  }

  return promoteOutput(repoPath, {
    file,
    target,
    sources,
    title,
    summary,
    status: status as PromoteStatus | undefined,
    json,
  });
}

function runCompileCommand(args: string[]): CommandResult {
  const [maybeSubcommand, ...rest] = args;
  if (maybeSubcommand === "plan") {
    const parsed = parseArgs(rest);
    const repoPath = resolveRepoPath(parsed.positionals[0] ?? ".");
    const write = flagOption(parsed.options, "write");
    const json = flagOption(parsed.options, "json");
    return compilePlanRepo(repoPath, { write, json });
  }

  if (maybeSubcommand === "review") {
    const parsed = parseArgs(rest);
    const repoPath = resolveRepoPath(parsed.positionals[0] ?? ".");
    const limitValue = oneOption(parsed.options, "limit", false);
    const dryRun = flagOption(parsed.options, "dry-run");
    const json = flagOption(parsed.options, "json");
    const limit = limitValue ? parsePositiveInteger(limitValue, "--limit") : undefined;
    return compileReviewRepo(repoPath, { limit, dryRun, json });
  }

  if (maybeSubcommand === "draft") {
    const parsed = parseArgs(rest);
    const repoPath = resolveRepoPath(parsed.positionals[0] ?? ".");
    const review = oneOption(parsed.options, "review", false);
    const sources = manyOptions(parsed.options, "source");
    const target = oneOption(parsed.options, "target", false);
    const title = oneOption(parsed.options, "title", false);
    const write = flagOption(parsed.options, "write");
    const json = flagOption(parsed.options, "json");
    return compileDraftRepo(repoPath, { review, sources, target, title, write, json });
  }

  const parsed = parseArgs(args);
  const repoPath = resolveRepoPath(parsed.positionals[0] ?? ".");
  const sources = manyOptions(parsed.options, "source");
  const target = oneOption(parsed.options, "target");
  const title = oneOption(parsed.options, "title", false);
  const write = flagOption(parsed.options, "write");

  if (sources.length === 0) {
    throw new Error("Missing required option: --source");
  }

  if (!target) {
    throw new Error("Missing required option: --target");
  }

  return compileRepo(repoPath, { sources, target, title, write });
}

function runPackCommand(args: string[]): CommandResult {
  const parsed = parseArgs(args);
  const repoPath = resolveRepoPath(parsed.positionals[0] ?? ".");
  const task = oneOption(parsed.options, "task");
  const query = oneOption(parsed.options, "query", false);
  const limitValue = oneOption(parsed.options, "limit", false);
  const files = manyOptions(parsed.options, "file");
  const scopes = parseScopes(manyOptions(parsed.options, "scope"));
  const write = flagOption(parsed.options, "write");

  if (!task) {
    throw new Error("Missing required option: --task");
  }

  let limit: number | undefined;
  if (limitValue) {
    limit = parsePositiveInteger(limitValue, "--limit");
  }

  return packRepo(repoPath, { task, query, files, limit, scopes, write });
}

function runAgentCommand(args: string[]): CommandResult {
  const [subcommand, ...rest] = args;

  if (subcommand === "next") {
    const parsed = parseArgs(rest);
    const repoPath = resolveRepoPath(parsed.positionals[0] ?? ".");
    const agent = oneOption(parsed.options, "agent");
    const limitValue = oneOption(parsed.options, "limit", false);
    const seed = !flagOption(parsed.options, "no-seed");
    const note = oneOption(parsed.options, "note", false);
    const json = flagOption(parsed.options, "json");
    const limit = limitValue ? parsePositiveInteger(limitValue, "--limit") : undefined;
    if (!agent) {
      throw new Error("Missing required option: --agent");
    }
    return nextRun(repoPath, { agent, seed, limit, note, json });
  }

  if (subcommand === "step") {
    const parsed = parseArgs(rest);
    const repoPath = resolveRepoPath(parsed.positionals[0] ?? ".");
    const agent = oneOption(parsed.options, "agent");
    const limitValue = oneOption(parsed.options, "limit", false);
    const seed = !flagOption(parsed.options, "no-seed");
    const note = oneOption(parsed.options, "note", false);
    const json = flagOption(parsed.options, "json");
    const limit = limitValue ? parsePositiveInteger(limitValue, "--limit") : undefined;
    if (!agent) {
      throw new Error("Missing required option: --agent");
    }
    return agentStep(repoPath, { agent, seed, limit, note, json });
  }

  if (subcommand === "draft") {
    const parsed = parseArgs(rest);
    const repoPath = resolveRepoPath(parsed.positionals[0] ?? ".");
    const agent = oneOption(parsed.options, "agent");
    const run = oneOption(parsed.options, "run", false);
    const json = flagOption(parsed.options, "json");
    if (!agent) {
      throw new Error("Missing required option: --agent");
    }
    return agentDraft(repoPath, { agent, run, json });
  }

  if (subcommand === "status") {
    const parsed = parseArgs(rest);
    const repoPath = resolveRepoPath(parsed.positionals[0] ?? ".");
    const agent = oneOption(parsed.options, "agent");
    const json = flagOption(parsed.options, "json");
    if (!agent) {
      throw new Error("Missing required option: --agent");
    }
    return agentStatus(repoPath, { agent, json });
  }

  if (subcommand === "board") {
    const parsed = parseArgs(rest);
    const repoPath = resolveRepoPath(parsed.positionals[0] ?? ".");
    const json = flagOption(parsed.options, "json");
    return agentBoard(repoPath, { json });
  }

  if (subcommand === "plan") {
    const parsed = parseArgs(rest);
    const repoPath = resolveRepoPath(parsed.positionals[0] ?? ".");
    const agents = manyOptions(parsed.options, "agent");
    const limitValue = oneOption(parsed.options, "limit", false);
    const seed = !flagOption(parsed.options, "no-seed");
    const note = oneOption(parsed.options, "note", false);
    const json = flagOption(parsed.options, "json");
    const limit = limitValue ? parsePositiveInteger(limitValue, "--limit") : undefined;
    if (agents.length === 0) {
      throw new Error("Missing required option: --agent");
    }
    return agentPlan(repoPath, { agents, seed, limit, note, json });
  }

  if (subcommand === "finish") {
    const parsed = parseArgs(rest);
    const repoPath = resolveRepoPath(parsed.positionals[0] ?? ".");
    const agent = oneOption(parsed.options, "agent");
    const run = oneOption(parsed.options, "run", false);
    const status = oneOption(parsed.options, "status", false) ?? "success";
    const note = oneOption(parsed.options, "note", false);
    const taskDone = flagOption(parsed.options, "task-done");
    const json = flagOption(parsed.options, "json");
    if (!agent) {
      throw new Error("Missing required option: --agent");
    }
    if (status !== "success" && status !== "failure") {
      throw new Error("--status must be one of: success, failure");
    }
    return agentFinish(repoPath, { agent, run, status, note, taskDone, json });
  }

  if (subcommand === "list") {
    return listAgentTemplates();
  }

  if (subcommand === "print") {
    const parsed = parseArgs(rest);
    const template = parseAgentTemplateKind(oneOption(parsed.options, "template", false) ?? "agents");
    return printAgentTemplate(template);
  }

  if (subcommand === "install") {
    const parsed = parseArgs(rest);
    const repoPath = resolveRepoPath(parsed.positionals[0] ?? ".");
    const template = parseAgentTemplateKind(oneOption(parsed.options, "template", false) ?? "agents");
    const force = flagOption(parsed.options, "force");
    return installAgentTemplate(repoPath, { kind: template, force });
  }

  throw new Error(
    "Usage: kforge agent next [path] --agent <name> [--limit <n>] [--no-seed] [--note <text>] [--json]\n       kforge agent step [path] --agent <name> [--limit <n>] [--no-seed] [--note <text>] [--json]\n       kforge agent draft [path] --agent <name> [--run <runs/file.md>] [--json]\n       kforge agent status [path] --agent <name> [--json]\n       kforge agent board [path] [--json]\n       kforge agent plan [path] --agent <name> --agent <name> [--limit <n>] [--no-seed] [--note <text>] [--json]\n       kforge agent finish [path] --agent <name> [--run <runs/file.md>] [--status <success|failure>] [--task-done] [--note <text>] [--json]\n       kforge agent list\n       kforge agent print [--template <agents|claude|cursor|generic>]\n       kforge agent install [path] [--template <agents|claude|cursor|generic>] [--force]",
  );
}

function runInspectCommand(args: string[]): CommandResult {
  const parsed = parseArgs(args);
  const repoPath = resolveRepoPath(parsed.positionals[0] ?? ".");
  const file = oneOption(parsed.options, "file");

  if (!file) {
    throw new Error("Missing required option: --file");
  }

  return inspectRepo(repoPath, { file });
}

function runSearchCommand(args: string[]): CommandResult {
  const parsed = parseArgs(args);
  const repoPath = resolveRepoPath(parsed.positionals[0] ?? ".");
  const query = oneOption(parsed.options, "query");
  const limitValue = oneOption(parsed.options, "limit", false);
  const scopes = parseScopes(manyOptions(parsed.options, "scope"));

  if (!query) {
    throw new Error("Missing required option: --query");
  }

  const limit = limitValue ? parsePositiveInteger(limitValue, "--limit") : undefined;

  return searchRepo(repoPath, { query, limit, scopes });
}

async function runSourceCommand(args: string[]): Promise<CommandResult> {
  const [subcommand, ...rest] = args;
  if (subcommand === "list") {
    const parsed = parseArgs(rest);
    const repoPath = resolveRepoPath(parsed.positionals[0] ?? ".");
    return listSources(repoPath);
  }

  if (subcommand === "inspect") {
    const parsed = parseArgs(rest);
    const repoPath = resolveRepoPath(parsed.positionals[0] ?? ".");
    const file = oneOption(parsed.options, "file");

    if (!file) {
      throw new Error("Missing required option: --file");
    }

    return inspectSource(repoPath, { file });
  }

  if (subcommand === "import") {
    const parsed = parseArgs(rest);
    const repoPath = resolveRepoPath(parsed.positionals[0] ?? ".");
    const dir = oneOption(parsed.options, "dir");
    const titlePrefix = oneOption(parsed.options, "title-prefix", false);
    const url = oneOption(parsed.options, "url", false);
    const author = oneOption(parsed.options, "author", false);
    const date = oneOption(parsed.options, "date", false);
    const license = oneOption(parsed.options, "license", false);
    const note = oneOption(parsed.options, "note", false);
    const dryRun = flagOption(parsed.options, "dry-run");
    const json = flagOption(parsed.options, "json");

    if (!dir) {
      throw new Error("Missing required option: --dir");
    }

    return importSources(repoPath, { dir, titlePrefix, url, author, date, license, note, dryRun, json });
  }

  if (subcommand === "fetch") {
    const parsed = parseArgs(rest);
    const repoPath = resolveRepoPath(parsed.positionals[0] ?? ".");
    const url = oneOption(parsed.options, "url");
    const title = oneOption(parsed.options, "title", false);
    const author = oneOption(parsed.options, "author", false);
    const date = oneOption(parsed.options, "date", false);
    const license = oneOption(parsed.options, "license", false);
    const note = oneOption(parsed.options, "note", false);
    const json = flagOption(parsed.options, "json");

    if (!url) {
      throw new Error("Missing required option: --url");
    }

    return fetchSource(repoPath, { url, title, author, date, license, note, json });
  }

  if (subcommand === "fetch-list") {
    const parsed = parseArgs(rest);
    const repoPath = resolveRepoPath(parsed.positionals[0] ?? ".");
    const file = oneOption(parsed.options, "file");
    const titlePrefix = oneOption(parsed.options, "title-prefix", false);
    const author = oneOption(parsed.options, "author", false);
    const date = oneOption(parsed.options, "date", false);
    const license = oneOption(parsed.options, "license", false);
    const note = oneOption(parsed.options, "note", false);
    const dryRun = flagOption(parsed.options, "dry-run");
    const json = flagOption(parsed.options, "json");

    if (!file) {
      throw new Error("Missing required option: --file");
    }

    return fetchSources(repoPath, { file, titlePrefix, author, date, license, note, dryRun, json });
  }

  if (subcommand !== "add") {
    throw new Error(
      "Usage: kforge source add [path] --file <local-file> [--json]\n       kforge source fetch [path] --url <url> [--title <title>] [--json]\n       kforge source fetch-list [path] --file <urls.txt> [--dry-run] [--json]\n       kforge source import [path] --dir <local-dir> [--dry-run] [--json]\n       kforge source list [path]\n       kforge source inspect [path] --file <raw/file>",
    );
  }

  const parsed = parseArgs(rest);
  const repoPath = resolveRepoPath(parsed.positionals[0] ?? ".");
  const file = oneOption(parsed.options, "file");
  const title = oneOption(parsed.options, "title", false);
  const url = oneOption(parsed.options, "url", false);
  const author = oneOption(parsed.options, "author", false);
  const date = oneOption(parsed.options, "date", false);
  const license = oneOption(parsed.options, "license", false);
  const note = oneOption(parsed.options, "note", false);
  const json = flagOption(parsed.options, "json");

  if (!file) {
    throw new Error("Missing required option: --file");
  }

  return addSource(repoPath, { file, title, url, author, date, license, note, json });
}

function runClaimCommand(args: string[]): CommandResult {
  const [subcommand, ...rest] = args;
  if (subcommand === "audit") {
    const parsed = parseArgs(rest);
    const repoPath = resolveRepoPath(parsed.positionals[0] ?? ".");
    const write = flagOption(parsed.options, "write");
    const json = flagOption(parsed.options, "json");
    return auditClaims(repoPath, { write, json });
  }

  if (subcommand === "review-drift") {
    const parsed = parseArgs(rest);
    const repoPath = resolveRepoPath(parsed.positionals[0] ?? ".");
    const dryRun = flagOption(parsed.options, "dry-run");
    return reviewClaimDrift(repoPath, { dryRun });
  }

  if (subcommand !== "new") {
    throw new Error(
      "Usage: kforge claim new [path] --title <title> --source <raw/file.md>\n       kforge claim audit [path] [--write] [--json]\n       kforge claim review-drift [path] [--dry-run]",
    );
  }

  const parsed = parseArgs(rest);
  const repoPath = resolveRepoPath(parsed.positionals[0] ?? ".");
  const title = oneOption(parsed.options, "title");
  const sources = manyOptions(parsed.options, "source");
  const assertion = oneOption(parsed.options, "assertion", false);
  const confidence = oneOption(parsed.options, "confidence", false);
  const status = oneOption(parsed.options, "status", false);

  if (!title) {
    throw new Error("Missing required option: --title");
  }

  if (sources.length === 0) {
    throw new Error("Missing required option: --source");
  }

  if (confidence && !["low", "medium", "high"].includes(confidence)) {
    throw new Error("--confidence must be one of: low, medium, high");
  }

  if (status && !["proposed", "reviewed", "deprecated"].includes(status)) {
    throw new Error("--status must be one of: proposed, reviewed, deprecated");
  }

  return createClaim(repoPath, {
    title,
    sources,
    assertion,
    confidence: confidence as ClaimConfidence | undefined,
    status: status as ClaimStatus | undefined,
  });
}

function runReviewCommand(args: string[]): CommandResult {
  const [subcommand, ...rest] = args;
  if (subcommand === "apply") {
    return runReviewApplyCommand(rest);
  }

  if (subcommand === "content") {
    return runReviewContentCommand(rest);
  }

  if (subcommand === "status") {
    return runReviewStatusCommand(rest);
  }

  if (subcommand === "queue") {
    const parsed = parseArgs(rest);
    const repoPath = resolveRepoPath(parsed.positionals[0] ?? ".");
    const limitValue = oneOption(parsed.options, "limit", false);
    const status = oneOption(parsed.options, "status", false);
    const json = flagOption(parsed.options, "json");
    if (status && !["actionable", "open", "accepted", "all"].includes(status)) {
      throw new Error("--status must be one of: actionable, open, accepted, all");
    }
    return reviewQueue(repoPath, {
      limit: limitValue ? parsePositiveInteger(limitValue, "--limit") : undefined,
      status: status as "actionable" | "open" | "accepted" | "all" | undefined,
      json,
    });
  }

  if (subcommand === "next") {
    const parsed = parseArgs(rest);
    const repoPath = resolveRepoPath(parsed.positionals[0] ?? ".");
    const json = flagOption(parsed.options, "json");
    return reviewNext(repoPath, { json });
  }

  if (subcommand !== "new") {
    throw new Error(
      "Usage: kforge review queue [path] [--limit <n>] [--status <actionable|open|accepted|all>] [--json]\n       kforge review next [path] [--json]\n       kforge review new [path] --title <title> --target <path> --source <path>\n       kforge review content [path] --file <reviews/file.md> (--content <markdown>|--from <repo-path>) [--json]\n       kforge review status [path] --file <reviews/file.md> --status <status> [--json]\n       kforge review apply [path] --file <reviews/file.md> [--json]",
    );
  }

  const parsed = parseArgs(rest);
  const repoPath = resolveRepoPath(parsed.positionals[0] ?? ".");
  const title = oneOption(parsed.options, "title");
  const targets = manyOptions(parsed.options, "target");
  const sources = manyOptions(parsed.options, "source");
  const summary = oneOption(parsed.options, "summary", false);
  const content = oneOption(parsed.options, "content", false);
  const kind = oneOption(parsed.options, "kind", false);
  const status = oneOption(parsed.options, "status", false);

  if (!title) {
    throw new Error("Missing required option: --title");
  }

  if (targets.length === 0) {
    throw new Error("Missing required option: --target");
  }

  if (sources.length === 0) {
    throw new Error("Missing required option: --source");
  }

  if (kind && !["compile", "conflict", "stale", "merge", "custom"].includes(kind)) {
    throw new Error("--kind must be one of: compile, conflict, stale, merge, custom");
  }

  if (status && !["proposed", "accepted", "rejected", "applied"].includes(status)) {
    throw new Error("--status must be one of: proposed, accepted, rejected, applied");
  }

  return createReview(repoPath, {
    title,
    targets,
    sources,
    summary,
    content,
    kind: kind as "compile" | "conflict" | "stale" | "merge" | "custom" | undefined,
    status: status as "proposed" | "accepted" | "rejected" | "applied" | undefined,
  });
}

function runReviewApplyCommand(args: string[]): CommandResult {
  const parsed = parseArgs(args);
  const repoPath = resolveRepoPath(parsed.positionals[0] ?? ".");
  const file = oneOption(parsed.options, "file");
  const note = oneOption(parsed.options, "note", false);
  const dryRun = flagOption(parsed.options, "dry-run");
  const json = flagOption(parsed.options, "json");

  if (!file) {
    throw new Error("Missing required option: --file");
  }

  return applyReview(repoPath, { file, note, dryRun, json });
}

function runReviewContentCommand(args: string[]): CommandResult {
  const parsed = parseArgs(args);
  const repoPath = resolveRepoPath(parsed.positionals[0] ?? ".");
  const file = oneOption(parsed.options, "file");
  const content = oneOption(parsed.options, "content", false);
  const from = oneOption(parsed.options, "from", false);
  const json = flagOption(parsed.options, "json");

  if (!file) {
    throw new Error("Missing required option: --file");
  }

  return updateReviewContent(repoPath, { file, content, from, json });
}

function runReviewStatusCommand(args: string[]): CommandResult {
  const parsed = parseArgs(args);
  const repoPath = resolveRepoPath(parsed.positionals[0] ?? ".");
  const file = oneOption(parsed.options, "file");
  const status = oneOption(parsed.options, "status");
  const note = oneOption(parsed.options, "note", false);
  const json = flagOption(parsed.options, "json");

  if (!file) {
    throw new Error("Missing required option: --file");
  }

  if (!status) {
    throw new Error("Missing required option: --status");
  }

  if (!isReviewStatus(status)) {
    throw new Error("--status must be one of: proposed, accepted, rejected, applied");
  }

  return updateReviewStatus(repoPath, { file, status, note, json });
}

function resolveRepoPath(input: string): string {
  const expanded = input === "~" ? homedir() : input.replace(/^~\//, `${homedir()}/`);
  return path.resolve(expanded);
}

function printResult(result: CommandResult): void {
  for (const message of result.messages) {
    console.log(message);
  }
}

function isCommand(value: string): value is Command {
  return (
    value === "init" ||
    value === "demo" ||
    value === "index" ||
    value === "refresh" ||
    value === "doctor" ||
    value === "score" ||
    value === "context" ||
    value === "dashboard" ||
    value === "handoff" ||
    value === "workflow" ||
    value === "graph" ||
    value === "agent" ||
    value === "compile" ||
    value === "ask" ||
    value === "search" ||
    value === "inspect" ||
    value === "pack" ||
    value === "promote" ||
    value === "output" ||
    value === "task" ||
    value === "run" ||
    value === "source" ||
    value === "claim" ||
    value === "review" ||
    value === "version"
  );
}

function printHelp(): void {
  console.log(`kforge ${VERSION}

Usage:
  kforge init [path] [--force] [--example]             create a knowledge repo
  kforge demo [path] [--force]                         create a ready-to-browse demo repo
  kforge index [path]                                  generate inventory files
  kforge refresh [path]                                refresh indexes and derived reports
  kforge doctor [path] [--write] [--json]              run health checks
  kforge score [path] [--write]                        print or write a trust score report
  kforge context [path] [--write]                      print or write an agent context pack
  kforge dashboard [path] [--write] [--json]           print or write an Obsidian-friendly status dashboard
  kforge handoff [path] [--write]                      print or write an agent handoff packet
  kforge workflow [path] [--write]                     print or write an agent workflow runbook
  kforge graph [path] [--write]                        print or write wiki backlinks and orphan report
  kforge agent next [path] --agent <name> [--limit <n>] [--no-seed] [--note <text>] [--json]
                                                       claim next task and start a run
  kforge agent step [path] --agent <name> [--limit <n>] [--no-seed] [--note <text>] [--json]
                                                       create one agent work packet
  kforge agent draft [path] --agent <name> [--run <runs/file.md>] [--json]
                                                       create a compile draft for current work
  kforge agent status [path] --agent <name> [--json]    show current work for one agent
  kforge agent board [path] [--json]                    show active agents, runs, tasks, and coordination gaps
  kforge agent plan [path] --agent <name> --agent <name> [--limit <n>] [--no-seed] [--note <text>] [--json]
                                                       assign independent runs to multiple agents
  kforge agent finish [path] --agent <name> [--run <runs/file.md>] [--status <success|failure>] [--task-done] [--note <text>] [--json]
                                                       finish the current agent run
  kforge agent list                                     list installable agent instruction templates
  kforge agent print [--template <name>]                print an agent instruction template
  kforge agent install [path] [--template <name>] [--force]
                                                       install an agent instruction template
  kforge compile [path] --source <path> --target <wiki/page.md> [--title <title>] [--write]
                                                       create a source-to-wiki compile brief
  kforge compile plan [path] [--write] [--json]        print or write raw-to-wiki compile queue
  kforge compile review [path] [--limit <n>] [--dry-run] [--json]
                                                       create compile review artifacts from queued raw sources
  kforge compile draft [path] [--review <reviews/file.md>|--source <path> --target <wiki/page.md>] [--write] [--json]
                                                       create a wiki draft template for a compile review
  kforge ask [path] --question <text> [--query <text>] [--file <repo-path>] [--write]
                                                       create an answer pack for a question
  kforge search [path] --query <text> [--scope <scope>] [--limit <n>]
                                                       search text files in the repo
  kforge inspect [path] --file <repo-path>             inspect one repo-local file
  kforge pack [path] --task <text> [--query <text>] [--file <repo-path>] [--write]
                                                       create an agent task pack
  kforge promote [path] --file <outputs/file> --target <wiki/page.md|claims/file.md> [--source <path>] [--json]
                                                       promote an output into a review artifact
  kforge output list [path] [--json]                   list generated outputs
  kforge output inspect [path] --file <outputs/file> [--json]
                                                       inspect one generated output
  kforge task seed [path] [--limit <n>] [--json]       seed tasks from review queue
  kforge task list [path] [--status <open|claimed|done|all>] [--json]
                                                       list parallel agent tasks
  kforge task claim [path] [--task <tasks/file.md>] --agent <name> [--json]
                                                       claim the next or selected task
  kforge task next [path] --agent <name> [--limit <n>] [--no-seed] [--json]
                                                       seed if needed and claim next task
  kforge task done [path] --task <tasks/file.md> [--note <text>] [--json]
                                                       mark a task done
  kforge task release [path] --task <tasks/file.md> [--note <text>] [--json]
                                                       release a claimed task
  kforge run start [path] --task <tasks/file.md> --agent <name> [--note <text>] [--json]
                                                       start an auditable agent run
  kforge run next [path] --agent <name> [--limit <n>] [--no-seed] [--note <text>] [--json]
                                                       claim next task and start a run
  kforge run list [path] [--status <running|success|failure|all>] [--json]
                                                       list agent runs
  kforge run inspect [path] --run <runs/file.md> [--json]
                                                       inspect one agent run
  kforge run log [path] --run <runs/file.md> --message <text> [--json]
                                                       append to a run log
  kforge run finish [path] --run <runs/file.md> --status <success|failure> [--note <text>] [--json]
                                                       finish a run
  kforge source add [path] --file <local-file> [--title <title>] [--url <url>] [--json]
                                                       copy a local source into raw/
  kforge source fetch [path] --url <url> [--title <title>] [--json]
                                                       fetch a text or HTML URL into raw/
  kforge source fetch-list [path] --file <urls.txt> [--title-prefix <text>] [--dry-run] [--json]
                                                       fetch a URL list into raw/
  kforge source import [path] --dir <local-dir> [--title-prefix <text>] [--dry-run] [--json]
                                                       copy a local source directory into raw/
  kforge source list [path]                            list raw sources and metadata
  kforge source inspect [path] --file <raw/file>       inspect one raw source and its metadata
  kforge claim new [path] --title <title> --source <path>
                                                       create a sourced claim
  kforge claim audit [path] [--write] [--json]          audit claim provenance and review debt
  kforge claim review-drift [path] [--dry-run]          create reviews for source drift warnings
  kforge review queue [path] [--limit <n>] [--status <actionable|open|accepted|all>] [--json]
                                                       list prioritized review work
  kforge review next [path] [--json]                    show the next actionable review
  kforge review new [path] --title <title> --target <path> --source <path> [--content <markdown>]
                                                       create a review artifact
  kforge review content [path] --file <reviews/file.md> (--content <markdown>|--from <repo-path>) [--json]
                                                       update a review Proposed Content block
  kforge review status [path] --file <reviews/file.md> --status <status> [--note <text>] [--json]
                                                       update review status
  kforge review apply [path] --file <reviews/file.md> [--dry-run] [--note <text>] [--json]
                                                       apply accepted structured review content
  kforge version                                       print the version
`);
}

function parseArgs(args: string[]): { positionals: string[]; options: Map<string, string[]> } {
  const positionals: string[] = [];
  const options = new Map<string, string[]>();

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (!arg.startsWith("--")) {
      positionals.push(arg);
      continue;
    }

    const rawOption = arg.slice(2);
    const equalsIndex = rawOption.indexOf("=");
    const name = equalsIndex >= 0 ? rawOption.slice(0, equalsIndex) : rawOption;
    const inlineValue = equalsIndex >= 0 ? rawOption.slice(equalsIndex + 1) : undefined;
    if (!name) {
      throw new Error(`Invalid option: ${arg}`);
    }

    if (inlineValue !== undefined) {
      if (inlineValue.length === 0) {
        throw new Error(`Missing value for option: --${name}`);
      }
      options.set(name, [...(options.get(name) ?? []), inlineValue]);
      continue;
    }

    const value = args[index + 1];
    if (name === "write" || name === "dry-run" || name === "json" || name === "force" || name === "no-seed" || name === "task-done") {
      options.set(name, [...(options.get(name) ?? []), "true"]);
      continue;
    }

    if (!value || value.startsWith("--")) {
      throw new Error(`Missing value for option: --${name}`);
    }

    options.set(name, [...(options.get(name) ?? []), value]);
    index += 1;
  }

  return { positionals, options };
}

function oneOption(options: Map<string, string[]>, name: string, required = true): string | undefined {
  const values = options.get(name) ?? [];
  if (values.length === 0) {
    if (required) {
      throw new Error(`Missing required option: --${name}`);
    }
    return undefined;
  }
  if (values.length > 1) {
    throw new Error(`Option --${name} can only be provided once`);
  }
  return values[0];
}

function manyOptions(options: Map<string, string[]>, name: string): string[] {
  return options.get(name) ?? [];
}

function flagOption(options: Map<string, string[]>, name: string): boolean {
  return (options.get(name) ?? []).length > 0;
}

function parsePositiveInteger(value: string, optionName: string): number {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error(`${optionName} must be a positive integer`);
  }
  return parsed;
}

function parseScopes(values: string[]): SearchScope[] | undefined {
  if (values.length === 0) {
    return undefined;
  }

  const rawScopes = values.flatMap((value) => value.split(",").map((item) => item.trim()).filter(Boolean));
  const scopes: SearchScope[] = [];
  for (const scope of rawScopes) {
    if (!isScope(scope)) {
      throw new Error("--scope must be one of: raw, wiki, claims, reviews, outputs");
    }
    scopes.push(scope);
  }
  return scopes;
}

function isScope(value: string): value is SearchScope {
  return value === "raw" || value === "wiki" || value === "claims" || value === "reviews" || value === "outputs";
}

function parseAgentTemplateKind(value: string): AgentTemplateKind {
  if (value === "agents" || value === "claude" || value === "cursor" || value === "generic") {
    return value;
  }
  throw new Error("--template must be one of: agents, claude, cursor, generic");
}

function isReviewStatus(value: string): value is ReviewStatus {
  return value === "proposed" || value === "accepted" || value === "rejected" || value === "applied";
}

main()
  .then((exitCode) => {
    process.exitCode = exitCode;
  })
  .catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
