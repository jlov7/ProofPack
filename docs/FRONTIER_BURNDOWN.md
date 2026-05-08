# Frontier Revamp Burn-Down

This document records the public release-readiness pass for the ProofPack frontier revamp. Internal working notes live under `.codex/`, but this file is committed so contributors can see what was closed.

Status legend: `DONE`.

## Closed Items

1. `DONE` Add product positioning around portable cryptographic receipts for AI agent runs.
2. `DONE` Add design context for the Security Workbench direction.
3. `DONE` Fix Tailwind v4 utility generation with `@tailwindcss/postcss`.
4. `DONE` Add a Tailwind utility regression check.
5. `DONE` Replace prototype navigation with a compact Evidence Workbench shell.
6. `DONE` Keep the first viewport as a usable verifier.
7. `DONE` Add mobile navigation and 375px viewport coverage.
8. `DONE` Add standard, strict, and permissive profile controls.
9. `DONE` Add trust-store input and validation feedback.
10. `DONE` Surface stable API error payloads in the web client.
11. `DONE` Add failed-check explanations and next-step hints.
12. `DONE` Improve report, timeline, proof, policy, disclosure, and export surfaces.
13. `DONE` Add reduced-motion CSS behavior.
14. `DONE` Add keyboard-only workflow coverage.
15. `DONE` Add accessibility smoke coverage for profile selector state and trust-store errors.
16. `DONE` Add production-server Playwright visual smoke coverage.
17. `DONE` Move archive parsing and writing into shared core utilities.
18. `DONE` Remove shell-backed zip helpers from application and package paths.
19. `DONE` Reject zip-slip paths.
20. `DONE` Enforce archive entry-count limits.
21. `DONE` Enforce decompressed-size ceilings.
22. `DONE` Enforce per-entry size limits.
23. `DONE` Enforce compression-ratio guards.
24. `DONE` Reject duplicate archive entries.
25. `DONE` Reject symlink archive entries.
26. `DONE` Guard against zero-compressed-size archive bombs.
27. `DONE` Add stable archive error codes and hints.
28. `DONE` Remove deterministic hard-coded redaction signing seeds.
29. `DONE` Add redaction derivation metadata linking public packs to source receipt hashes.
30. `DONE` Add configured redaction-signer support.
31. `DONE` Support configured redaction signers and schema `1.0.0` unsigned projections.
32. `DONE` Return redaction derivation headers from Next and Fastify routes.
33. `DONE` Add private and public redaction verification tests.
34. `DONE` Add progress-capable verification entrypoint.
35. `DONE` Share structured verifier errors across CLI, API, and web.
36. `DONE` Add trust-store parser with stable parse errors.
37. `DONE` Surface trust-store validation in API responses and web UI.
38. `DONE` Add strict-profile event timestamp ordering.
39. `DONE` Update security docs so timestamp ordering is no longer listed as future work.
40. `DONE` Rewrite README with value proposition, quickstart, architecture, trust model, and docs map.
41. `DONE` Add public `CHANGELOG.md`.
42. `DONE` Add `CODE_OF_CONDUCT.md`.
43. `DONE` Add `SUPPORT.md`.
44. `DONE` Add `ROADMAP.md`.
45. `DONE` Add contributor architecture map.
46. `DONE` Add publishing notes.
47. `DONE` Add repository asset directory notes.
48. `DONE` Refresh CI and verification workflow expectations.
49. `DONE` Add release artifact generation.
50. `DONE` Add release artifact attestations and verification.
51. `DONE` Add reproducible-build check.
52. `DONE` Add SBOM generation.
53. `DONE` Sanitize SBOM generation environment.
54. `DONE` Tighten license policy to reviewed MPL-2.0 package exceptions.
55. `DONE` Upgrade/override dependencies until moderate audit reports no known vulnerabilities.
56. `DONE` Run core 100,000-event stress test.
57. `DONE` Add Frontier Revamp changeset.
58. `DONE` Refresh contributing guidance for current commands and test counts.
59. `DONE` Add a dedicated web workbench README.
60. `DONE` Add this public burn-down record.
61. `DONE` Remove the unsigned-projection deferral with versioned receipt semantics and tests.
62. `DONE` Add the Hyperframes explainer source and rendered asset.

## Final Evidence

- `pnpm release:check`: passed with 227 tests, 1 skipped stress test, production build, Tailwind utility regression, 17 Playwright tests, and CLI sample-pack verification.
- `pnpm policy:deps`: passed.
- `pnpm audit --audit-level=moderate`: no known vulnerabilities found.
- `pnpm stress:core`: passed 100,000-event Merkle stress run.
- `pnpm sbom:generate`: passed and wrote `artifacts/sbom.cdx.json`.
- `pnpm release:artifacts && pnpm release:attest && pnpm release:attest:verify && pnpm repro:check`: passed.
- `pnpm changelog:status`: reports minor bumps for `@proofpack/core`, `@proofpack/api`, and `@proofpack/web`; patch bump for `@proofpack/cli`.
- `npx hyperframes lint && npx hyperframes inspect --samples 12`: passed with no errors and no layout issues.
- `npx hyperframes render --output renders/proofpack-explainer.mp4 --quality standard`: passed and rendered a 72-second 1920x1080 MP4 plus poster frame.
- `git diff --check`: passed.
