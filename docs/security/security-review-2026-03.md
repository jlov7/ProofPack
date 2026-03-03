# ProofPack Security Review (2026-03)

## Scope

- Core cryptographic verification pipeline
- API upload/decompression and trust-boundary handling
- Supply-chain controls (audit, SBOM, license policy)
- Release integrity controls (artifact signing + reproducibility)

## Method

1. Unit and integration tests across `packages/core`, `packages/cli`, and `apps/api`
2. Malformed input testing (loader fuzz + malformed zip upload tests)
3. Manual review of key lifecycle and trust-store behavior
4. Verification of release integrity scripts (`release:attest`, `release:attest:verify`, `repro:check`)

## Findings

### High Severity

- None open.

### Medium Severity

- None open.

### Low Severity

- API malformed-zip test surfaces upstream `unzip` stderr noise; behavior is safe but logs can be noisy.

## Controls Confirmed

- Ed25519 signature verification with optional multi-signature threshold.
- Trust-store based key allowlisting with retired/revoked key handling.
- Optional strict profile requiring trust and timestamp anchor checks.
- Append-only history consistency checks for chained packs.
- Zip extraction hardening with traversal checks + constrained temp permissions.
- Dependency policy gate + SBOM generation.
- Release artifact attestation and signature verification.
- Reproducible build check with deterministic build id.

## Residual Risk

- No external TSA/CT-log validation yet; timestamp anchor currently validates format and ordering only.
- Trust store governance (who updates keys and revocations) must be handled operationally.

## Recommendation

Proceed to pre-release with strict profile enabled in regulated environments and a managed trust-store update process.
