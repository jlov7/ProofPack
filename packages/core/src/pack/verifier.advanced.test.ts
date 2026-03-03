import { describe, expect, it } from 'vitest';
import { evaluateAll } from '../policy/engine.js';
import { keypairFromSeed } from '../crypto/ed25519.js';
import { generatePack } from './generator.js';
import { verifyPack } from './verifier.js';
import { fingerprintPublicKeyB64, type TrustStore } from './trust.js';
import type { Event } from '../types/event.js';
import type { Policy } from '../types/policy.js';
import type { PackContents } from './types.js';

const seedA = new Uint8Array(32);
seedA[0] = 0x01;
const keyA = keypairFromSeed(seedA);

const seedB = new Uint8Array(32);
seedB[0] = 0x02;
const keyB = keypairFromSeed(seedB);

const basePolicy: Policy = {
  version: '0.1',
  defaults: { decision: 'allow' },
  rules: [
    {
      id: 'deny_network',
      when: { event_type: 'net.http' },
      decision: 'deny',
      severity: 'high',
      reason: 'No network calls',
    },
  ],
};

const basePolicyYaml = `version: "0.1"
defaults:
  decision: allow
rules:
  - id: deny_network
    when:
      event_type: net.http
    decision: deny
    severity: high
    reason: "No network calls"
`;

function makeEvents(count = 6): Event[] {
  return Array.from({ length: count }, (_, i) => ({
    event_id: `abcdefff-${String(i + 1).padStart(4, '0')}-4000-a000-${String(i + 1).padStart(12, '0')}`,
    ts: `2026-01-15T10:${String(i).padStart(2, '0')}:00.000Z`,
    type: i % 2 === 0 ? 'fs.read' : 'net.http',
    actor: 'agent',
    payload: i % 2 === 0 ? { path: `workspace/file-${i}.txt` } : { url: 'https://example.com' },
  }));
}

function buildPack(opts?: Parameters<typeof generatePack>[0]): PackContents {
  const events = makeEvents(6);
  const decisions = evaluateAll(events, basePolicy);
  return generatePack({
    runId: 'a1b2c3d4-e5f6-4000-a000-000000000001',
    createdAt: '2026-01-15T10:00:00.000Z',
    producerName: 'proofpack-test',
    producerVersion: '0.1.0',
    events,
    policy: basePolicy,
    policyYaml: basePolicyYaml,
    decisions,
    keypair: keyA,
    ...opts,
  });
}

function trustStoreFor(publicKey: string): TrustStore {
  return {
    version: '1',
    keys: [
      {
        key_id: fingerprintPublicKeyB64(publicKey),
        public_key: publicKey,
        status: 'active',
      },
    ],
  };
}

describe('verifyPack advanced features', () => {
  it('verifies trust store when configured', () => {
    const pack = buildPack();
    const store = trustStoreFor(pack.receipt.signature!.public_key);
    const report = verifyPack(pack, { trustStore: store, requireTrustedKey: true });
    expect(report.verified).toBe(true);
    expect(report.checks.find((c) => c.name === 'receipt.trust')?.ok).toBe(true);
  });

  it('rejects revoked keys in trust store', () => {
    const pack = buildPack();
    const publicKey = pack.receipt.signature!.public_key;
    const store: TrustStore = {
      version: '1',
      keys: [
        {
          key_id: fingerprintPublicKeyB64(publicKey),
          public_key: publicKey,
          status: 'revoked',
          revoked_at: '2026-01-01T00:00:00.000Z',
        },
      ],
    };
    const report = verifyPack(pack, { trustStore: store, requireTrustedKey: true });
    expect(report.verified).toBe(false);
    const trustCheck = report.checks.find((c) => c.name === 'receipt.trust');
    expect(trustCheck?.ok).toBe(false);
  });

  it('supports multi-signature threshold verification', () => {
    const pack = buildPack({
      additionalSigners: [keyB],
      signatureThreshold: 2,
    });
    const report = verifyPack(pack);
    expect(report.verified).toBe(true);
    const sigCheck = report.checks.find((c) => c.name === 'receipt.signature');
    expect(sigCheck?.details.signature_count).toBe(2);
    expect(sigCheck?.details.valid_signatures).toBe(2);
  });

  it('fails when multi-signature threshold is not met', () => {
    const pack = buildPack({
      additionalSigners: [keyB],
      signatureThreshold: 2,
    });
    const tampered: PackContents = {
      ...pack,
      receipt: {
        ...pack.receipt,
        signatures: pack.receipt.signatures!.map((sig, i) =>
          i === 1 ? { ...sig, sig: sig.sig.slice(1) + 'A' } : sig,
        ),
      },
    };
    const report = verifyPack(tampered);
    expect(report.verified).toBe(false);
    const sigCheck = report.checks.find((c) => c.name === 'receipt.signature');
    expect(sigCheck?.ok).toBe(false);
  });

  it('validates timestamp anchors when required', () => {
    const pack = buildPack({
      timestampAnchor: {
        type: 'rfc3161',
        timestamp: '2026-01-15T10:00:01.000Z',
        token_sha256: 'a'.repeat(64),
      },
    });
    const report = verifyPack(pack, { requireTimestampAnchor: true });
    expect(report.verified).toBe(true);
    expect(report.checks.find((c) => c.name === 'timestamp.anchor')?.ok).toBe(true);
  });

  it('validates append-only history consistency proofs', () => {
    const previousEvents = makeEvents(3);
    const currentEvents = [
      ...previousEvents,
      ...makeEvents(2).map((event, i) => ({
        ...event,
        event_id: `ffffeeee-${String(i + 1).padStart(4, '0')}-4000-a000-${String(100 + i).padStart(12, '0')}`,
      })),
    ];
    const pack = buildPack({
      events: currentEvents,
      decisions: evaluateAll(currentEvents, basePolicy),
      previousEvents,
    });
    const report = verifyPack(pack);
    expect(report.verified).toBe(true);
    expect(report.checks.find((c) => c.name === 'history.consistency')?.ok).toBe(true);
  });

  it('strict profile fails without trust, timestamp anchor, and history proof', () => {
    const pack = buildPack();
    const report = verifyPack(pack, { profile: 'strict' });
    expect(report.verified).toBe(false);
    expect(report.checks.find((c) => c.name === 'receipt.trust')?.ok).toBe(false);
    expect(report.checks.find((c) => c.name === 'timestamp.anchor')?.ok).toBe(false);
    expect(report.checks.find((c) => c.name === 'history.consistency')?.ok).toBe(false);
  });

  it('permissive profile allows non-critical check failures', () => {
    const pack = buildPack();
    const tampered: PackContents = {
      ...pack,
      raw: {
        ...pack.raw,
        policy: new TextEncoder().encode('version: "0.9"\ndefaults:\n  decision: deny\n'),
      },
    };
    const report = verifyPack(tampered, { profile: 'permissive' });
    expect(report.verified).toBe(true);
    expect(report.checks.find((c) => c.name === 'policy.hash')?.ok).toBe(false);
  });
});
