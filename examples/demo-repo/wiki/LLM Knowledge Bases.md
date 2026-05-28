---
title: LLM Knowledge Bases
status: draft
kind: concept
sources:
  - raw/llm-knowledge-bases.md
confidence: medium
---

# LLM Knowledge Bases

LLM knowledge bases treat a research folder like a source-controlled knowledge
repo. Humans collect source material, while agents help compile the material
into linked Markdown pages.

## Core Loop

1. Put original evidence in `raw/`.
2. Compile readable pages in `wiki/`.
3. Capture durable assertions in `claims/`.
4. Stage risky changes in `reviews/`.
5. Save useful handoff artifacts in `outputs/`.
6. Regenerate indexes and run `kforge doctor`.

## Related

- [[Provenance]]
