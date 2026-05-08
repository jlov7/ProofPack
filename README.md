<div align="center">

<pre>
██████╗ ██████╗  ██████╗  ██████╗ ███████╗██████╗  █████╗  ██████╗██╗  ██╗
██╔══██╗██╔══██╗██╔═══██╗██╔═══██╗██╔════╝██╔══██╗██╔══██╗██╔════╝██║ ██╔╝
██████╔╝██████╔╝██║   ██║██║   ██║█████╗  ██████╔╝███████║██║     █████╔╝
██╔═══╝ ██╔══██╗██║   ██║██║   ██║██╔══╝  ██╔═══╝ ██╔══██║██║     ██╔═██╗
██║     ██║  ██║╚██████╔╝╚██████╔╝██║     ██║     ██║  ██║╚██████╗██║  ██╗
╚═╝     ╚═╝  ╚═╝ ╚═════╝  ╚═════╝ ╚═╝     ╚═╝     ╚═╝  ╚═╝ ╚═════╝╚═╝  ╚═╝
        portable cryptographic receipts for AI agent runs
</pre>

**Verify what an agent did. Prove the evidence was not rewritten. Share only what should leave the room.**

[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-15-000000?logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![pnpm](https://img.shields.io/badge/pnpm-workspace-F69220?logo=pnpm&logoColor=white)](https://pnpm.io/)
[![License](https://img.shields.io/badge/license-MIT-22c55e)](./LICENSE)

</div>

## What ProofPack Does

ProofPack turns an AI agent run into a portable evidence bundle:

- ordered event log
- per-event policy decisions
- RFC 6962 Merkle audit tree
- Ed25519 signed receipt
- optional trust store, timestamp anchor, append-only history, and threshold signatures
- selective disclosure commitments for public sharing

A verifier can inspect the pack offline. No ProofPack server is trusted. The math checks out or it does not.

## 60-Second Quickstart

```bash
git clone https://github.com/jlov7/ProofPack.git
cd ProofPack
pnpm install
pnpm demo
pnpm verify -- examples/sample_runs/latest.proofpack
```

Expected result:

```text
ProofPack Verification Report
VERIFIED
```

Launch the workbench:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000), select **Try demo pack**, then inspect report, timeline, proofs, policy, disclosure, and exports.

## Pack Format

```text
.proofpack/
├── manifest.json
├── receipt.json
├── events/
│   └── events.jsonl
├── policy/
│   ├── policy.yml
│   └── decisions.jsonl
└── audit/
    ├── merkle.json
    └── inclusion_proofs/
        └── {event_id}.json
```

Redacted public projections replace event payloads with `payload_commitment` and record derivation metadata in the signed block:

```json
{
  "kind": "redaction_projection",
  "source_run_id": "...",
  "source_receipt_sha256": "...",
  "payload_mode": "payload_commitments",
  "signer_policy": "ephemeral_projection_signer"
}
```

## Interfaces

### CLI

```bash
pnpm verify -- examples/sample_runs/latest.proofpack
pnpm verify -- examples/sample_runs/latest.proofpack -- --json
pnpm verify -- examples/sample_runs/latest.proofpack -- --profile strict --trust-store config/trust-store.example.json
pnpm diff -- examples/sample_runs/latest.proofpack examples/sample_runs/latest.proofpack
```

### Web Workbench

The Next.js workbench supports:

- standard, strict, and permissive verification profiles
- trust-store JSON validation
- failure explainers and next-step hints
- timeline inspection
- signature and Merkle proof views
- public disclosure generation
- compliance report exports

### API

```bash
curl http://localhost:3000/api/demo-pack --output demo.proofpack.zip
curl -F "file=@demo.proofpack.zip" http://localhost:3000/api/verify
curl -F "file=@private.proofpack.zip" http://localhost:3000/api/redact --output public.proofpack.zip
```

API errors use a stable shape:

```json
{
  "ok": false,
  "error": {
    "code": "ZIP_SLIP",
    "message": "Zip entry escapes extraction root"
  }
}
```

## Verification Checks

| Check                  | What it proves                                                        |
| ---------------------- | --------------------------------------------------------------------- |
| `manifest.schema`      | Manifest and receipt match supported schema versions                  |
| `receipt.signature`    | Signed block was produced by the stated Ed25519 key or threshold keys |
| `receipt.trust`        | Optional signer trust-store requirements pass                         |
| `merkle.root`          | Event bytes produce the signed Merkle root                            |
| `merkle.inclusion_all` | Every event has a valid inclusion proof                               |
| `policy.hash`          | Policy and decisions match the signed hashes                          |
| `disclosure.openings`  | Optional openings reveal exactly the committed payloads               |
| `timestamp.anchor`     | Optional timestamp evidence is valid and not before creation          |
| `history.consistency`  | Optional append-only history reference is consistent                  |

## Architecture

```text
agent runtime
    │ structured events
    ▼
@proofpack/core
    ├─ policy evaluation
    ├─ canonical JSON
    ├─ Merkle tree
    ├─ signing and verification
    ├─ disclosure commitments
    └─ hardened archive parsing
    │
    ├─ @proofpack/cli
    ├─ @proofpack/api
    └─ @proofpack/web
```

Core verification is shared by CLI, API, and web. The delivery surface changes, the proof logic does not.

## Security Model

ProofPack detects tampering after capture. It does not prove that every real-world action was captured. For stronger capture guarantees, pair it with runtime instrumentation, kernel audit logs, sandbox telemetry, or hardware-backed attestation.

Primary defenses:

- RFC 8785 canonicalization before signing
- RFC 6962 domain-separated Merkle hashing
- Ed25519 signatures with optional multisig threshold
- trust-store validation and key lifecycle metadata
- zip-slip, entry-count, decompressed-size, and compression-ratio guards
- selective disclosure commitments with random salts

Read the full model in [docs/SECURITY.md](./docs/SECURITY.md) and [docs/security/threat-model-2026-03.md](./docs/security/threat-model-2026-03.md).

## Development

```bash
pnpm check
pnpm test
pnpm build
pnpm web:css:check
pnpm e2e
pnpm release:check
```

Important packages:

- `packages/core`: crypto, pack format, archive safety, redaction, verification
- `packages/cli`: terminal commands
- `apps/api`: Fastify API
- `apps/web`: Next.js evidence workbench

## Project Docs

- [Architecture](./docs/ARCHITECTURE.md)
- [Contributor Architecture Map](./docs/CONTRIBUTOR_ARCHITECTURE.md)
- [Web Workbench README](./apps/web/README.md)
- [Pack v1 Spec](./docs/specs/proofpack-pack-v1-spec.md)
- [Release Checklist](./docs/RELEASE_CHECKLIST.md)
- [Publishing Notes](./docs/PUBLISHING.md)
- [Frontier Revamp Burn-Down](./docs/FRONTIER_BURNDOWN.md)
- [Roadmap](./ROADMAP.md)
- [Contributing](./CONTRIBUTING.md)
- [Support](./SUPPORT.md)

## Status

ProofPack is pre-1.0. The core verifier is already heavily tested, but public APIs and pack compatibility should still be treated as release-candidate quality until the v1.0 tag.
