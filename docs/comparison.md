# Comparison

`kforge` sits in an awkward but useful gap: it is not a note app, not a hosted
AI app platform, not a vector database, and not a RAG framework. It is a
filesystem protocol plus deterministic tooling for making LLM-maintained
Markdown knowledge repos reviewable.

The closest mental model is:

```text
Obsidian-friendly repo contract + agent handoff CLI + provenance checks
```

The README diagram shows the basic loop: source evidence enters `raw/`, agents
compile or answer from it, useful outputs become review artifacts, and accepted
changes land back in `wiki/` or `claims/`.

## Short Version

Use `kforge` when you want:

- durable Markdown knowledge instead of disposable chat answers
- original evidence protected under `raw/`
- compiled wiki pages under `wiki/`
- claim and review artifacts that make provenance visible
- generated answers and task packs that can be filed back into the repo
- CLI/MCP tools that prepare context for any LLM without requiring a provider

Do not use `kforge` as:

- a replacement for Obsidian
- a replacement for Notion or team wiki/workspace tools
- a hosted AI workflow builder
- an out-of-the-box chat-with-docs app
- a semantic search or vector database
- a GraphRAG implementation
- a LangChain/LlamaIndex-style application framework

## Project Boundaries

| Project type | Examples | What they optimize for | How `kforge` differs |
| --- | --- | --- | --- |
| Markdown/PKM app | Obsidian | writing, linking, local note navigation, plugins | `kforge` treats the vault as a protocol-driven repo that agents can inspect, score, and maintain. Obsidian can be the frontend. |
| Workspace/wiki app | Notion | collaborative docs, databases, project spaces, hosted sharing | `kforge` keeps state in a local Markdown repo and focuses on agent-safe provenance, review flow, and file-based automation. |
| AI app builder | Dify | visual workflows, RAG apps, agents, model ops, deployment | `kforge` does not host apps or call models. It prepares files, reviews, context packs, and checks for any agent or model. |
| Chat-with-docs app | AnythingLLM, Khoj | conversational access to documents, assistants, local/cloud model use | `kforge` focuses on durable outputs that become wiki pages, claims, and reviews rather than only answering in chat. |
| Graph/RAG system | Microsoft GraphRAG | graph-based retrieval and generation over text datasets | `kforge` has wiki backlinks and provenance checks, but it is not a retrieval algorithm or graph index. |
| LLM app framework | LangChain, LlamaIndex | building LLM-powered applications and agents | `kforge` can provide the repo layer and handoff artifacts those agents operate on; it is not the orchestration framework itself. |

## Compared With Obsidian

Obsidian describes itself as a private and flexible app for thoughts, stores
notes locally as Markdown files, and emphasizes links, graph navigation, plugins,
and open file formats: <https://obsidian.md/>.

`kforge` deliberately does not compete with that. The intended pairing is:

- Obsidian: human-facing IDE for reading and navigating the repo
- `kforge`: protocol, CLI, MCP server, indexes, source checks, review flow
- LLM agent: compiler and researcher operating through files and commands

If you already like Obsidian, `kforge` gives agents a safer way to work inside
an Obsidian-friendly vault without silently rewriting everything.

## Compared With Dify

Dify positions itself around production-ready AI agents, agentic workflows, RAG
pipelines, integrations, observability, and deployment:
<https://dify.ai/>.

`kforge` is much lower-level:

- no visual workflow builder
- no hosted app runtime
- no model gateway
- no observability dashboard
- no built-in RAG service

Instead, it keeps the durable state in files. A Dify app could read from or write
to a `kforge` repo, but `kforge` itself is the repo contract and review protocol,
not the app platform.

## Compared With AnythingLLM

AnythingLLM presents itself as an all-in-one AI desktop application for chatting
with documents, using agents, and working locally/offline with many models and
document types: <https://anythingllm.com/>.

`kforge` does not try to be the chat interface. It is more concerned with what
happens after a useful answer exists:

```text
answer -> outputs/ -> review -> wiki/ or claims/
```

AnythingLLM can be a user-facing AI app. `kforge` is the auditable Markdown repo
that useful AI work can accumulate into.

## Compared With Khoj

Khoj describes itself as an open source personal AI that can answer using shared
files, search notes with natural language, understand Markdown/PDF/plaintext and
other sources, and run via cloud or self-hosting: <https://docs.khoj.dev/>.

`kforge` is less assistant-like and more protocol-like:

- it does not maintain a chat persona
- it does not decide which model to use
- it does not need a server
- it does not hide state behind an application database

It gives assistants like Khoj, Codex, Claude Code, or local agents a filesystem
contract for durable work.

## Compared With GraphRAG

Microsoft's GraphRAG project is a modular graph-based Retrieval-Augmented
Generation system: <https://github.com/microsoft/graphrag>.

`kforge` may produce graphs such as wiki backlinks, orphan pages, broken links,
and review/source relationships, but these are repo-health and navigation
signals. They are not a GraphRAG retrieval pipeline.

You might use both:

- GraphRAG: retrieval strategy over a corpus
- `kforge`: durable Markdown repo, provenance artifacts, review lifecycle,
  outputs that can be filed back into the wiki

## Compared With LangChain And LlamaIndex

LangChain and LlamaIndex are frameworks for building LLM-powered applications,
agents, workflows, and context-augmented systems.

`kforge` is not trying to replace them. It is a persistence and protocol layer:

- LangChain/LlamaIndex can orchestrate model/tool calls.
- `kforge` can provide repo-local context, search, inspection, task packs,
  answer packs, compile briefs, review artifacts, and health checks.

## Why This Boundary Matters

The product bet behind `kforge` is that knowledge work should accumulate in a
durable, inspectable repo.

Most AI tools optimize for answering now. `kforge` optimizes for making the
answer add up later.
