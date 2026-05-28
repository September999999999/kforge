# Publishing

This project is prepared for npm publication, but public repository metadata should only be added when the real repository location is known.

## Package Metadata

Before the first public publish, update `package.json` with real values:

```json
{
  "repository": {
    "type": "git",
    "url": "git+https://github.com/<owner>/kforge.git"
  },
  "bugs": {
    "url": "https://github.com/<owner>/kforge/issues"
  },
  "homepage": "https://github.com/<owner>/kforge#readme"
}
```

Do not add placeholder repository, bugs, funding, or homepage URLs to the
published package. Incorrect metadata is worse than absent metadata because npm,
GitHub, and package managers will route users to the wrong place.

## Publish Gate

Run the full local gate:

```bash
npm ci
npm test
npm run check:install
npm run check:launch
npm run check:package
npm run check:surface
npm run check:walkthrough
npm run check:release
npm run smoke
npm pack --dry-run
```

Before the final public publish, after creating the real GitHub repository and
adding `repository`, `bugs`, and `homepage` metadata, run:

```bash
npm run check:launch -- --strict
npm view kforge name version description repository homepage bugs --json
```

`npm test` already runs the TypeScript build, stack guard, package metadata
check, surface check, walkthrough check, and unit tests. `npm run check:install`
packs the project into a temporary tarball, installs it into a clean temporary
consumer project, and verifies the installed CLI bins plus public ESM API.
`npm run check:launch` verifies launch docs and public package metadata policy;
the strict mode requires real public repository metadata.
`npm run check:surface` verifies CLI help, README commands, MCP registrations,
and MCP docs stay aligned. `npm run check:walkthrough` runs the public demo
agent loop from draft through review apply, agent finish, refresh, and a clean
doctor check.
`npm run check:release` verifies release docs, metadata intent, generated
tarball hygiene, built files, and dry-run package contents. `npm run smoke`
builds again and exercises real CLI flows over temporary repos.

## Release Notes

Use `docs/release-notes-0.1.md` as the starting point for the first GitHub
Release or npm release description. It is intentionally value-oriented rather
than a raw command inventory; keep `CHANGELOG.md` as the detailed change log.

## Dry-Run Inspection

Check that `npm pack --dry-run` includes:

- `dist/src`
- `dist/scripts`
- `docs/`
- `docs/release-notes-0.1.md`
- `examples/demo-repo/`
- `README.md`
- `LICENSE`
- `AGENTS.md`
- `CHANGELOG.md`
- `CODE_OF_CONDUCT.md`
- `CONTRIBUTING.md`
- `SECURITY.md`

It should not include:

- `node_modules/`
- `tests/`
- ad-hoc demo repos outside `examples/demo-repo/`
- local scratch repos
- generated tarballs
- private source material

## Publish

Only publish from an intentional npm account:

```bash
npm version patch
npm publish
npm run check:published
npm run release:github
```

The package sets `publishConfig.access` to `public`, so the publish command does
not need `--access public`. It also sets `publishConfig.registry` to
`https://registry.npmjs.org/` so local mirror configuration does not redirect the
public publish.
