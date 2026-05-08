# Contributor Architecture Map

ProofPack is a pnpm monorepo. The core rule is simple: proof logic lives in `@proofpack/core`; surfaces call core and render the result.

## Package Boundaries

| Area | Path            | Responsibility                                                                                      |
| ---- | --------------- | --------------------------------------------------------------------------------------------------- |
| Core | `packages/core` | schemas, canonicalization, hashing, Merkle proofs, signing, redaction, archive safety, verification |
| CLI  | `packages/cli`  | terminal UX for demo, verify, and diff                                                              |
| API  | `apps/api`      | Fastify service for local and deployment use                                                        |
| Web  | `apps/web`      | Next.js Evidence Workbench and Next API routes                                                      |
| E2E  | `tests/e2e`     | browser workflows for the workbench                                                                 |

## Rules

- Do not duplicate cryptographic logic outside `packages/core`.
- Do not shell out for zip handling in web or API routes.
- Keep error payloads stable: `{ ok, error: { code, message, hint } }`.
- Add regression tests for any bug involving crypto, archive parsing, policy decisions, or disclosure openings.
- Keep UI changes aligned with `PRODUCT.md` and `DESIGN.md`.

## Verification Gates

Run these before submitting broad changes:

```bash
pnpm check
pnpm test
pnpm build
pnpm web:css:check
pnpm e2e
```
