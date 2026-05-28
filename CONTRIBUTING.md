# Contributing to kforge

Thanks for helping shape `kforge`. The project is still early, so the most
valuable contributions are small, testable improvements to the protocol, CLI,
MCP tools, and docs.

## Project Direction

`kforge` is a TypeScript-first, provider-neutral toolkit for local Markdown
knowledge repos. Core commands should stay deterministic and should not require:

- a hosted LLM provider
- a vector database
- Python runtime scripts
- network access unless a command explicitly opts in

Rust can be considered later for measured performance hotspots, but the default
CLI and MCP server should keep working with Node.js alone.

## Development Setup

```bash
npm install
npm test
```

Useful commands:

```bash
npm run build
npm run check:install
npm run check:launch
npm run check:package
npm run check:stack
npm run check:surface
npm run check:walkthrough
npm run demo:sync
npm run smoke
node dist/src/cli.js --help
node dist/src/cli.js init /tmp/kforge-demo --example
node dist/src/cli.js doctor /tmp/kforge-demo
npm pack --dry-run
```

Release preparation lives in `docs/release-checklist.md` and
`docs/publishing.md`.

## Project Invariants

These are release-blocking project boundaries, not style preferences:

- Core commands stay deterministic and file-based.
- The baseline stack stays TypeScript on Node.js.
- Core behavior stays provider-neutral; do not require an OpenAI, Anthropic,
  local model, or embedding provider to use the repo protocol.
- Do not add Python implementation files, Python package manifests, notebooks,
  or npm scripts that call Python tooling.
- Do not add a mandatory vector database, background service, network service,
  or hosted runtime to the baseline CLI or MCP server.
- Keep durable state in Markdown and small sidecar files under the canonical
  repo layout.
- Stage risky wiki or claim changes through `reviews/` before applying them.
- Prefer `--json` payloads for automation instead of parsing prose output.

`npm run check:stack` enforces the no-Python boundary. `npm run check:package`
protects package metadata, release files, and key README/example positioning.
`npm run check:install` packs the project into a temporary tarball, installs it
into a clean temporary project, and verifies the installed CLI bins plus public
ESM API.
`npm run check:launch` verifies launch docs and public package metadata policy;
strict mode is reserved for the final publish after the real GitHub repo exists.
`npm run check:surface` keeps CLI help, README commands, MCP registrations,
and MCP docs aligned.
`npm run check:walkthrough` runs the public demo agent loop from draft through
review apply, agent finish, refresh, and a clean doctor check.

## Adding A Command

Most new operations should move through the same layers so humans, scripts, and
agents see one behavior:

1. Add the deterministic core function and payload types in `src/repo.ts`.
2. Export the function and public types from `src/index.ts`.
3. Add the CLI route and help text in `src/cli.ts`.
4. Add the MCP tool in `src/mcp.ts` when the operation is useful to agents.
5. Add repo-level tests in `tests/repo.test.ts`.
6. Add CLI coverage in `tests/cli.test.ts`.
7. Add MCP coverage in `tests/mcp.test.ts` when an MCP tool was added.
8. Update `README.md`, `docs/protocol.md`, and the relevant guide under
   `docs/`.
9. If the built-in demo repo output changes, run `npm run demo:sync`.
10. Run `npm test`, `npm run check:install`, `npm run check:launch`, `npm run check:surface`, `npm run check:walkthrough`, `npm run smoke`, and
    `npm pack --dry-run`.

Command output should stay predictable:

- default text output is for humans
- `--json` output is for agents, tests, and scripts
- writes should be explicit through flags such as `--write`, `--from`, or
  lifecycle commands
- local path handling should reject paths outside the repo
- generated files should include next commands when another step is expected

## Contribution Checklist

Before opening a PR:

- Keep the core behavior provider-neutral.
- Add or update tests for CLI/API/MCP behavior changes.
- Keep README, docs, CLI help, and MCP tools aligned.
- Keep the implementation stack TypeScript-first; `npm run check:stack` must
  pass before release.
- Keep npm package metadata consistent; `npm run check:package` must pass before
  release.
- Keep installed package bins and exports runnable; `npm run check:install` must
  pass before release.
- Keep public launch docs and metadata policy current; `npm run check:launch`
  must pass before release.
- Keep CLI and MCP surface docs synchronized; `npm run check:surface` must pass
  before release.
- Keep the public demo walkthrough runnable; `npm run check:walkthrough` must
  pass before release.
- Run `npm run demo:sync` when built-in example repo behavior changes.
- Avoid rewriting unrelated files or generated user data.
- Run `npm test`.
- Run `npm run smoke` when CLI, MCP, packaging, or workflow behavior changes.
- Run `npm pack --dry-run` if package contents changed.

## Protocol Changes

Protocol changes should be conservative. When changing repo layout, file
formats, review behavior, or source-reference rules:

- update `docs/protocol.md`
- update `AGENTS.md` if agent behavior changes
- add regression tests in `tests/repo.test.ts`
- keep old repos readable when possible

## MCP Changes

Every new core operation that is useful to agents should usually have:

- a CLI command
- a core API export from `src/index.ts`
- a stdio MCP tool in `src/mcp.ts`
- coverage in `tests/mcp.test.ts`

Keep MCP tools thin. They should wrap the same deterministic core functions as
the CLI instead of introducing separate behavior.

## Documentation Changes

Docs are part of the product surface. When a behavior changes, check whether
these files need updates:

- `README.md`: positioning, first-run commands, and command list
- `docs/examples.md`: copy-pasteable walkthroughs
- `docs/quickstart.md`: guided first-use flow
- `docs/protocol.md`: repo contract and command semantics
- `docs/mcp.md`: MCP tool surface
- `docs/architecture.md`: command layers and project boundaries
- `docs/roadmap.md`: milestone status
- `docs/release-checklist.md`: manual release gates

Do not let docs describe a path that `npm run smoke` or tests cannot exercise
at least in spirit. The ten-minute agent draft walkthrough is protected by
`npm run check:package`.

## Reporting Issues

Please include:

- the command you ran
- the repo layout or a minimal fixture
- expected behavior
- actual output
- Node.js and `kforge` versions
