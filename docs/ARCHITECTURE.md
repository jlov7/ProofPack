# ProofPack — Architecture

This document describes the internal design of ProofPack: why things are structured the way they are, the cryptographic protocols, the data model, and the trade-offs made during design.

---

## Table of Contents

- [System Overview](#system-overview)
- [Monorepo Structure](#monorepo-structure)
- [Data Model](#data-model)
- [Cryptographic Protocol](#cryptographic-protocol)
  - [Ed25519 Signing](#ed25519-signing)
  - [RFC 8785 Canonicalization](#rfc-8785-canonicalization)
  - [Merkle Tree (RFC 6962)](#merkle-tree-rfc-6962)
  - [Policy Hashing](#policy-hashing)
  - [Selective Disclosure Commitments](#selective-disclosure-commitments)
- [Verification Pipeline](#verification-pipeline)
- [Policy Engine](#policy-engine)
- [Pack Format](#pack-format)
- [Web Application](#web-application)
- [API Layer](#api-layer)
- [Key Design Decisions](#key-design-decisions)

---

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        AI Agent Runtime                          │
│  (Claude Code, AutoGPT, LangChain agent, custom tool runner)    │
└───────────────────────────┬─────────────────────────────────────┘
                            │  emits structured events (NDJSON)
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                      @proofpack/core                             │
│                                                                  │
│  ┌──────────────┐   ┌──────────────┐   ┌────────────────────┐  │
│  │ Policy Engine│   │ Merkle Builder│   │  Ed25519 Signer    │  │
│  │  (YAML rules)│   │  (RFC 6962)  │   │  (@noble/ed25519)  │  │
│  └──────┬───────┘   └──────┬───────┘   └─────────┬──────────┘  │
│         │                  │                      │             │
│         └──────────────────┴──────────────────────┘             │
│                            │                                     │
│                    ┌───────▼────────┐                           │
│                    │ Pack Generator │                            │
│                    │  (assembles    │                            │
│                    │  all artifacts)│                            │
│                    └───────┬────────┘                           │
└────────────────────────────┼────────────────────────────────────┘
                             │
                    .proofpack/ bundle
                             │
          ┌──────────────────┼────────────────────┐
          │                  │                    │
          ▼                  ▼                    ▼
   @proofpack/cli      @proofpack/api       @proofpack/web
   (verify, demo)    (Fastify REST)      (Next.js 15 UI)
```

The key insight is that **all verification logic lives in `@proofpack/core`**. The CLI, API, and web app are thin delivery vehicles — they all invoke the same `verifyPack()` function and display the results. This means a verification result from the CLI is identical to one from the web UI.

---

## Monorepo Structure

ProofPack is a **pnpm workspace** monorepo:

```
proofpack/
├── packages/
│   ├── core/        @proofpack/core   — crypto + pack format (no HTTP, no UI)
│   └── cli/         @proofpack/cli    — Commander CLI for demo generation + verification
├── apps/
│   ├── api/         @proofpack/api    — Fastify API (local dev, testing)
│   └── web/         @proofpack/web    — Next.js 15 UI + Next.js API routes (production)
└── tests/
    └── e2e/                           — Playwright cross-browser E2E tests
```

**Dependency constraint:**

```
@proofpack/core       ← no internal dependencies
@proofpack/cli        ← depends on @proofpack/core
@proofpack/api        ← depends on @proofpack/core
@proofpack/web        ← depends on @proofpack/core
```

`@proofpack/core` has zero knowledge of HTTP, file system (beyond pack loading), or UI. This makes it embeddable in any context — browser, Node.js, Deno, or a future WebAssembly target.

---

## Data Model

### Event

The atomic unit of a ProofPack. Every action an agent takes produces one event:

```typescript
interface Event {
  event_id: string;           // UUID v4, globally unique
  ts: string;                 // ISO 8601 timestamp (UTC)
  type: string;               // "run.start" | "fs.read" | "shell.exec" | ...
  actor: string;              // agent identifier
  payload: Record<string, unknown>;  // event-specific data
  payload_commitment?: string; // SHA-256 hex — present in public packs
}
```

When a pack is **redacted** (made public), the `payload` field is replaced with `payload_commitment`. The commitment is `SHA-256(canonical(payload) ‖ salt)`. Without the salt, the commitment cannot be reversed.

### Manifest

Top-level metadata for the pack:

```typescript
interface Manifest {
  schema_version: "1.0";
  run_id: string;             // UUID v4, identifies this run
  created_at: string;         // ISO 8601
  producer: {
    name: string;             // e.g. "proofpack-demo"
    version: string;          // semver
  };
  event_count: number;
  artifact: {
    events_sha256: string;    // SHA-256 of events.jsonl bytes
    receipt_sha256: string;   // SHA-256 of receipt.json bytes
    manifest_sha256: string;  // deliberately empty — avoids circular hash
  };
}
```

The `manifest_sha256` field is always the empty string. This is intentional: including the hash of the manifest in the manifest itself would require solving a fixed-point equation. The manifest is not part of the signed block, so its integrity is protected transitively through the receipt signature.

### Receipt

The cryptographic heart of the pack:

```typescript
interface SignedReceipt {
  signed_block: {
    run_id: string;
    merkle_tree: {
      root_hash: string;       // hex
      tree_size: number;
    };
    policy: {
      policy_sha256: string;   // SHA-256 of policy.yml bytes
      decisions_sha256: string; // SHA-256 of decisions.jsonl bytes
    };
  };
  signature: {
    algorithm: "Ed25519";
    public_key: string;        // base64
    sig: string;               // base64 — Ed25519(RFC8785(signed_block))
  };
}
```

The `signed_block` is serialized with RFC 8785 canonical JSON before signing. This prevents signature malleability from key reordering.

---

## Cryptographic Protocol

### Ed25519 Signing

**Library:** `@noble/ed25519` v2 (with `@noble/hashes/sha512` sync shim)

Ed25519 was chosen over ECDSA for several reasons:

- **Deterministic.** Ed25519 signatures are deterministic — the same private key + message always produces the same signature. ECDSA requires a random nonce and nonce reuse is catastrophic.
- **Small keys and signatures.** 32-byte public key, 64-byte signature.
- **Fast.** Ed25519 verification is fast enough that verifying thousands of proofs is imperceptible.
- **Audited implementation.** `@noble/ed25519` has been independently audited and is used in production by major projects.
- **Isomorphic.** Runs identically in Node.js and the browser.

**Signing flow:**

```
1. Serialize signed_block as canonical JSON (RFC 8785)
2. Encode to UTF-8 bytes
3. ed25519.sign(privateKey, bytes) → 64-byte signature
4. base64-encode signature and public key → store in receipt.json
```

**Verification flow:**

```
1. Decode signature and public key from base64
2. Re-serialize signed_block as canonical JSON
3. ed25519.verify(publicKey, signature, canonicalBytes) → boolean
```

### RFC 8785 Canonicalization

**Library:** `canonicalize` npm package (reference implementation)

JSON has no canonical form. Two JSON documents representing the same object may differ in key ordering, whitespace, or number formatting. This means `JSON.stringify` alone is not safe to sign — the signer and verifier might produce different byte sequences.

RFC 8785 (JSON Canonicalization Scheme) defines a deterministic serialization:

- Keys sorted in Unicode code point order (recursive)
- No whitespace
- Numbers serialized in a specific format (integers as integers, floats in exponential notation when needed)
- Unicode escapes normalized

```typescript
// Before signing
const canonicalBytes = canonicalize(signedBlock); // always the same bytes
const sig = ed25519.sign(privateKey, canonicalBytes);
```

### Merkle Tree (RFC 6962)

**Algorithm:** RFC 6962 (Certificate Transparency) Merkle tree

The Merkle tree provides an **unforgeable, ordered log** of all events. Given the root hash, it is cryptographically infeasible to:

- Add an event without changing the root
- Remove an event without changing the root
- Reorder events without changing the root
- Modify an event without changing the root

**Leaf hash:**

```
leafHash(event) = SHA-256(0x00 ‖ canonical(event))
```

The `0x00` prefix is the RFC 6962 "leaf domain separator" — it prevents a second-preimage attack where an attacker could construct an internal node hash that collides with a leaf hash.

**Node hash:**

```
nodeHash(left, right) = SHA-256(0x01 ‖ left ‖ right)
```

The `0x01` prefix is the RFC 6962 "node domain separator".

**Tree construction (for n leaves):**

```
Split at k = largest power of 2 less than n:
  root = nodeHash(
    hashSubtree(leaves[0..k]),   // left subtree
    hashSubtree(leaves[k..n])    // right subtree
  )
```

This produces a balanced binary tree (not necessarily complete) that matches the RFC 6962 specification used by Google Certificate Transparency and the Trillian log framework.

**Inclusion proof:**

An inclusion proof for leaf `i` in a tree of `n` leaves is a sequence of sibling hashes that, when combined with the leaf hash in the correct order, reproduce the root hash. The proof size is O(log n).

```
Verifier:
1. Compute leafHash(canonical(event))
2. Walk proof hashes, applying nodeHash at each level
3. Compare final hash to root_hash in receipt
```

### Policy Hashing

The policy document (`policy.yml`) and all policy decisions (`decisions.jsonl`) are bound to the receipt via SHA-256 hashes stored in `signed_block.policy`:

```
policy_sha256   = SHA-256(bytes of policy.yml)
decisions_sha256 = SHA-256(bytes of decisions.jsonl)
```

This ensures that:
1. The policy cannot be swapped out — any change to `policy.yml` invalidates the receipt.
2. The decisions cannot be altered — any change to `decisions.jsonl` invalidates the receipt.
3. Both are verified together with the Merkle tree, meaning the policy, events, and decisions are cryptographically bound into a single artifact.

### Selective Disclosure Commitments

When a pack is made public, individual event payloads are replaced with cryptographic commitments:

```
commitment = SHA-256(canonical(payload) ‖ random_32_byte_salt)
```

To reveal a payload later, the holder releases an **opening**: `{ payload, salt }`. Anyone can verify:

```
SHA-256(canonical(payload) ‖ fromBase64(salt)) === commitment
```

The salt serves two purposes:

1. **Randomness.** A 32-byte random salt means the commitment is indistinguishable from random even if the payload is completely predictable (e.g., `{"exit_code": 0}`).
2. **Prevents rainbow tables.** Without the salt, an attacker could precompute `SHA-256(canonical(payload))` for every possible payload and look up the commitment. The salt makes this attack infeasible.

Unrevealed commitments are information-theoretically binding — no information about the payload leaks from the commitment alone (assuming a pre-image-resistant hash function).

---

## Verification Pipeline

`verifyPack(pack: PackContents): VerificationReport` runs six independent checks in sequence:

```
Check 1: manifest.schema
  → Zod-validate manifest.json and receipt.json against their schemas
  → Rejects malformed or missing fields before any cryptographic work

Check 2: receipt.signature
  → RFC8785-serialize signed_block
  → Ed25519-verify the signature against the serialized bytes
  → Rejects any tampering with the signed_block fields

Check 3: merkle.root
  → For each event in events.jsonl: canonical(event) → leafHash → tree
  → computeRoot(leafHashes) must equal signed_block.merkle_tree.root_hash
  → Rejects: added events, removed events, reordered events, modified events

Check 4: merkle.inclusion_all
  → For each event's inclusion proof in proofs/
  → verifyInclusion(proof, leafHash, root) must be true
  → Proves each event is individually included in the committed tree

Check 5: policy.hash
  → SHA-256(policy.yml bytes) must equal signed_block.policy.policy_sha256
  → SHA-256(decisions.jsonl bytes) must equal signed_block.policy.decisions_sha256
  → Rejects: swapped policy, modified decisions

Check 6: disclosure.openings  [skipped if no openings.json present]
  → For each opening: SHA-256(canonical(payload) ‖ salt) must equal payload_commitment
  → Proves revealed payloads match their public commitments
```

Each check returns `{ name, ok, details?, error? }`. A pack is `verified: true` only when all checks return `ok: true`. A single failure sets `verified: false` with the error message describing exactly which check failed and why.

---

## Policy Engine

The policy engine provides **real-time authorization decisions** for each event. The engine is deliberately simple:

1. Iterate rules in order (top-to-bottom)
2. For each rule, evaluate all `when` conditions (ALL must match)
3. First match wins → return that rule's `decision`, `severity`, and `reason`
4. If no rule matches → return the policy's `defaults.decision` (always `deny`)

**Matchers:**

| Matcher | Type | Evaluation |
|---------|------|-----------|
| `event_type` | string | Exact match against `event.type` |
| `tool` | string | Exact match against `event.payload.tool` |
| `path_glob` | string | `micromatch.isMatch(event.payload.path, glob)` |
| `contains` | string | Substring of `JSON.stringify(event.payload)` |

**Security property: path traversal blocking in the engine.** If a `path_glob` rule would match, but `event.payload.path` contains `..`, the match is rejected. This means even a permissive glob like `workspace/**` will not match `workspace/../secrets.env` — path traversal attempts always fall through to default-deny.

**Example policy (YAML):**

```yaml
version: "1.0"
defaults:
  decision: deny

rules:
  - id: allow-workspace-reads
    when:
      event_type: fs.read
      path_glob: "workspace/**"
    decision: allow
    severity: low
    reason: "Workspace reads permitted"

  - id: deny-net-http
    when:
      event_type: net.http
    decision: deny
    severity: high
    reason: "Network access not permitted"
```

---

## Pack Format

A `.proofpack` directory has the following layout:

```
run-<uuid>.proofpack/
├── manifest.json          ← top-level metadata
├── receipt.json           ← Ed25519-signed Merkle root + policy hashes
├── events.jsonl           ← NDJSON: one event per line (ordered)
├── decisions.jsonl        ← NDJSON: one policy decision per event
├── policy.yml             ← the policy that was applied
├── openings.json          ← [optional] selective disclosure openings
└── proofs/
    ├── <event_id>.proof.json   ← inclusion proof for each event
    └── ...
```

Packs can be distributed as a directory or as a `.zip` file. The zip format is identical to the directory — no additional metadata is added by the zip wrapper.

**Why NDJSON for events and decisions?** NDJSON (newline-delimited JSON) is append-friendly and streamable. Each line is an independent JSON object, so a reader can process events one at a time without loading the entire file. It also makes diff-friendly version control for event logs possible.

**Why YAML for policy?** YAML is more human-readable than JSON for rule lists. The policy is read by humans (to audit what an agent was permitted to do) as often as by machines. YAML is validated by a Zod schema after parsing, so the human-readability doesn't compromise correctness.

---

## Web Application

The web UI is a **Next.js 15 App Router** application with the following architectural decisions:

### State Management

[Zustand](https://zustand-demo.pmnd.rs/) manages cross-screen state:

```typescript
interface PackStore {
  pack: PackContents | null;
  report: VerificationReport | null;
  selectedEvent: string | null;  // event_id

  loadPack: (file: File) => Promise<void>;
  loadDemoPack: () => Promise<void>;
  selectEvent: (id: string | null) => void;
  clearPack: () => void;
}
```

A single Zustand store holds the loaded pack and report. Navigating between screens (Report → Timeline → Proofs) doesn't reload data — it reads from the store.

### Server vs. Client Components

The Next.js App Router default is React Server Components (RSC). ProofPack uses `"use client"` only where necessary:

| Component | Strategy | Reason |
|-----------|----------|--------|
| Layout, nav | Server | Static shell, no interactivity |
| DropZone | Client | File drag-drop API |
| EventList | Client | Zustand subscription, virtual scroll |
| MerkleViz | Client | SVG interaction, animation state |
| CommandPalette | Client | Key listener, open/close state |
| StatusChip | Client | Animation, Zustand subscription |

### API Routes

In production (Vercel deployment), the Next.js API routes in `apps/web/src/app/api/` serve all requests:

```
POST /api/verify    ← multipart upload → verifyPack() → VerificationReport JSON
GET  /api/demo-pack ← generate demo pack → stream as .zip
POST /api/redact    ← multipart upload → redactPack() → public pack .zip
```

These routes import directly from `@proofpack/core` — no separate API process is needed in production. The standalone Fastify API (`apps/api`) remains for local development and CLI tooling.

### Virtualized Event List

`@tanstack/react-virtual` is used for the timeline event list. The virtualized list renders only the events that are currently visible in the viewport, regardless of how many events are in the pack. This means a pack with 100,000 events is as performant as a pack with 13.

### Interactive Merkle Tree

The Merkle tree visualization (`MerkleViz.tsx`) is a custom SVG renderer:

1. The tree is laid out as a balanced binary tree with depth calculated from `Math.ceil(Math.log2(n))`
2. Nodes are positioned with a recursive layout algorithm
3. On leaf click, the inclusion proof path is computed and CSS classes are applied to highlight the path from leaf → root
4. The animation is a CSS transition — nodes light up in sequence using a stagger delay

---

## API Layer

The Fastify API (`apps/api`) is a testable server factory:

```typescript
// buildServer() returns a Fastify instance — no side effects, no port binding
export async function buildServer(): Promise<FastifyInstance> { ... }

// Tests use inject() — no real HTTP
const app = await buildServer();
const res = await app.inject({ method: 'POST', url: '/api/verify', ... });
```

This pattern makes all route tests deterministic and fast — no port conflicts, no race conditions, no real network I/O.

### File Upload Security

All multipart uploads go through:

1. **Size limit:** 50MB hard limit, enforced at the transport layer before the body is parsed
2. **Zip-slip protection:** Every zip entry path is validated with:
   ```typescript
   const normalized = path.normalize(entryPath);
   if (path.isAbsolute(normalized) || normalized.startsWith('..')) {
     throw new Error(`Zip-slip attempt: ${entryPath}`);
   }
   ```
3. **Schema validation:** After extraction, every file is Zod-validated before use as a typed value
4. **Temp file cleanup:** All uploaded files are written to OS temp and deleted after the request completes

---

## Key Design Decisions

### Why not X.509 certificates?

PKI with certificate chains was considered and rejected. X.509 requires a CA infrastructure. ProofPack's threat model is simpler: an agent publishes a pack signed with its own keypair, and the consumer verifies against the known public key. There's no need for a CA.

### Why not content addressing (IPFS/CAS)?

Content-addressed storage addresses distribution and deduplication. ProofPack addresses integrity and policy. These are orthogonal — a ProofPack could be stored in IPFS, but IPFS alone doesn't give you Ed25519 authorship, policy decisions, or selective disclosure.

### Why not blockchain?

Blockchain offers public append-only logs with distributed consensus. ProofPack offers **offline verification** — no network access, no consensus, no ongoing infrastructure cost. A ProofPack bundle is self-contained: it can be verified 10 years from now with no external dependencies.

### Why RFC 6962 and not a simpler Merkle tree?

RFC 6962 is the Merkle tree specification used by Certificate Transparency, the most battle-tested public Merkle log in existence. Using a well-specified, well-analyzed algorithm means:

1. The security properties are published and peer-reviewed
2. Interoperability with CT tooling is possible
3. The proof size and format are well-understood

### Why separate policy from events?

A single JSONL file of events-with-decisions was considered. Separating them serves two purposes:

1. **Independent auditability.** The events file answers "what happened." The decisions file answers "what was permitted." A security reviewer can audit the policy separately from the events.
2. **Policy replay.** The same event log can be re-evaluated against a different policy. The original decisions are preserved as evidence, but the event log itself is policy-neutral.

### Why default-deny?

The policy engine's default — when no rule matches an event — is always `deny`. This is the secure default: an agent that does something unexpected is blocked, not silently permitted. A policy with no rules produces all-deny decisions, not all-allow.
