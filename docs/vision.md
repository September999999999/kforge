# Vision

`kforge` aims to become the open, local-first protocol and toolchain for
LLM-maintained knowledge repositories.

The north star is simple:

> Git for knowledge. CI for truth. Obsidian as IDE. LLM as compiler.

## Product Thesis

Most AI knowledge products optimize for chat over documents. That is useful,
but it often leaves the durable work behind in a transcript.

`kforge` optimizes for accumulation. A useful answer should become an output. A
good output should become a review. An accepted review should become a wiki page
or claim. Every important claim should keep a path back to source evidence.

The repo is the product surface:

```text
raw evidence -> compiled wiki -> claims -> reviews -> outputs -> indexes
```

More precisely, useful work should circulate: raw evidence informs wiki pages
and claims, generated outputs become review artifacts, accepted reviews update
wiki pages or claims, and deterministic indexes make the repo inspectable again.

Agents can maintain the repo, but they should do it through visible files,
repeatable commands, and reviewable artifacts.

## What The Project Is

`kforge` is:

- a filesystem protocol for source-grounded Markdown knowledge bases
- a TypeScript CLI for inspecting, indexing, asking, packing, and reviewing
- a stdio MCP server that lets agents use the same deterministic operations
- a future integration layer for Obsidian, editor agents, and local model tools
- a trust workflow for provenance, review debt, broken links, and drift

`kforge` is not:

- a hosted SaaS knowledge base
- a note-taking app replacement
- a required vector database
- a required LLM provider wrapper
- a GraphRAG implementation
- a Python framework

## Technical Stance

The baseline implementation is TypeScript on Node.js.

This choice keeps the project close to the environments where the workflow will
usually live: CLIs, MCP clients, Obsidian-adjacent tools, editor agents, npm
packages, and browser-facing integrations.

Rust is reserved for optional acceleration after there is measured evidence
that a hotspot needs it. Good candidates might include large-repo indexing,
fast search, content hashing, or graph analysis. Any Rust component should be an
optional package or binary with a TypeScript fallback path.

Python is intentionally outside the implementation stack. A knowledge repo can
index `.py` files as source evidence, but the core product should not require
Python scripts, Python packaging, notebooks, or a Python runtime.

## End State

The ideal mature version of `kforge` should let a user:

1. Drop sources into a local repo.
2. Ask an agent to compile and maintain a linked Markdown wiki.
3. Inspect all important proposed changes before they land.
4. Run health checks that measure provenance, link integrity, review debt, and
   stale knowledge.
5. File useful answers, reports, charts, and slides back into the repo.
6. Open the repo in Obsidian, Git, an editor agent, or a plain terminal.
7. Swap models, agents, and retrieval systems without changing the repo format.

If the project succeeds, the durable asset is not a chat session or a hosted
index. It is a knowledge repository that keeps getting better.
