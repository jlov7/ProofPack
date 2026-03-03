# Launch Package (2026-03)

## Included Artifacts

- Architecture deck: `docs/launch/architecture-deck.md`
- Benchmarks: `docs/launch/benchmarks-2026-03.md`
- Security artifacts:
  - `docs/security/threat-model-2026-03.md`
  - `docs/security/security-review-2026-03.md`
- Deployment guides:
  - `docs/deployment/docker.md`
  - `docs/deployment/providers.md`

## Required Release Commands

```bash
pnpm release:check
pnpm policy:deps
pnpm sbom:generate
pnpm release:artifacts
pnpm release:attest
pnpm release:attest:verify
pnpm repro:check
```

## External Integrations

- Reusable GitHub Action:
  - `docs/integrations/github-action.md`
- Runtime SDK examples:
  - `docs/integrations/runtime-sdk-examples.md`

## Pre-Public Checklist

- Verify no local-only files are staged (`git status --short`).
- Ensure `artifacts/release/` is excluded from git unless intentionally publishing signed bundles.
- Record release tag + attestation outputs in release notes.
