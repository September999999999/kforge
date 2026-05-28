# Security Policy

`kforge` is local-first software for working with files on your machine. The
project does not currently operate a hosted service, collect telemetry, or call
LLM providers from core commands.

## Supported Versions

`kforge` is pre-1.0. Security fixes are currently targeted at the latest
unreleased `0.1.x` line.

## Reporting A Vulnerability

Please report security issues privately before opening a public issue.

If there is no published security contact yet, open a GitHub security advisory
for the repository. If advisories are not available, contact the maintainer
through the repository owner profile and include:

- affected command or API
- operating system and Node.js version
- steps to reproduce
- whether the issue requires a malicious knowledge repo, malicious source file,
  or normal user input
- any files that are unexpectedly read, written, executed, or exposed

Do not include private source documents, personal knowledge repos, tokens, API
keys, or proprietary data in the first report. Use small synthetic examples
where possible.

## Security Model

Core commands should be deterministic and local by default:

- no mandatory network access
- no mandatory LLM provider calls
- no mandatory vector database
- no Python runtime scripts
- no execution of files found inside a knowledge repo

`kforge` treats knowledge repos as data. A repo may contain untrusted Markdown,
source documents, code snippets, URLs, and generated outputs. Commands should
inspect and transform those files without running them.

Repo-local paths are checked against both normalized paths and existing real
paths. Symlinks that resolve outside the configured knowledge repo are treated
as outside-repo access and should be rejected for inspection, promotion, source
reference checks, and review application.

`kforge doctor` also scans the canonical repo directories for symlinks that
resolve outside the repo, even when those symlinks are not currently referenced
by a wiki page, claim, review, or output.

## In Scope

Examples of security issues that matter for this project:

- path traversal outside the target knowledge repo
- unexpected overwrite or deletion of user files
- command injection through CLI arguments, file names, frontmatter, or source
  metadata
- MCP tool behavior that exposes files outside the configured repo
- accidental network access in core commands
- unsafe handling of symlinks, generated outputs, review targets, or source
  references
- prompt or instruction templates that tell agents to ignore repo boundaries or
  provenance rules

## Out Of Scope

These are usually not project vulnerabilities by themselves:

- an LLM provider producing a bad answer when a user separately asks it to read
  repo files
- a user intentionally executing arbitrary code that exists inside `raw/`
- malicious content in a source document that affects an external viewer,
  browser, editor, or Obsidian plugin outside `kforge`
- problems in third-party tools that a user wires into their own workflow

## Maintainer Expectations

When changing file access, review application, MCP tools, source ingest, or
future network features:

- add regression tests for repo boundary checks
- include symlink escape cases when a command reads or writes repo-local paths
- keep generated edits reviewable before they land in `wiki/` or `claims/`
- document any new command that can access the network
- preserve the TypeScript-first, no-Python core constraint
