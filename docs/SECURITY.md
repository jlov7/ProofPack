# ProofPack — Security

This document describes ProofPack's security model, threat model, cryptographic assumptions, known limitations, and how to report vulnerabilities.

---

## Table of Contents

- [Security Model](#security-model)
- [Threat Model](#threat-model)
  - [In Scope](#in-scope)
  - [Out of Scope](#out-of-scope)
- [Cryptographic Assumptions](#cryptographic-assumptions)
- [Verification Guarantees](#verification-guarantees)
- [Attack Scenarios and Mitigations](#attack-scenarios-and-mitigations)
- [Input Validation](#input-validation)
- [Policy Engine Security](#policy-engine-security)
- [Selective Disclosure Security](#selective-disclosure-security)
- [Known Limitations](#known-limitations)
- [Reporting a Vulnerability](#reporting-a-vulnerability)

---

## Security Model

ProofPack provides **post-hoc verifiability** for AI agent runs. Its security model is:

> **Given a ProofPack bundle and a public key, any verifier can determine — without trusting ProofPack, the agent, or any online service — whether the bundle was produced by the holder of the corresponding private key, whether the event log has been tampered with since signing, and whether the policy decisions recorded in the bundle match the policy that was committed to at signing time.**

This is a strong claim. It is supported by:

1. **Ed25519 signatures** over a canonical serialization of the Merkle root and policy hashes
2. **RFC 6962 Merkle trees** that make any modification to the event log detectable
3. **SHA-256 hashes** of the policy document and decision log, bound into the signed receipt
4. **Zod schema validation** at every trust boundary to prevent malformed input from reaching cryptographic operations

What ProofPack does **not** claim:

- It does not claim that the agent's actions were beneficial or correct — only that the log faithfully represents what the agent did
- It does not claim that the policy was appropriate for the context — only that it was applied consistently
- It does not provide real-time enforcement — it provides post-hoc auditability

---

## Threat Model

### In Scope

ProofPack is designed to resist the following adversaries:

#### Adversary 1: Pack Tamperer

An attacker who obtains a `.proofpack` bundle and modifies it to hide or alter agent actions before presenting it to a verifier.

**Mitigation:** The Ed25519 signature covers the Merkle root. Modifying any event changes the leaf hash, which changes the root, which invalidates the signature (Check 2 and Check 3 both fail). Recomputing a valid signature requires the private key.

#### Adversary 2: Event Injector

An attacker who adds events to a legitimate log — either fabricating actions that didn't happen or re-ordering events to change the apparent sequence of decisions.

**Mitigation:** The Merkle root is computed from all events in order. Adding, removing, or reordering events changes the root. Any modification invalidates the signature.

#### Adversary 3: Policy Swapper

An attacker who replaces the policy file with a more permissive policy to hide that the agent violated constraints, while keeping the event log intact.

**Mitigation:** `SHA-256(policy.yml)` is stored in the `signed_block` and covered by the Ed25519 signature. Replacing `policy.yml` changes this hash, which invalidates the signature (Check 5 fails).

#### Adversary 4: Decision Fabricator

An attacker who modifies `decisions.jsonl` to change recorded allow/deny decisions.

**Mitigation:** `SHA-256(decisions.jsonl)` is stored in the `signed_block` and covered by the signature. Any change invalidates the signature (Check 5 fails).

#### Adversary 5: Zip-Slip Attacker

An attacker who crafts a malicious `.zip` file with paths like `../../etc/passwd` to write files outside the intended extraction directory.

**Mitigation:** Every zip entry path is checked before extraction:
```typescript
const normalized = path.normalize(entryPath);
if (path.isAbsolute(normalized) || normalized.startsWith('..')) {
  throw new ZipSlipError(entryPath);
}
```
Malicious paths are rejected before any bytes are written to disk.

#### Adversary 6: Schema Injection Attacker

An attacker who sends a malformed or extra-field JSON document to the API, hoping to cause unexpected behavior in the verification pipeline.

**Mitigation:** All untrusted input is Zod-validated before it is used as a typed value. Extra fields are stripped by Zod's `strip` mode (the default). Malformed documents throw a `ZodError` before reaching any crypto operations, and the API returns a structured 400 response.

### Out of Scope

The following are explicitly outside ProofPack's threat model:

- **Key compromise.** If the private key used to sign a pack is compromised, the attacker can sign arbitrary packs as that key. Key management is the responsibility of the pack producer. ProofPack does not provide a PKI or key rotation mechanism.
- **Malicious pack producer.** ProofPack cannot detect a pack produced by a malicious agent that faithfully records its own bad behavior — it only proves the record hasn't been altered after the fact.
- **Side channels.** Timing attacks, power analysis, and other physical side channels are not in scope for a software-only TypeScript implementation.
- **Denial of service.** The API has a 50MB upload limit, but ProofPack is not designed as a hardened public service.
- **Browser/OS compromise.** If the verifier's machine is compromised, all bets are off.

---

## Cryptographic Assumptions

ProofPack's security rests on the following standard assumptions:

| Assumption | Hardness | Notes |
|-----------|---------|-------|
| Ed25519 EU-CMA | Discrete log over Curve25519 | 128-bit security level |
| SHA-256 collision resistance | Pre-image/second-preimage hardness | 128-bit security for collision, 256-bit for pre-image |
| SHA-256 pseudo-random function | Random oracle model | Used for Merkle domain separation and commitment scheme |
| RFC 8785 determinism | Correctness of `canonicalize` library | Implementation risk, not cryptographic |

**Algorithm choices:**

- **Ed25519** over ECDSA: Ed25519 signatures are deterministic (no random nonce), making them safer against poor randomness. The `@noble/ed25519` library has been independently audited.
- **SHA-256** over SHA-3: SHA-256 is more widely implemented, making it easier for independent verifiers to write their own verification tools. There is no known practical attack against SHA-256.
- **RFC 8785** over ad-hoc serialization: A published standard with a reference implementation eliminates the risk of implementation-specific serialization differences causing signature mismatches.

---

## Verification Guarantees

When `verifyPack()` returns `{ verified: true }`, the following statements are true:

1. **The pack structure is well-formed.** All required fields are present with the correct types (Check 1).
2. **The signed_block is authentic.** An entity holding the private key corresponding to `receipt.signature.public_key` produced this pack. Nobody else can produce a valid signature (Check 2).
3. **The event log is complete and unmodified.** The events in `events.jsonl` are exactly the events that were present when the pack was signed — no more, no fewer, in the same order (Check 3 + Check 4).
4. **Each event's position is provable.** The inclusion proof for each event independently confirms it is part of the committed tree (Check 4).
5. **The policy was not swapped.** The `policy.yml` file is the same document that was present when the pack was signed (Check 5).
6. **The decisions were not altered.** The `decisions.jsonl` file is the same document that was present when the pack was signed (Check 5).
7. **Revealed payloads match their commitments.** If `openings.json` is present, each revealed payload is consistent with its commitment (Check 6).

When `verifyPack()` returns `{ verified: false }`, the output includes `checks` with the specific failed check and an error message explaining what was expected vs. what was found.

---

## Attack Scenarios and Mitigations

### "Can an attacker forge a valid proof for a fake event?"

No. Adding a fake event to `events.jsonl` changes the Merkle root. Producing a receipt with the new root requires signing it with the private key, which the attacker doesn't have.

### "Can an attacker replay a valid pack with a different public key?"

The receipt contains the public key (`receipt.signature.public_key`). The verifier checks the signature against this specific key. Swapping the public key changes the bytes of `signed_block` (the signature covers the whole block), which invalidates the signature. Swapping only the `sig` field requires inverting Ed25519, which is computationally infeasible.

### "Can an attacker create a pack that passes checks 1 and 5 but fails check 2?"

Check 2 (signature verification) is the root of trust. If the signature check passes, the signed_block is authentic. Checks 3, 4, and 5 verify that the on-disk files match the values committed to in the signed_block. The only way to pass all checks is to have the private key.

### "What if the attacker modifies the receipt's public key and regenerates the signature with their own key?"

The verifier's public key is obtained out-of-band (e.g., from the agent's documented key, from a trusted registry). If the verifier checks the pack against the expected public key (not just any valid key), this attack fails. ProofPack's verification report always displays the public key — it is the verifier's responsibility to confirm it matches the expected producer.

### "What about the manifest? It's not covered by the signature."

The manifest is protected transitively: the receipt is part of the pack, the receipt hash is stored in `manifest.artifact.receipt_sha256`, and the receipt is signed. If an attacker modifies the manifest and keeps the original receipt, the `manifest.artifact.receipt_sha256` field will no longer match the receipt — a careful verifier will notice. If the attacker also updates this field, the receipt signature check will fail (the signed_block doesn't cover the manifest, but the manifest's claimed receipt hash can be cross-checked).

---

## Input Validation

All data from untrusted sources is validated with Zod before use:

| Source | Validation |
|--------|-----------|
| `manifest.json` | `ManifestSchema.parse()` |
| `receipt.json` | `ReceiptSchema.parse()` |
| `events.jsonl` (each line) | `EventSchema.parse()` (per line) |
| `decisions.jsonl` (each line) | `DecisionSchema.parse()` (per line) |
| `policy.yml` | `PolicySchema.parse()` (after YAML parse) |
| HTTP multipart upload | Size limit + zip-slip check + schema validation |

Zod's default behavior strips unknown fields (`strip` mode). This means extra fields added by an attacker are silently dropped before the data reaches any business logic. Malformed fields throw a `ZodError` with a precise error path.

---

## Policy Engine Security

The policy engine has one deliberate security property beyond the obvious:

**Path traversal is rejected at the matcher level, not just the producer level.**

When a `path_glob` rule evaluates `event.payload.path`, it checks for `..` before calling `micromatch`:

```typescript
if (path.includes('..')) {
  return false; // never match, fall through to next rule
}
```

This means even a misconfigured permissive rule like `path_glob: "**"` will not match a path traversal event. The event falls through to default-deny. This is defense-in-depth: the producer should also validate paths, but the policy engine independently blocks them.

**Rule evaluation is deterministic and side-effect-free.** The policy engine reads from the event and policy; it writes nothing. Evaluation order is strictly top-to-bottom with first-match-wins. There is no global state, no caching, and no external I/O. This makes the engine trivially auditable.

---

## Selective Disclosure Security

### Commitment scheme

```
commitment = SHA-256(RFC8785(payload) ‖ random_32_byte_salt)
```

**Security properties:**

- **Binding:** Given a commitment, it is computationally infeasible to find a different `(payload, salt)` pair that produces the same commitment (SHA-256 collision resistance).
- **Hiding:** Given only a commitment, no information about the payload can be extracted (SHA-256 pre-image resistance + 256-bit entropy from the salt).
- **Non-malleability:** The commitment is over `RFC8785(payload)` (canonical bytes), not `JSON.stringify(payload)`. This prevents a redactor from producing a different-but-equivalent payload (e.g., different key ordering) that still hashes to the same commitment.

### Salt generation

Salts must be generated from a cryptographically secure random number generator. In Node.js, `crypto.randomBytes(32)` provides CSPRNG bytes. A weak PRNG would allow an attacker to predict or enumerate salts, breaking the hiding property.

### What a public pack reveals

In a public (redacted) pack:
- **Event type, timestamp, and actor** are always visible
- **The count of events** is visible
- **The Merkle tree structure** is visible (reveals event ordering)
- **The policy decisions** are visible (allow/deny/hold per event)
- **Individual payload content** is hidden behind commitments

A public pack does not reveal what was in a payload, but it does reveal that an event of that type occurred at that time with that decision. A sophisticated analyst could infer some payload content from the event type and decision (e.g., a `fs.read` with `decision: deny` at a timestamp was likely a path traversal attempt). This is expected behavior — the disclosure mechanism hides payload *content*, not event *metadata*.

---

## Known Limitations

### Key management is out of scope

ProofPack does not provide key distribution, rotation, or revocation. The private key that signs a pack must be securely stored by the pack producer. If the key is compromised, an attacker can sign arbitrary packs as that producer. ProofPack has no equivalent of a CRL or OCSP.

**Mitigation:** Users who require key management should use an external PKI or hardware security module (HSM) for key storage and implement a key rotation policy.

### Timestamps are not verified

ProofPack records the timestamps provided by the agent. It does not verify that these timestamps are accurate or monotonically increasing. An agent that records false timestamps will produce a pack that passes verification.

**Mitigation:** A future check (`timestamp.ordering`) could verify that event timestamps are non-decreasing. This would not prevent timestamp fabrication, but it would detect obvious manipulation.

### The pack producer controls what events are logged

ProofPack verifies that the log it receives hasn't been tampered with *after signing*. It cannot detect events that were never logged in the first place. An agent that simply doesn't emit an event for a sensitive action will produce a pack that verifies correctly.

**Mitigation:** This is inherent to any post-hoc logging system. Independent monitoring, kernel-level auditing, or hardware attestation would be required to guarantee complete event capture.

### SHA-256 is not quantum-resistant

Post-quantum attacks on SHA-256 and Ed25519 are theoretical at present, but a sufficiently powerful quantum computer could break Ed25519 (via Shor's algorithm) and reduce SHA-256 security to 128 bits (via Grover's algorithm). This is a general limitation of current cryptographic practice.

**Mitigation:** The pack format includes a `schema_version` field. A future migration to a post-quantum signature scheme (e.g., ML-DSA / CRYSTALS-Dilithium) could be implemented as a schema version bump without breaking the overall design.

---

## Reporting a Vulnerability

If you discover a security vulnerability in ProofPack, please report it responsibly.

**Do not open a public GitHub issue for security vulnerabilities.**

Instead, please email the details to the repository owner directly. Include:

1. A description of the vulnerability
2. Steps to reproduce (proof-of-concept code if applicable)
3. The potential impact (what an attacker could achieve)
4. Any suggested mitigations

You will receive an acknowledgment within 48 hours. We ask that you give us reasonable time to investigate and release a fix before public disclosure.

### What to include in a report

A good vulnerability report includes:
- **Affected component:** `packages/core`, `apps/api`, `apps/web`, or other
- **Attack type:** e.g., signature bypass, zip-slip, schema injection, policy bypass
- **Reproduction:** A minimal code snippet or test that demonstrates the vulnerability
- **Impact:** What an attacker can achieve and under what conditions
- **Severity estimate:** Low / Medium / High / Critical

### Scope

| Target | In Scope |
|--------|---------|
| Cryptographic verification logic | ✅ |
| Policy engine bypass | ✅ |
| Zip-slip or path traversal | ✅ |
| Schema injection / prototype pollution | ✅ |
| API authentication / authorization | ✅ |
| Third-party dependencies (via dependabot) | ✅ |
| Denial of service with large uploads | Limited scope |
| Social engineering / phishing | ❌ |
| Physical access attacks | ❌ |

---

*This document is maintained alongside the codebase. If you find any inaccuracies or gaps, please open an issue or PR.*
