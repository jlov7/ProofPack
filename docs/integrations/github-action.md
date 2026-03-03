# Reusable GitHub Action: ProofPack Verify

ProofPack exposes a reusable action at:

`jlov7/ProofPack/.github/actions/proofpack-verify@main`

## Usage

```yaml
name: Verify ProofPack

on:
  workflow_dispatch:

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: jlov7/ProofPack/.github/actions/proofpack-verify@main
        with:
          pack_path: ./examples/sample_runs/latest.proofpack
```

## Inputs

- `pack_path` (required): path to pack directory or zip
- `node_version` (optional, default `20`)
- `pnpm_version` (optional, default `10`)
