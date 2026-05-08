# ProofPack Product Brief

## Register

Product. Design serves a technical workflow: prove what an AI agent did, inspect the evidence, and share only the evidence that should leave the room.

## Product Purpose

ProofPack creates portable cryptographic receipts for AI agent runs. A pack records ordered events, policy decisions, Merkle inclusion proofs, signatures, trust metadata, and optional disclosure openings so another engineer or auditor can verify the run offline.

## Primary Users

- AI engineers building agent runtimes, internal tools, and autonomous workflows.
- Security reviewers who need evidence that agent actions matched policy.
- Open-source maintainers who want a lightweight, inspectable verification format.
- Platform teams evaluating whether agent activity can be audited before enterprise rollout.

## Core Jobs

- Generate or receive a `.proofpack.zip`.
- Verify authenticity, integrity, policy hashes, disclosure openings, trust, timestamp anchors, and append-only history.
- Triage failures quickly, with enough detail to know whether the pack is malformed, tampered with, untrusted, or merely permissive.
- Inspect event timelines, decisions, signatures, and Merkle proof paths without needing to read raw JSON first.
- Build a public disclosure pack that replaces payloads with commitments and records derivation from the source receipt.

## Voice

Precise, calm, and technical. No hype. Say what is proven, what is untrusted, and what changed. Prefer concrete verbs: verify, inspect, derive, disclose, compare, export.

## Anti-References

- Generic dark SaaS dashboards.
- Purple/blue AI gradients.
- Glassmorphism used as decoration.
- Oversized marketing heroes that delay the actual verifier.
- Fake metrics, fake customer logos, and ornamental proof language.

## Strategic Principle

The product should feel like a security instrument: fast to scan, hard to misunderstand, and obviously engineered by people who care about evidence.
