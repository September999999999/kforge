# Launch Readiness

Use this checklist when turning the local `kforge` prototype into a public
GitHub repository and npm package.

## Public Targets

- GitHub repository: `https://github.com/<owner>/kforge`
- npm package: `kforge`
- issue tracker: `https://github.com/<owner>/kforge/issues`
- README homepage: `https://github.com/<owner>/kforge#readme`

Do not publish placeholder metadata. Add package metadata only after the real
repository exists.

## External Checks

Recheck the npm name immediately before publishing:

```bash
npm view kforge name version description repository homepage bugs --json
```

Expected before the first publish: npm returns 404/not found, or confirms the
package is controlled by the intended account. The result can change over time,
so treat older checks as stale.

Confirm the real GitHub repository exists and is public before adding package
metadata:

```bash
git ls-remote https://github.com/<owner>/kforge.git
```

## Package Metadata

After the public repo exists, add real values to `package.json`:

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

Then run the strict launch gate:

```bash
npm run check:launch -- --strict
```

The non-strict launch check is allowed to pass while repository metadata is
intentionally absent. The strict check is for the final publish moment.

## Final Local Gate

```bash
npm ci
npm test
npm run check:install
npm run check:package
npm run check:surface
npm run check:walkthrough
npm run check:launch
npm run check:launch -- --strict
npm run check:release
npm run smoke
npm pack --dry-run
```

## Publish

Only publish from the intended npm account:

```bash
npm adduser --registry=https://registry.npmjs.org/
npm run release:npm
```

`release:npm` publishes to npmjs, verifies the installed package from the
registry in a fresh temporary project, then creates the `v0.1.0` GitHub Release.
You can rerun the final checks separately if needed:

```bash
npm run check:published
npm run release:github
```
