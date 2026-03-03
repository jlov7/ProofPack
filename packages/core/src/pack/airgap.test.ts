import { describe, expect, it } from 'vitest';
import { evaluateAll } from '../policy/engine.js';
import { keypairFromSeed } from '../crypto/ed25519.js';
import { generatePack } from './generator.js';
import { verifyPack } from './verifier.js';
import type { Event } from '../types/event.js';
import type { Policy } from '../types/policy.js';

const policy: Policy = {
  version: '0.1',
  defaults: { decision: 'allow' },
  rules: [],
};

const policyYaml = `version: "0.1"
defaults:
  decision: allow
rules: []
`;

const events: Event[] = [
  {
    event_id: 'aaaaaaaa-1111-4000-a000-000000000001',
    ts: '2026-01-15T10:00:00.000Z',
    type: 'run.start',
    actor: 'agent',
    payload: { step: 1 },
  },
  {
    event_id: 'aaaaaaaa-1111-4000-a000-000000000002',
    ts: '2026-01-15T10:00:01.000Z',
    type: 'run.end',
    actor: 'agent',
    payload: { step: 2 },
  },
];

describe('offline verification smoke', () => {
  it('verifies successfully in air-gapped mode (no fetch allowed)', () => {
    const seed = new Uint8Array(32);
    seed[0] = 0x7f;
    const keypair = keypairFromSeed(seed);
    const pack = generatePack({
      runId: 'aaaaaaaa-1111-4000-a000-000000000000',
      createdAt: '2026-01-15T10:00:00.000Z',
      producerName: 'proofpack-airgap-test',
      producerVersion: '0.1.0',
      events,
      policy,
      policyYaml,
      decisions: evaluateAll(events, policy),
      keypair,
    });

    const originalFetch = globalThis.fetch;
    Object.defineProperty(globalThis, 'fetch', {
      value: () => {
        throw new Error('network is not allowed');
      },
      configurable: true,
    });

    try {
      const report = verifyPack(pack);
      expect(report.verified).toBe(true);
    } finally {
      Object.defineProperty(globalThis, 'fetch', {
        value: originalFetch,
        configurable: true,
      });
    }
  });
});
