# Benchmarks (2026-03)

## Environment

- Date: 2026-03-03
- Host: local macOS development machine
- Node: `>=20` (project requirement)

## Results

### 1) Merkle Stress Gate

Command:

```bash
pnpm stress:core
```

Observed:

- `100,000` events
- Merkle root + sampled inclusion verification
- Test completed in approximately `4.22s`

### 2) Release Integrity

Commands:

```bash
pnpm release:artifacts
pnpm release:attest
pnpm release:attest:verify
pnpm repro:check
```

Observed:

- Release bundle generated successfully
- Attestation generated and verified successfully
- Reproducible build check passed across two clean builds

## Notes

- This benchmark suite is intended as release-gate evidence, not synthetic maximum throughput profiling.
- For production SLO tuning, rerun the same commands on CI runners and target deployment hardware.
