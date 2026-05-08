# Publishing Notes

ProofPack is not published as public npm packages yet. This file records the intended release posture.

## Packages

- `@proofpack/core`: publish first. It is the API other runtimes should embed.
- `@proofpack/cli`: publish after core API shape stabilizes.
- `@proofpack/web` and `@proofpack/api`: remain deployable apps, not general-purpose libraries.

## Pre-Publish Gate

```bash
pnpm release:check
pnpm policy:deps
pnpm sbom:generate
pnpm release:artifacts
pnpm release:attest
pnpm release:attest:verify
pnpm repro:check
```

## Versioning

Before `1.0.0`, public APIs may change. After `1.0.0`, pack format compatibility must follow the versioning contract in `docs/specs/proofpack-pack-v1-spec.md`.

## Package Contents

Exclude generated test output, local artifacts, `.env` files, `.codex`, and starter-pack source material. Include specs, security docs, examples, and license metadata.
