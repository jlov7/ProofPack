# Release Integrity

ProofPack includes artifact signing and reproducibility gates.

## 1) Build Release Artifacts

```bash
pnpm release:artifacts
```

Outputs tarballs under `artifacts/release/`.

## 2) Sign Artifacts

```bash
pnpm release:attest
```

Outputs:

- `artifacts/release/SHA256SUMS`
- `artifacts/release/SHA256SUMS.sig`
- `artifacts/release/SHA256SUMS.public.pem`
- `artifacts/release/attestation.json`

By default, signing uses an ephemeral generated key. To use a managed key:

- `PROOFPACK_RELEASE_PRIVATE_KEY_PATH=/path/to/private.pem`
- or `PROOFPACK_RELEASE_PRIVATE_KEY_PEM="-----BEGIN PRIVATE KEY-----..."`

## 3) Verify Attestation

```bash
pnpm release:attest:verify
```

Optional:

- `PROOFPACK_RELEASE_PUBLIC_KEY_PATH=/path/to/public.pem`

## 4) Reproducible Build Check

```bash
pnpm repro:check
```

Runs two clean builds and compares hash snapshots of release-relevant outputs.
