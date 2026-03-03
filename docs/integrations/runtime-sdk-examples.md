# Runtime SDK Integration Examples

This guide shows how to emit ProofPack-compatible events from common agent runtimes and then verify them.

## 1) Generic Node Runtime (server-side)

```ts
import { evaluateAll, generatePack, keypairFromSeed } from '@proofpack/core';
import type { Event, Policy } from '@proofpack/core';

const policy: Policy = { version: '0.1', defaults: { decision: 'deny' }, rules: [] };
const policyYaml = `version: "0.1"\ndefaults:\n  decision: deny\nrules: []\n`;

const events: Event[] = [
  {
    event_id: crypto.randomUUID(),
    ts: new Date().toISOString(),
    type: 'run.start',
    actor: 'node-runtime',
    payload: { model: 'gpt-5' },
  },
];

const seed = new Uint8Array(32);
seed[0] = 0x42;
const keypair = keypairFromSeed(seed);
const decisions = evaluateAll(events, policy);

const pack = generatePack({
  runId: crypto.randomUUID(),
  createdAt: new Date().toISOString(),
  producerName: 'my-runtime',
  producerVersion: '1.0.0',
  events,
  policy,
  policyYaml,
  decisions,
  keypair,
});
```

## 2) OpenAI Responses API Wrapper

Capture each tool call and model turn as events, then generate a pack at run end:

```ts
events.push({
  event_id: crypto.randomUUID(),
  ts: new Date().toISOString(),
  type: 'tool.call',
  actor: 'openai-runtime',
  payload: { tool: 'search_docs', args: { query: 'proofpack' } },
});
```

Recommended mapping:

- `run.start` / `run.end`: assistant session lifecycle
- `tool.call`: function/tool invocation
- `fs.read` / `fs.write`: local file operations
- `net.http`: external HTTP requests
- `hold.request` / `hold.approve`: human escalation

## 3) Trust Store + Strict Verification

```bash
pnpm verify -- ./examples/sample_runs/latest.proofpack \
  --profile strict \
  --trust-store ./config/trust-store.example.json \
  --require-trusted-key \
  --require-timestamp-anchor
```

## 4) Pack-to-Pack Drift Analysis

```bash
pnpm diff -- ./run-a.proofpack ./run-b.proofpack --json
```

Use this in CI to compare runs after policy/runtime changes.
