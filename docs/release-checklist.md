# Release Checklist

Use this checklist before publishing a `kforge` release.

## Preflight

- Confirm the release still matches the project direction:
  TypeScript-first, local-first, provider-neutral, Markdown-first, repo
  protocol first.
- Release direction summary: TypeScript-first, local-first, provider-neutral,
  Markdown-first, repo protocol first.
- Confirm README positioning still says what `kforge` is not: not a RAG
  framework, not an Obsidian plugin, not a hosted AI app, and not a model
  wrapper.
- README positioning summary: not a RAG framework, not an Obsidian plugin, not
  a hosted AI app, and not a model wrapper.
- Run the stack check and confirm no Python runtime or implementation files have
  entered the core project.
- Run `npm run check:install` to verify the packed package installs into a clean
  project and its installed bins and ESM API run the demo agent loop.
- Run `npm run check:launch` to verify launch docs and public package metadata
  policy. Run `npm run check:launch -- --strict` only after the real GitHub repo
  exists and package metadata has been added.
- Run `npm run check:surface` to verify CLI help, README command listings, MCP
  tool registrations, and `docs/mcp.md` stay aligned.
- Run `npm run check:walkthrough` to verify the public demo agent loop reaches
  review apply, agent finish, refresh, and a clean doctor check.
- Review `docs/quickstart.md` and `docs/protocol.md` for narrative command
  drift.
- Check `CHANGELOG.md` and `docs/release-notes-0.1.md`.
- Review `docs/publishing.md` and confirm public package metadata points to the
  real repository, or is intentionally absent until the repository exists.
- Review `docs/launch-readiness.md` before the first public GitHub or npm
  publish.
- Confirm `SECURITY.md` and `CODE_OF_CONDUCT.md` still match the public
  repository contact and governance model.

## Verify

```bash
npm ci
npm run demo:sync
npm test
npm run check:install
npm run check:launch
npm run check:package
npm run check:stack
npm run check:surface
npm run check:walkthrough
npm run check:release
npm run smoke
node dist/src/cli.js --help
node dist/src/mcp.js --help
demo=$(mktemp -d)
node dist/src/cli.js init "$demo" --example
node dist/src/cli.js ci "$demo" --json --min-score 80
node dist/src/cli.js refresh "$demo"
node dist/src/cli.js agent next "$demo" --agent release-agent --json
node dist/src/cli.js agent step "$demo" --agent release-agent --json
node dist/src/cli.js agent draft "$demo" --agent release-agent --json
node -e "import('kforge').then((m) => console.log(Boolean(m.initRepo)))"
npm pack --dry-run
```

Smoke test a fresh repo:

```bash
demo=$(mktemp -d)
node dist/src/cli.js init "$demo" --example
node dist/src/cli.js context "$demo"
node dist/src/cli.js refresh "$demo"
node dist/src/cli.js ask "$demo" --question "How does provenance work?" --query provenance --write
node dist/src/cli.js output list "$demo" --json
node dist/src/cli.js output inspect "$demo" --file "outputs/$(date -u +%F)-how-does-provenance-work-answer-pack.md" --json
node dist/src/cli.js promote "$demo" --file "outputs/$(date -u +%F)-how-does-provenance-work-answer-pack.md" --target wiki/Answer.md --source raw/llm-knowledge-bases.md --json
node dist/src/cli.js refresh "$demo"
```

## Package Contents

Check that `npm pack --dry-run` includes:

- `dist/src`
- `dist/scripts`
- `examples/demo-repo`
- `README.md`
- `LICENSE`
- `AGENTS.md`
- `CHANGELOG.md`
- `CODE_OF_CONDUCT.md`
- `CONTRIBUTING.md`
- `SECURITY.md`
- `docs/`
- `docs/release-notes-0.1.md`

It should not include:

- `node_modules/`
- local scratch repos
- temporary generated tarballs

## Publish

Follow [docs/publishing.md](publishing.md). Only publish when the package name,
npm account, repository metadata, and security contact are intentionally
configured.
