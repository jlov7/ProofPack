# Threat Model Review — 2026-03

## Scope

- `@proofpack/core` generation and verification
- `@proofpack/api` upload/verify/redact endpoints
- `@proofpack/web` verification and disclosure UX
- Release and supply-chain workflows

## Assets

1. Pack integrity and authenticity guarantees
2. Signing key confidentiality
3. Policy/decision immutability
4. Disclosure commitment integrity
5. Build/release artifact trust

## Trust Boundaries

1. Untrusted upload boundary (`.zip` input)
2. Trust boundary between signed receipt and local manifest/policy artifacts
3. Boundary between private payloads and public disclosure pack
4. CI/supply-chain boundary (dependency intake)

## Primary Threats and Mitigations

| Threat                        | Impact                      | Mitigation                                                                      |
| ----------------------------- | --------------------------- | ------------------------------------------------------------------------------- |
| Zip-slip on uploads           | File overwrite / escape     | Entry path normalization + rejection in zip utils                               |
| Receipt tampering             | False verification          | Ed25519 signature check over RFC8785 canonicalized signed block                 |
| Event log mutation/reordering | Audit forgery               | RFC6962 Merkle root + inclusion checks                                          |
| Policy/decision swaps         | Compliance evasion          | SHA-256 hashes bound in signed receipt                                          |
| Disclosure forgery            | False public claims         | Commitment verification with strict salt checks and duplicate-opening rejection |
| API abuse flood               | Availability degradation    | Rate limiting and payload-size enforcement                                      |
| Unauthorized API use          | Untrusted access            | Optional bearer-token auth mode                                                 |
| Supply-chain drift            | Unknown legal/security risk | License allowlist gate + vulnerability policy gate + SBOM generation            |

## Residual Risks

1. Private key compromise remains out-of-scope for software-only mitigations.
2. No external timestamp anchoring yet (`R12` open).
3. No key revocation/distributed trust registry yet (`R10`/`R11` open).
4. Automated CI execution is limited by private-repo billing constraints.

## Review Outcome

- Current posture: acceptable for controlled/private release.
- Public release blockers still open: key lifecycle hardening, anchoring, extended scale/perf evidence.
