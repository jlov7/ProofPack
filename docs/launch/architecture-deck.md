# ProofPack Architecture Deck

## Slide 1: Problem

- AI agents execute high-impact actions with weak auditability.
- Traditional logs are mutable and hard to verify independently.

## Slide 2: Product Thesis

- Every run should produce a portable, tamper-evident proof artifact.
- Verification must work offline and independently of ProofPack servers.

## Slide 3: Core Cryptographic Model

- Canonical event serialization (RFC 8785)
- Merkle tree root over event stream
- Ed25519 signature over signed receipt block
- Hash-anchored manifest over all artifacts

## Slide 4: Pack Structure

- `manifest.json`
- `receipt.json`
- `events/events.jsonl`
- `policy/policy.yml`
- `policy/decisions.jsonl`
- `audit/merkle.json`
- `audit/inclusion_proofs/*`

## Slide 5: Verification Pipeline

- Schema validation
- Signature verification (single or multi-signature threshold)
- Merkle root and inclusion checks
- Policy hash consistency
- Optional disclosure openings
- Optional trust/timestamp/history checks (strict profile)

## Slide 6: Security Controls

- Trust store (active/retired/revoked key lifecycle)
- Optional strict verification profile
- Zip-slip and malformed input protections
- SBOM + dependency policy gates
- Release attestation + reproducible build check

## Slide 7: Interfaces

- Core SDK (`@proofpack/core`)
- CLI (`verify`, `demo`, `diff`)
- API (verify/redact/demo/metrics)
- Web UI (verification workflow + export/compliance templates)

## Slide 8: Go-to-Production Path

- Container deployment (`Dockerfile`, `docker-compose.yml`)
- Host deployment examples (`docs/deployment/providers.md`)
- Reusable GitHub Action for external verification

## Slide 9: Launch Gate

- `pnpm release:check`
- `pnpm policy:deps`
- `pnpm sbom:generate`
- `pnpm release:attest && pnpm release:attest:verify`
- `pnpm repro:check`
