import { describe, expect, it } from 'vitest';
import { generatePack } from './generator.js';
import { evaluateAll } from '../policy/engine.js';
import { keypairFromSeed } from '../crypto/ed25519.js';
import type { Event } from '../types/event.js';
import type { Policy } from '../types/policy.js';

const seed = new Uint8Array(32);
seed[0] = 0x11;
seed[1] = 0x22;
seed[2] = 0x33;

const policy: Policy = {
  version: '0.1',
  defaults: { decision: 'deny' },
  rules: [
    {
      id: 'allow_workspace_reads',
      when: { event_type: 'fs.read', path_glob: 'workspace/**' },
      decision: 'allow',
      severity: 'low',
      reason: 'Allow workspace reads',
    },
  ],
};

const policyYaml = `version: "0.1"
defaults:
  decision: deny
rules:
  - id: allow_workspace_reads
    when:
      event_type: fs.read
      path_glob: "workspace/**"
    decision: allow
    severity: low
    reason: "Allow workspace reads"
`;

function makeEvents(): Event[] {
  return [
    {
      event_id: 'aaaaaaaa-0001-4000-a000-000000000001',
      ts: '2026-01-15T10:00:00.000Z',
      type: 'run.start',
      actor: 'demo-agent',
      payload: { model: 'gpt-5', session: 's-1' },
    },
    {
      event_id: 'aaaaaaaa-0002-4000-a000-000000000002',
      ts: '2026-01-15T10:00:01.000Z',
      type: 'fs.read',
      actor: 'demo-agent',
      payload: { path: 'workspace/config.json' },
    },
    {
      event_id: 'aaaaaaaa-0003-4000-a000-000000000003',
      ts: '2026-01-15T10:00:02.000Z',
      type: 'run.end',
      actor: 'demo-agent',
      payload: { status: 'ok' },
    },
  ];
}

describe('generatePack determinism', () => {
  it('produces stable artifacts for fixed inputs', () => {
    const events = makeEvents();
    const decisions = evaluateAll(events, policy);
    const keypair = keypairFromSeed(seed);

    const opts = {
      runId: 'aaaaaaaa-bbbb-4000-a000-000000000000',
      createdAt: '2026-01-15T10:00:00.000Z',
      producerName: 'proofpack-determinism-test',
      producerVersion: '0.1.0',
      events,
      policy,
      policyYaml,
      decisions,
      keypair,
    } as const;

    const first = generatePack(opts);
    const second = generatePack(opts);

    expect(first.raw.manifest).toEqual(second.raw.manifest);
    expect(first.raw.receipt).toEqual(second.raw.receipt);
    expect(first.raw.events).toEqual(second.raw.events);
    expect(first.raw.policy).toEqual(second.raw.policy);
    expect(first.raw.decisions).toEqual(second.raw.decisions);
    expect(first.raw.merkle).toEqual(second.raw.merkle);
    expect(first.inclusionProofs).toEqual(second.inclusionProofs);
  });
});
