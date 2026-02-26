# Contributing to ProofPack

Thank you for your interest in ProofPack. This guide covers everything you need to make a high-quality contribution.

---

## Table of Contents

- [Before You Start](#before-you-start)
- [Development Environment](#development-environment)
- [Project Structure](#project-structure)
- [Making Changes](#making-changes)
- [Testing Your Work](#testing-your-work)
- [Submitting a Pull Request](#submitting-a-pull-request)
- [What's In Scope](#whats-in-scope)
- [Code Standards](#code-standards)
- [Commit Messages](#commit-messages)

---

## Before You Start

ProofPack is a focused research project with tight scope boundaries. Before investing time in a contribution, please:

1. **Open an issue first** for anything beyond a straightforward bug fix. Describe what you want to change and why. This prevents wasted effort on changes that won't be merged.
2. **Read the architecture doc** — [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) — so your changes fit the design.
3. **Read the security doc** — [docs/SECURITY.md](./docs/SECURITY.md) — if your change touches cryptography, policy, or the pack format.

---

## Development Environment

### Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| Node.js | ≥ 22 | Use [fnm](https://github.com/Schniz/fnm) or [nvm](https://github.com/nvm-sh/nvm) |
| pnpm | ≥ 9 | Install with `npm i -g pnpm` |
| Git | Any recent | |

### Setup

```bash
# Clone the repo
git clone https://github.com/your-username/proofpack
cd proofpack

# Install all workspace dependencies
pnpm install

# Start the full development stack
pnpm dev
# → API on http://localhost:5000
# → Web UI on http://localhost:3000
```

### Development scripts

```bash
pnpm dev          # Concurrent: API server + Next.js dev server
pnpm test         # Run all 171 unit tests (Vitest)
pnpm e2e          # Run all 12 E2E tests (Playwright, auto-starts dev server)
pnpm check        # TypeScript strict + ESLint + Prettier — must be clean before PR
pnpm demo         # Generate fresh demo pack → packages/cli/examples/sample_runs/latest.proofpack/
pnpm verify       # Verify the demo pack (should exit 0)
```

---

## Project Structure

```
proofpack/
├── packages/
│   ├── core/            # All cryptography, pack format, verifier, policy engine
│   └── cli/             # Commander CLI: demo + verify subcommands
├── apps/
│   ├── api/             # Fastify REST API (local dev and testing)
│   └── web/             # Next.js 15 App Router UI + Next.js API routes (production)
└── tests/
    └── e2e/             # Playwright end-to-end tests
```

**Dependency rule**: `core` has no dependencies on `cli`, `api`, or `web`. The dependency graph flows one way: `web` / `api` / `cli` → `core`.

---

## Making Changes

### Branch naming

```
feat/short-description
fix/what-was-broken
test/what-is-being-tested
docs/what-is-documented
refactor/what-was-changed
```

### Guidelines

- **One logical change per branch.** Don't bundle unrelated fixes.
- **Read before writing.** Understand the existing code before proposing changes to it.
- **Don't over-engineer.** The right amount of code is the minimum needed for the task. Three similar lines > a premature abstraction.
- **Don't touch what you don't need to.** If you're fixing a bug in `verifier.ts`, don't refactor `loader.ts` in the same PR.
- **No speculative features.** If it wasn't requested in the issue, don't add it.

---

## Testing Your Work

Every change must maintain the following invariants:

### Unit tests (must stay at 171 passing — add new ones for new behavior)

```bash
pnpm test
```

If you add a new function, add a unit test for it. If you fix a bug, add a regression test that fails before your fix and passes after.

### Known-answer vectors

The crypto functions in `packages/core/src/crypto/` have tests with known-answer vectors — specific inputs → specific expected outputs. If you touch these functions, you must keep these tests passing. Do not change the expected output without understanding why the answer changed and verifying it against an independent reference implementation.

### E2E tests (must stay at 12 passing)

```bash
pnpm e2e
```

If you add a new screen or significantly change existing UI behavior, add or update an E2E test.

### The full quality gate

```bash
pnpm check && pnpm test && pnpm e2e
```

All three must pass before opening a PR. No exceptions.

### After touching crypto or the pack format

```bash
# Regenerate the demo pack
pnpm demo

# Verify it still passes
pnpm verify -- packages/cli/examples/sample_runs/latest.proofpack

# The output must end with:
# VERIFIED (6/6 checks passed)
```

If the pack format changes in any way, the golden fixture must be regenerated and committed.

---

## Submitting a Pull Request

1. **Push your branch** and open a PR against `main`.
2. **Fill out the PR template** — describe what changed, why, and how you tested it.
3. **Checklist before requesting review:**
   - [ ] `pnpm check` passes (zero TypeScript errors, zero lint warnings, zero prettier diffs)
   - [ ] `pnpm test` shows 171 passing (or more, if you added tests)
   - [ ] `pnpm e2e` shows 12 passing (or more, if you added tests)
   - [ ] `pnpm demo && pnpm verify` exits 0 (if you touched core, CLI, or the pack format)
   - [ ] No new `any` types introduced
   - [ ] No `console.log` left in non-test code (use `console.warn` or `console.error` where appropriate)
   - [ ] Commit messages follow [Conventional Commits](#commit-messages)

---

## What's In Scope

### Welcome contributions

- **Bug fixes** with regression tests
- **New event types** — add to `packages/core/src/types/event.ts` and the demo in `packages/cli/src/demo/events.ts`
- **New policy matchers** — extend `PolicyRule.when` in `packages/core/src/types/policy.ts` and implement in `packages/core/src/policy/engine.ts`
- **Improved Merkle proof formats** — e.g., consistency proofs for append-only streams
- **Additional verification checks** — e.g., timestamp ordering validation
- **UI improvements** to existing screens
- **Documentation improvements**
- **Performance improvements** with benchmarks proving the improvement

### Out of scope

- **Switching cryptographic primitives.** Ed25519 and SHA-256 are intentional. The `@noble/*` library family was chosen specifically for its audit record and pure-TypeScript isomorphic design.
- **Adding a database or centralized service.** Offline verifiability is a core feature, not a limitation.
- **Breaking changes to the pack format** without a `schema_version` bump and migration path. The pack format is the public API.
- **Bundling third-party services** (telemetry, analytics, cloud storage integrations).
- **Changing the policy engine from YAML to code.** YAML is intentionally declarative and auditable.
- **React Native / mobile port.** Out of scope for this project.

If you're unsure, open an issue first.

---

## Code Standards

### TypeScript

- **Strict mode is non-negotiable.** `@typescript-eslint/no-explicit-any` is an error, not a warning. If you find yourself reaching for `any`, use `unknown` + a type guard instead.
- **Zod at every trust boundary.** Any data that crosses a trust boundary (file I/O, HTTP, user input) must be validated with a Zod schema before being used as a typed value.
- **Pure functions for crypto.** All functions in `packages/core/src/crypto/` should be pure — no side effects, no global state.
- **Barrel exports only from `index.ts`.** Don't import internal modules directly from other packages.

### React / Next.js

- **`"use client"` only when necessary.** Prefer React Server Components. Add `"use client"` only when you need browser APIs, event handlers, or stateful hooks.
- **Zustand for cross-screen state.** Don't use component-local state for data that needs to be shared across screens. Add actions to `apps/web/src/lib/store.ts`.
- **No inline styles for layout.** Use Tailwind utilities. Inline styles are acceptable for values that can't be expressed as Tailwind utilities (dynamic, computed values).

### Error handling

- **Throw descriptive errors.** Error messages should explain what went wrong and (where possible) why, not just that something failed.
- **Don't swallow errors.** No empty `catch` blocks. If you catch an error, either re-throw it, wrap it with more context, or convert it to a user-facing message.
- **No `try/catch` around impossible failures.** Only catch errors that can realistically occur.

### File organization

- **One concept per file.** `hash.ts` contains hashing functions. `merkle.ts` contains Merkle tree functions. Don't mix concerns.
- **Types go in `types/`.** Shared TypeScript types and Zod schemas belong in `packages/core/src/types/`, not scattered across implementation files.

---

## Commit Messages

ProofPack uses [Conventional Commits](https://www.conventionalcommits.org/). Format:

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### Types

| Type | When to use |
|------|------------|
| `feat` | New capability |
| `fix` | Bug fix |
| `test` | Adding or updating tests |
| `docs` | Documentation only |
| `refactor` | Code reorganization without behavior change |
| `perf` | Performance improvement |
| `chore` | Build scripts, dependencies, config |
| `ci` | CI/CD changes |

### Scopes

| Scope | Maps to |
|-------|---------|
| `core` | `packages/core` |
| `cli` | `packages/cli` |
| `api` | `apps/api` |
| `web` | `apps/web` |
| `e2e` | `tests/e2e` |

### Examples

```
feat(core): add consistency proof support for append-only streams

fix(verifier): handle packs with zero policy rules (default-deny with no decisions)

test(e2e): add upload-flow spec for user-supplied non-demo packs

docs(architecture): expand Merkle tree design section with proof size analysis

chore(deps): upgrade @noble/ed25519 to 2.2.0
```

### Commit body

The commit body should explain **why**, not what. The diff shows what changed. The body explains the reasoning:

```
fix(verifier): handle packs with zero policy rules

When an agent run has no policy applied (policy.yml has an empty rules array),
the verifier was treating the empty decisions array as a schema error because
decisions.jsonl would contain zero lines.

The fix validates the decisions array length against policy.rules.length, not
against a hardcoded minimum.
```

---

## Questions?

Open a GitHub Discussion or file an issue with the `question` label. We'll do our best to respond promptly.
