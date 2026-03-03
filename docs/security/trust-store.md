# Trust Store Guide

ProofPack supports explicit trust decisions for signing keys.

## Trust Store Shape

See `config/trust-store.example.json`:

```json
{
  "version": "1",
  "keys": [
    {
      "key_id": "sha256-fingerprint-or-custom-id",
      "public_key": "base64-ed25519-public-key",
      "status": "active",
      "valid_from": "2026-01-01T00:00:00.000Z",
      "valid_to": "2027-01-01T00:00:00.000Z",
      "rotated_from": "previous-key-id"
    }
  ]
}
```

## Status Semantics

- `active`: accepted for verification.
- `retired`: accepted but marked with warning.
- `revoked`: rejected when verification timestamp is after `revoked_at` (or immediately if `revoked_at` omitted).

## CLI Usage

```bash
pnpm verify -- ./examples/sample_runs/latest.proofpack \
  --trust-store ./config/trust-store.example.json \
  --require-trusted-key
```

## API Usage

Set environment variables on the API service:

- `PROOFPACK_TRUST_STORE_PATH`
- `PROOFPACK_VERIFY_PROFILE` (`standard|strict|permissive`)
- `PROOFPACK_REQUIRE_TRUSTED_KEY=1`
- `PROOFPACK_REQUIRE_TIMESTAMP_ANCHOR=1`
