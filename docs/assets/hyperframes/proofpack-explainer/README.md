# ProofPack Hyperframes Explainer

This is the source project for the 72-second ProofPack explainer video.

Narrative:

1. AI agent transcripts are mutable without receipts.
2. ProofPack generates canonical events, policy decisions, Merkle proofs, and signed receipts.
3. The workbench verifies evidence offline.
4. Tampering fails for concrete cryptographic reasons.
5. Public disclosure uses payload commitments and unsigned projection metadata.
6. The OSS product ships as CLI, API, and web workbench over one verifier core.

Commands:

```bash
npx hyperframes lint
npx hyperframes inspect --samples 12
npx hyperframes render --output renders/proofpack-explainer.mp4 --quality standard
```

The visual identity follows the repository-level `DESIGN.md` Security Workbench direction.

Rendered output:

- `renders/proofpack-explainer.mp4`: 72 seconds, 1920x1080, 30fps.
- `renders/poster.png`: poster frame for README/release use.
