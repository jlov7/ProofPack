import { describe, it, expect } from 'vitest';
import { generatePack } from './generator.js';
import { verifyPack } from './verifier.js';
import { evaluateAll } from '../policy/engine.js';
import { keypairFromSeed } from '../crypto/ed25519.js';
import type { Event } from '../types/event.js';
import type { Policy } from '../types/policy.js';
import type { PackContents } from './types.js';

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
      reason: 'Allow workspace reads',
    },
    {
      id: 'deny_net',
      when: { event_type: 'net.http' },
      decision: 'deny',
      severity: 'critical',
      reason: 'Network denied',
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
    reason: "Allow workspace reads"
  - id: deny_net
    when:
      event_type: net.http
    decision: deny
    severity: critical
    reason: "Network denied"
`;

function makeEvents(count: number): Event[] {
  const events: Event[] = [];
  for (let i = 0; i < count; i++) {
    const padded = String(i).padStart(12, '0');
    events.push({
      event_id: `${padded.slice(0, 8)}-${padded.slice(0, 4)}-4000-a000-${padded}`,
      ts: `2026-01-15T10:${String(i).padStart(2, '0')}:00.000Z`,
      type: i % 2 === 0 ? 'fs.read' : 'net.http',
      actor: 'test-agent',
      payload: i % 2 === 0 ? { path: 'workspace/file.ts' } : { url: 'https://example.com' },
    });
  }
  return events;
}

function buildTestPack(eventCount = 5): PackContents {
  const events = makeEvents(eventCount);
  const decisions = evaluateAll(events, testPolicy);
  return generatePack({
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
}

describe('verifyPack', () => {
  it('passes all 6 checks on a valid pack', () => {
    const pack = buildTestPack(5);
    const report = verifyPack(pack);
    expect(report.verified).toBe(true);
    expect(report.checks).toHaveLength(6);
    for (const check of report.checks) {
      expect(check.ok).toBe(true);
    }
  });

  it('returns correct metadata', () => {
    const pack = buildTestPack(5);
    const report = verifyPack(pack);
    expect(report.run_id).toBe('a1b2c3d4-e5f6-4000-a000-000000000001');
    expect(report.producer.name).toBe('test');
    expect(report.events_preview).toHaveLength(5);
  });

  it('works with varying tree sizes', () => {
    for (const size of [1, 2, 3, 7, 8, 13]) {
      const pack = buildTestPack(size);
      const report = verifyPack(pack);
      expect(report.verified).toBe(true);
    }
  });

  it('detects tampered receipt signature (mutated run_id)', () => {
    const pack = buildTestPack(5);
    // Mutate the signed_block
    const tamperedReceipt = {
      ...pack.receipt,
      signed_block: {
        ...pack.receipt.signed_block,
        run_id: 'aaaaaaaa-bbbb-4000-a000-cccccccccccc',
      },
    };
    const tampered: PackContents = { ...pack, receipt: tamperedReceipt };
    const report = verifyPack(tampered);
    expect(report.verified).toBe(false);
    const sigCheck = report.checks.find((c) => c.name === 'receipt.signature');
    expect(sigCheck?.ok).toBe(false);
  });

  it('detects tampered event (merkle root mismatch)', () => {
    const pack = buildTestPack(5);
    const tamperedEvents = [...pack.events];
    tamperedEvents[0] = { ...tamperedEvents[0]!, actor: 'evil-agent' };
    const tampered: PackContents = { ...pack, events: tamperedEvents };
    const report = verifyPack(tampered);
    expect(report.verified).toBe(false);
    const rootCheck = report.checks.find((c) => c.name === 'merkle.root');
    expect(rootCheck?.ok).toBe(false);
  });

  it('detects tampered policy bytes', () => {
    const pack = buildTestPack(5);
    const tampered: PackContents = {
      ...pack,
      raw: {
        ...pack.raw,
        policy: new TextEncoder().encode('version: "0.2"\ndefaults:\n  decision: allow\n'),
      },
    };
    const report = verifyPack(tampered);
    expect(report.verified).toBe(false);
    const policyCheck = report.checks.find((c) => c.name === 'policy.hash');
    expect(policyCheck?.ok).toBe(false);
  });

  it('handles disclosure.openings as skipped when none present', () => {
    const pack = buildTestPack(5);
    const report = verifyPack(pack);
    const disclosureCheck = report.checks.find((c) => c.name === 'disclosure.openings');
    expect(disclosureCheck?.ok).toBe(true);
    expect(disclosureCheck?.details).toEqual({ openings: 0, skipped: true });
  });
});
