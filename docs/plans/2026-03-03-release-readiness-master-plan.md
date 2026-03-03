# ProofPack Release Readiness Master Plan

> Execution mode: exhaustive release gate hardening.  
> Scope: convert the full pre-release backlog into tracked, testable delivery work.  
> Status legend: `DONE`, `IN_PROGRESS`, `TODO`, `BLOCKED_EXTERNAL`.

## Release Definition

For this plan, "release-ready" means:

1. Core pack format and cryptographic guarantees are versioned and documented.
2. Tooling (CLI/API/Web) is production-hardened and verifiably stable.
3. Security, supply chain, and governance controls are in place.
4. Operational docs and launch artifacts are complete enough for public launch.

## Master Checklist

| ID  | Item                                                  | Acceptance Criteria                                                               | Status |
| --- | ----------------------------------------------------- | --------------------------------------------------------------------------------- | ------ |
| R01 | Publish `v1.0` pack spec and compatibility guarantees | Canonical spec doc with normative fields, constraints, and compatibility contract | DONE   |
| R02 | Schema migration test suite                           | Tests covering old/new schema acceptance/rejection and migration behavior         | DONE   |
| R03 | Deterministic fixture generation validation           | Repeated fixed-input generation yields deterministic expected outputs             | DONE   |
| R04 | Large-pack stress tests (100k+ events)                | Automated stress suite with defined performance budgets                           | DONE   |
| R05 | Memory ceiling verification                           | Tests assert upper memory bounds for CLI/API/Web verification flows               | DONE   |
| R06 | Fuzz tests for zip parsing and loader                 | Fuzz/property tests run in CI/manual gate without crashes                         | DONE   |
| R07 | Adversarial malformed input test suite                | Structured hostile inputs fail safely with stable error contracts                 | DONE   |
| R08 | Cryptographic negative-path tests expansion           | Key substitution/tamper/confusion tests added and passing                         | DONE   |
| R09 | Trusted key management flow                           | Verifier supports trust store and explicit trust decisions                        | DONE   |
| R10 | Key rotation metadata + behavior                      | Rotated keys supported with explicit metadata and tests                           | DONE   |
| R11 | Key revocation support                                | Revoked keys are rejected with clear diagnostics                                  | DONE   |
| R12 | Timestamp anchoring option                            | Optional trusted timestamp anchor included and validated                          | DONE   |
| R13 | Consistency proofs for append-only history            | Consistency proof generation and verification implemented                         | DONE   |
| R14 | Multi-signature receipts                              | Receipt format supports and verifies multi-signer attestations                    | DONE   |
| R15 | Verification policy profiles                          | Strict/standard/permissive profile execution paths exist and tested               | DONE   |
| R16 | Air-gapped verify smoke tests                         | Offline verification workflow tested/documented                                   | DONE   |
| R17 | API authenticated mode                                | Token/JWT auth mode implemented with secure defaults                              | DONE   |
| R18 | API rate limiting and abuse guards                    | Rate limits enforced with test coverage                                           | DONE   |
| R19 | Disclosure/openings integrity edge hardening          | Additional checks and tests for disclosure tamper scenarios                       | DONE   |
| R20 | Hardened temp-file lifecycle                          | Secure temp permissions/cleanup guarantees validated                              | DONE   |
| R21 | SBOM generation                                       | CycloneDX/SPDX generation integrated into release workflow                        | DONE   |
| R22 | Release artifact attestation/signing                  | Build artifacts signed and verifiable                                             | DONE   |
| R23 | Reproducible release builds                           | Build instructions and checks demonstrate reproducibility targets                 | DONE   |
| R24 | Dependency policy gates                               | License and vulnerability policy checks enforced                                  | DONE   |
| R25 | Containerized deployment path                         | Production Dockerfile + docs + healthcheck included                               | DONE   |
| R26 | Deployment examples                                   | Actionable deployment guides/examples for common hosts                            | DONE   |
| R27 | Single-command release gate                           | One command validates the full release gate                                       | DONE   |
| R28 | Changelog/release notes automation                    | Automated changelog workflow wired                                                | DONE   |
| R29 | Semantic version enforcement                          | Versioning policy validated in automation                                         | DONE   |
| R30 | Web onboarding wizard                                 | Guided first-run UX added to improve activation                                   | DONE   |
| R31 | Verification failure explainers                       | Human-readable actionable explanations for failed checks                          | DONE   |
| R32 | Pack diff capability                                  | CLI and/or Web can compare two packs with clear delta report                      | DONE   |
| R33 | Advanced search/filter persistence                    | Saved filters/search state persistence added                                      | DONE   |
| R34 | Compliance report templates                           | Exportable audit/compliance report templates available                            | DONE   |
| R35 | Runtime SDK examples                                  | Integration examples for major agent runtimes published                           | DONE   |
| R36 | Reusable GitHub Action for verify                     | Action published for external repos to verify packs                               | DONE   |
| R37 | CLI UX polish + JSON output mode                      | Machine-readable output and improved interactive UX                               | DONE   |
| R38 | Observability hooks                                   | Structured metrics/log hooks for deployments                                      | DONE   |
| R39 | Threat model + formal security review artifact        | Up-to-date threat model and review report committed                               | DONE   |
| R40 | Launch package                                        | Benchmarks, architecture deck, and deployment guide finalized                     | DONE   |

## Current Execution Strategy

This plan executes in four waves:

1. **Wave A: Foundations + release mechanics** (`R01`, `R02`, `R03`, `R21`, `R24`, `R25`, `R28`, `R29`)
2. **Wave B: Security + verification depth** (`R04`-`R20`, `R39`)
3. **Wave C: Product UX + integrability** (`R30`-`R38`)
4. **Wave D: Launch artifacts** (`R40`)

## Completion Status

- Date completed: 2026-03-03
- Outcome: all `R01`-`R40` items marked `DONE` with local command/test evidence.

## Tracking Rules

1. Every changed item must update this file (`Status` plus implementation note in commit).
2. No item may be marked `DONE` without command/test evidence.
3. If blocked by external providers/services, mark `BLOCKED_EXTERNAL` with specific blocker text.
