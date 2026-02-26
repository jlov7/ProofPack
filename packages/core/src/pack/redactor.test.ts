import { describe, it, expect } from 'vitest';
import { computeCommitment, redactPack } from './redactor.js';
import { generatePack } from './generator.js';
import { evaluateAll } from '../policy/engine.js';
import { keypairFromSeed } from '../crypto/ed25519.js';
import type { Event } from '../types/event.js';
import type { Policy } from '../types/policy.js';

const seed = new Uint8Array(32);
seed[0] = 0x42;
const keypair = keypairFromSeed(seed);

const testPolicy: Policy = {
  version: '0.1',
  defaults: { decision: 'deny' },
  rules: [
    {
      id: 'allow_read',
      when: { event_type: 'fs.read', path_glob: 'workspace/**' },
      decision: 'allow',
      severity: 'low',
      reason: 'Allow reads',
    },
  ],
};

const policyYaml = `version: "0.1"
defaults:
  decision: deny
rules:
  - id: allow_read
    when:
      event_type: fs.read
      path_glob: "workspace/**"
    decision: allow
    severity: low
    reason: "Allow reads"
`;

function makeEvents(): Event[] {
  return [
    {
      event_id: '00000000-0000-4000-a000-000000000001',
      ts: '2026-01-15T10:00:00.000Z',
      type: 'fs.read',
      actor: 'test-agent',
      payload: { path: 'workspace/file.ts', content: 'secret data here' },
    },
    {
      event_id: '00000000-0000-4000-a000-000000000002',
      ts: '2026-01-15T10:01:00.000Z',
      type: 'fs.read',
      actor: 'test-agent',
      payload: { path: 'workspace/config.json', content: 'more secrets' },
    },
    {
      event_id: '00000000-0000-4000-a000-000000000003',
      ts: '2026-01-15T10:02:00.000Z',
      type: 'run.end',
      actor: 'test-agent',
    },
  ];
}

describe('computeCommitment', () => {
  it('produces deterministic commitments', () => {
    const payload = { key: 'value' };
    const salt = Buffer.from('test-salt-32-bytes-long-exactly!').toString('base64');
    const c1 = computeCommitment(payload, salt);
    const c2 = computeCommitment(payload, salt);
    expect(c1).toBe(c2);
  });

  it('different salts produce different commitments', () => {
    const payload = { key: 'value' };
    const salt1 = Buffer.from('salt-one-32-bytes-long-exactly!!').toString('base64');
    const salt2 = Buffer.from('salt-two-32-bytes-long-exactly!!').toString('base64');
    const c1 = computeCommitment(payload, salt1);
    const c2 = computeCommitment(payload, salt2);
    expect(c1).not.toBe(c2);
  });

  it('different payloads produce different commitments', () => {
    const salt = Buffer.from('same-salt-32-bytes-long-exactly!').toString('base64');
    const c1 = computeCommitment({ a: 1 }, salt);
    const c2 = computeCommitment({ a: 2 }, salt);
    expect(c1).not.toBe(c2);
  });
});

describe('redactPack', () => {
  it('removes payloads and adds commitments', () => {
    const events = makeEvents();
    const decisions = evaluateAll(events, testPolicy);
    const pack = generatePack({
      runId: 'a1b2c3d4-e5f6-4000-a000-000000000001',
      createdAt: '2026-01-15T10:00:00.000Z',
      producerName: 'test',
      producerVersion: '0.1.0',
      events,
      policy: testPolicy,
      policyYaml,
      decisions,
      keypair,
    });

    const { publicPack, openings } = redactPack(pack);

    // Events with payloads should have commitments, no payloads
    const eventsWithPayload = publicPack.events.filter((e) => e.payload_commitment);
    expect(eventsWithPayload).toHaveLength(2); // first two events had payloads

    // Events without payloads should remain unchanged
    const noPayloadEvent = publicPack.events.find(
      (e) => e.event_id === '00000000-0000-4000-a000-000000000003',
    );
    expect(noPayloadEvent?.payload).toBeUndefined();
    expect(noPayloadEvent?.payload_commitment).toBeUndefined();

    // Openings should be generated for events that had payloads
    expect(openings).toHaveLength(2);
    expect(openings[0]!.event_id).toBe('00000000-0000-4000-a000-000000000001');
    expect(openings[0]!.payload).toEqual({
      path: 'workspace/file.ts',
      content: 'secret data here',
    });
  });

  it('generates openings that match commitments', () => {
    const events = makeEvents();
    const decisions = evaluateAll(events, testPolicy);
    const pack = generatePack({
      runId: 'a1b2c3d4-e5f6-4000-a000-000000000001',
      createdAt: '2026-01-15T10:00:00.000Z',
      producerName: 'test',
      producerVersion: '0.1.0',
      events,
      policy: testPolicy,
      policyYaml,
      decisions,
      keypair,
    });

    const { publicPack, openings } = redactPack(pack);

    // Each opening should produce a commitment matching the event's payload_commitment
    for (const opening of openings) {
      const event = publicPack.events.find((e) => e.event_id === opening.event_id);
      expect(event?.payload_commitment).toBeDefined();
      const commitment = computeCommitment(opening.payload, opening.salt_b64);
      expect(commitment).toBe(event!.payload_commitment);
    }
  });
});
