---
'@proofpack/core': minor
'@proofpack/api': minor
'@proofpack/web': minor
'@proofpack/cli': patch
---

Deliver the Frontier Evidence Workbench revamp.

- Add hardened shared archive extraction/creation utilities with entry count, per-entry size, total size, compression ratio, duplicate entry, symlink, and zip-slip protections.
- Add progress-capable verification, explicit redaction derivation metadata, trust-store parsing errors, and strict event timestamp ordering checks.
- Add schema 1.0.0 unsigned redaction projections so public packs can be integrity-checkable derived artifacts without ephemeral signing authority.
- Replace shell-backed API/web zip handling with shared core archive utilities and expose consistent structured error payloads.
- Rebuild the web UI as the Evidence Workbench with verification profiles, trust controls, disclosure/export flows, responsive navigation, reduced-motion support, and production E2E visual coverage.
- Refresh public OSS documentation, release policy, dependency audit policy, repository launch materials, and Hyperframes explainer assets.
