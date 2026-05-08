# Changelog

All notable changes to ProofPack will be tracked here.

## Unreleased

- Added Tailwind v4 PostCSS setup and a CSS utility regression gate.
- Added shared core archive utilities with zip-slip, entry count, size, and compression-ratio guards.
- Added redaction projection derivation metadata in signed receipts.
- Removed deterministic hard-coded redaction signing seeds from API routes.
- Added schema `1.0.0` unsigned redaction projections so public packs no longer need ephemeral signer authority.
- Added Product and Design context for the Security Workbench direction.
- Started the Evidence Workbench frontend revamp.

## 0.1.0

- Initial research release: core verifier, CLI, Fastify API, Next.js web app, sample packs, release integrity docs, and launch package.
