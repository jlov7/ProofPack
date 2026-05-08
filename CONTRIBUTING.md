# Contributing to ProofPack

ProofPack is a developer-first open-source security workbench for portable cryptographic receipts from AI agent runs. Contributions are welcome, but changes that touch the pack format, trust model, verifier, redaction, or archive handling need extra care.

## Start Here

Before opening a non-trivial PR:

1. Read [README.md](./README.md) for the product contract.
2. Read [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) for package boundaries.
3. Read [docs/SECURITY.md](./docs/SECURITY.md) and [docs/security/threat-model-2026-03.md](./docs/security/threat-model-2026-03.md) before touching cryptography, policy, archives, redaction, or trust stores.
4. Open an issue first for features, format changes, architecture changes, and anything that changes verifier behavior.

Small documentation fixes and focused bug fixes can go straight to a PR.

## Development Environment

| Tool    | Version | Notes                         |
| ------- | ------- | ----------------------------- |
| Node.js | >= 20   | Match `package.json#engines`  |
| pnpm    | 11.x    | Workspace package manager     |
| Git     | recent  | Required for release metadata |

```bash
git clone https://github.com/jlov7/ProofPack.git
cd ProofPack
pnpm install
pnpm demo
pnpm verify -- examples/sample_runs/latest.proofpack
pnpm dev
```

`pnpm dev` starts the Fastify API and Next.js workbench. The workbench is available at [http://localhost:3000](http://localhost:3000).

## Repository Map

```text
ProofPack/
├── packages/
│   ├── core/             # Pack format, verifier, archive safety, policy, crypto
│   └── cli/              # CLI commands: demo, verify, diff
├── apps/
│   ├── api/              # Fastify API routes for local/service use
│   └── web/              # Next.js Evidence Workbench and Next API routes
├── tests/e2e/            # Playwright production-workbench tests
├── docs/                 # Architecture, security, release, publishing, assets
├── config/               # Trust-store and dependency policy config
└── scripts/              # Release, SBOM, semver, CSS, and policy gates
```

Dependency direction is one-way: `apps/web`, `apps/api`, and `packages/cli` depend on `packages/core`. Core must not import application code.

## Quality Gates

Run the smallest relevant gate while iterating, then run the full release gate before requesting review.

```bash
pnpm check          # TypeScript, ESLint, Prettier
pnpm test           # Vitest unit/API/CLI/core suite
pnpm build          # Core, CLI, API, web production builds
pnpm web:css:check  # Tailwind utility generation regression
pnpm e2e            # Playwright against production Next output
pnpm release:check  # CI gate plus CLI sample-pack verification
```

Release and supply-chain gates:

```bash
pnpm policy:deps
pnpm audit --audit-level=moderate
pnpm stress:core
pnpm sbom:generate
pnpm release:artifacts
pnpm release:attest
pnpm release:attest:verify
pnpm repro:check
pnpm changelog:status
```

## Change Rules

- Keep changes focused. One PR should have one reason to exist.
- Add regression tests for bug fixes.
- Add happy-path and failure-path tests for new verifier, API, archive, redaction, or trust behavior.
- Do not change cryptographic primitives without an issue, design note, and migration plan.
- Do not weaken archive limits, path traversal checks, signature verification, or trust-store validation for convenience.
- Do not introduce network telemetry, accounts, billing, or persistent hosted-state dependencies into the OSS verifier path.
- Keep pack-format changes explicit and versioned through schema metadata.

## Code Standards

TypeScript:

- Strict mode is required.
- Avoid `any`; prefer `unknown` plus type guards.
- Public functions exported from packages should have explicit return types.
- Validate untrusted JSON at the boundary with the existing Zod schemas or a matching local parser.
- Use named exports.

Core:

- Crypto helpers should remain deterministic and side-effect free.
- Verifier failures should use stable error/check codes with actionable hints.
- Archive parsing must preserve path traversal, entry count, size, ratio, symlink, and duplicate-entry defenses.
- Redaction must preserve derivation metadata linking public projections back to the original receipt hash.

Web:

- The first screen must stay a usable verifier, not a marketing landing page.
- Use the Security Workbench direction in [DESIGN.md](./DESIGN.md).
- Preserve keyboard navigation, reduced-motion behavior, mobile bounds, and production Playwright coverage.
- Keep Tailwind v4/PostCSS configured through `apps/web/postcss.config.mjs`; `pnpm web:css:check` must remain green.

## Pull Request Checklist

- [ ] The change has a clear scope and reason.
- [ ] `pnpm release:check` passes locally.
- [ ] Relevant security/supply-chain gates pass when touched.
- [ ] Public docs are updated for user-visible behavior.
- [ ] New or changed public package behavior has a changeset.
- [ ] No secrets, generated build output, `.env` files, or large binaries are committed.
- [ ] Screenshots or Playwright artifacts are included when the UI meaningfully changes.

## Commit Messages

Use Conventional Commits:

```text
feat(core): add progress events to pack verification
fix(api): reject duplicate archive entries
docs(web): document workbench verification states
test(e2e): cover keyboard-only demo verification
chore(deps): patch transitive audit advisories
```

The body should explain why the change is necessary when the reason is not obvious from the diff.

## Scope Boundaries

In scope:

- verifier correctness
- pack-format clarity
- archive and redaction hardening
- trust-store and key-lifecycle workflows
- CLI/API/web parity
- documentation, tests, release integrity, and accessibility

Out of scope for v1:

- hosted accounts, teams, billing, or databases
- telemetry by default
- Rust/WASM verifier rewrites without benchmark evidence
- mobile-native ports
- breaking pack-format changes without a versioned migration path

## Questions

Open a GitHub issue or discussion with the smallest reproducible example you can provide. For security issues, follow [SECURITY.md](./SECURITY.md) instead of opening a public issue.
