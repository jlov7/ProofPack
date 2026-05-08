# ProofPack Web Workbench

`@proofpack/web` is the Next.js Evidence Workbench for ProofPack. It is designed as a security operator surface: load a pack, verify it, triage failures, inspect proof material, decide what can be disclosed, and export an audit-ready report.

## Product Contract

The web app must remain useful on the first viewport. It is not a landing page and it should not require an account, network service, or hosted database to verify a pack.

Primary workflow:

1. Load a `.proofpack.zip` bundle or use the demo pack.
2. Choose a verification profile: `standard`, `strict`, or `permissive`.
3. Optionally provide a trust-store JSON document.
4. Review the verification report and failure hints.
5. Inspect timeline events, policy decisions, Merkle proofs, signatures, and disclosure state.
6. Export the report or generate a public redaction projection.

## Local Development

From the repository root:

```bash
pnpm install
pnpm --filter @proofpack/web dev
```

Open [http://localhost:3000](http://localhost:3000).

The full stack is usually more representative:

```bash
pnpm dev
```

## Verification

Run these from the repository root before shipping frontend changes:

```bash
pnpm check
pnpm build
pnpm web:css:check
pnpm e2e
```

`pnpm e2e` builds the web app and runs Playwright against production `next start` output. This avoids dev-overlay artifacts in visual checks.

## Routes

| Route         | Purpose                                             |
| ------------- | --------------------------------------------------- |
| `/verify`     | Load pack, select profile, configure trust store    |
| `/report`     | Verification summary, check states, failure hints   |
| `/timeline`   | Event sequence and event-level inspection           |
| `/proofs`     | Merkle, signature, and proof-path views             |
| `/policy`     | Policy decisions and rule outcomes                  |
| `/disclosure` | Public projection builder and reveal-state summary  |
| `/export`     | Audit export and compliance-oriented report surface |

Next API routes:

| Route            | Purpose                           |
| ---------------- | --------------------------------- |
| `/api/demo-pack` | Generate a deterministic demo zip |
| `/api/verify`    | Verify uploaded pack zips         |
| `/api/redact`    | Build public redaction zips       |

The Next API routes share hardened archive and verifier logic from `@proofpack/core`.

## Design System

The frontend follows the Security Workbench direction in [../../DESIGN.md](../../DESIGN.md):

- precise, dense, calm, high-trust UI
- no purple-blue AI gradients or generic card grids
- no pure black or pure white tokens
- mono treatment for hashes, signatures, canonical bytes, and proof paths
- purposeful motion only, with full reduced-motion support
- mobile layout must avoid horizontal overflow at 375px

Tailwind v4 utilities are generated through `postcss.config.mjs`. The CSS regression gate checks for representative utilities so configuration drift is caught early.

## State and Data Flow

```text
user zip / demo pack
        │
        ▼
Next API route
        │ hardened archive parser + core verifier
        ▼
apps/web/src/lib/store.ts
        │
        ├─ report and failure hints
        ├─ event timeline and selected event
        ├─ trust/profile state
        └─ disclosure/export state
```

Keep product state in `apps/web/src/lib/store.ts` when multiple routes need it. Keep purely local interaction state inside the component that owns it.

## Accessibility and Motion

Frontend changes should preserve:

- keyboard-only demo verification
- visible focus states
- `aria-current` navigation state
- `aria-pressed` profile selector state
- reduced-motion behavior for transitions and animations
- readable error states without relying on color alone

The current coverage lives in `tests/e2e/accessibility-hardening.spec.ts` and `tests/e2e/visual-smoke.spec.ts`.

## Public Quality Bar

Do not ship frontend changes that:

- make the first viewport a marketing page instead of the verifier
- hide failed cryptographic checks behind generic error copy
- break the strict/permissive/standard profile model
- remove trust-store validation feedback
- create horizontal overflow on mobile
- make Tailwind utility generation optional
- rely on dev-only rendering behavior
