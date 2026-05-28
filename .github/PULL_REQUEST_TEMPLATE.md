## Summary

What changed?

## Verification

- [ ] `npm test`
- [ ] `npm run smoke`
- [ ] `npm pack --dry-run` if package contents changed
- [ ] Docs updated when CLI/MCP/protocol behavior changed
- [ ] `npm run check:install` still passes if package bins, exports, or
      install behavior changed
- [ ] `npm run check:launch` still passes if package metadata or launch docs
      changed
- [ ] `npm run check:package` still passes if package metadata changed
- [ ] `npm run check:surface` still passes if CLI help, README commands, or
      MCP tools changed
- [ ] `npm run check:walkthrough` still passes if the demo, agent draft, review,
      or health-check flow changed
- [ ] `npm run check:release` still passes if release docs, governance files,
      or package contents changed
- [ ] `npm run check:stack` still passes if implementation files changed
- [ ] `npm run demo:sync` was run if built-in example behavior changed

## Protocol Impact

Does this change repo layout, file formats, review flow, source references, or
agent rules?

## Notes

Anything reviewers should pay attention to?
