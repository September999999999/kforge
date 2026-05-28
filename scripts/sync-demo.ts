import { rm } from "node:fs/promises";
import path from "node:path";
import { initRepo, refreshRepo } from "../src/repo.js";

async function main(): Promise<void> {
  const repoPath = path.join(process.cwd(), "examples", "demo-repo");
  await rm(repoPath, { recursive: true, force: true });

  const init = initRepo(repoPath, { example: true });
  if (!init.ok) {
    throw new Error(init.messages.join("\n"));
  }

  const refresh = refreshRepo(repoPath);
  if (!refresh.ok) {
    throw new Error(refresh.messages.join("\n"));
  }

  console.log("Synced examples/demo-repo.");
}

await main();
