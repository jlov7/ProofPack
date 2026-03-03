import { describe, expect, it } from 'vitest';
import { evaluateAll } from '../policy/engine.js';
import { keypairFromSeed } from '../crypto/ed25519.js';
import { generatePack } from './generator.js';
import { diffPacks } from './diff.js';
import type { Event } from '../types/event.js';
import type { Policy } from '../types/policy.js';

const seed = new Uint8Array(32);
seed[0] = 0x42;
const keypair = keypairFromSeed(seed);

const testPolicy: Policy = {
  version: '0.1',
  defaults: { decision: 'allow' },
  rules: [],
};

const testPolicyYaml = `version: "0.1"
defaults:
  decision: allow
rules: []
`;

function event(idSuffix: string, minute: number): Event {
  return {
    event_id: `123e4567-e89b-4000-a000-${idSuffix.padStart(12, '0')}`,
    ts: `2026-01-15T10:${String(minute).padStart(2, '0')}:00.000Z`,
    type: 'fs.read',
    actor: 'agent',
    payload: { path: `workspace/${idSuffix}.txt` },
  };
}

function build(events: Event[]) {
  return generatePack({
    runId: '123e4567-e89b-4000-a000-000000000000',
    createdAt: '2026-01-15T10:00:00.000Z',
    producerName: 'proofpack-test',
    producerVersion: '0.1.0',
    events,
    policy: testPolicy,
    policyYaml: testPolicyYaml,
    decisions: evaluateAll(events, testPolicy),
    keypair,
  });
}

describe('diffPacks', () => {
  it('reports identical packs as identical', () => {
    const pack = build([event('1', 0), event('2', 1)]);
    const report = diffPacks(pack, pack);
    expect(report.identical).toBe(true);
    expect(report.events.added).toHaveLength(0);
    expect(report.events.removed).toHaveLength(0);
    expect(report.events.changed).toHaveLength(0);
  });

  it('detects added, removed, and changed events', () => {
    const left = build([event('1', 0), event('2', 1)]);
    const changed = event('2', 1);
    changed.payload = { path: 'workspace/changed.txt' };
    const right = build([changed, event('3', 2)]);

    const report = diffPacks(left, right);
    expect(report.identical).toBe(false);
    expect(report.events.added).toEqual([event('3', 2).event_id]);
    expect(report.events.removed).toEqual([event('1', 0).event_id]);
    expect(report.events.changed).toEqual([event('2', 1).event_id]);
  });
});
