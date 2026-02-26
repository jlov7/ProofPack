import { describe, it, expect } from 'vitest';
import { generatePack, evaluateAll, verifyPack } from '@proofpack/core';
import { demoKeypair } from './demo/keypair.js';
import { demoPolicy, demoPolicyYaml } from './demo/policy.js';
import { makeDemoEvents, DEMO_RUN_ID } from './demo/events.js';

function buildDemoPack() {
  const events = makeDemoEvents();
  const decisions = evaluateAll(events, demoPolicy);
  return generatePack({
    runId: DEMO_RUN_ID,
    createdAt: '2026-01-15T10:00:00.000Z',
    producerName: 'proofpack-demo',
    producerVersion: '0.1.0',
    events,
    policy: demoPolicy,
    policyYaml: demoPolicyYaml,
    decisions,
    keypair: demoKeypair,
  });
}

describe('demo pack generation', () => {
  it('generates 13 events', () => {
    const events = makeDemoEvents();
    expect(events).toHaveLength(13);
  });

  it('has at least one deny decision', () => {
    const events = makeDemoEvents();
    const decisions = evaluateAll(events, demoPolicy);
    const denies = decisions.filter((d) => d.decision === 'deny');
    expect(denies.length).toBeGreaterThanOrEqual(1);
    // net.http should be an explicit deny
    const netDeny = denies.find((d) => d.rule_id === 'deny_network');
    expect(netDeny).toBeDefined();
  });

  it('has at least one hold decision', () => {
    const events = makeDemoEvents();
    const decisions = evaluateAll(events, demoPolicy);
    const holds = decisions.filter((d) => d.decision === 'hold');
    expect(holds.length).toBeGreaterThanOrEqual(1);
  });

  it('has hold.approve event (human approval flow)', () => {
    const events = makeDemoEvents();
    const approvals = events.filter((e) => e.type === 'hold.approve');
    expect(approvals.length).toBeGreaterThanOrEqual(1);
  });

  it('uses multiple event types', () => {
    const events = makeDemoEvents();
    const types = new Set(events.map((e) => e.type));
    expect(types.size).toBeGreaterThanOrEqual(5);
  });

  it('passes all 6 verification checks', () => {
    const pack = buildDemoPack();
    const report = verifyPack(pack);
    expect(report.verified).toBe(true);
    expect(report.checks).toHaveLength(6);
    for (const check of report.checks) {
      expect(check.ok).toBe(true);
    }
  });

  it('returns correct run metadata', () => {
    const pack = buildDemoPack();
    const report = verifyPack(pack);
    expect(report.run_id).toBe(DEMO_RUN_ID);
    expect(report.producer.name).toBe('proofpack-demo');
    expect(report.events_preview).toHaveLength(13);
  });

  it('produces deterministic output', () => {
    const pack1 = buildDemoPack();
    const pack2 = buildDemoPack();
    // Same keypair + same events → same receipt signature
    expect(pack1.receipt.signature.sig).toBe(pack2.receipt.signature.sig);
    // Same Merkle root
    expect(pack1.receipt.signed_block.merkle_tree.root_hash).toBe(
      pack2.receipt.signed_block.merkle_tree.root_hash,
    );
  });
});

describe('demo pack write + load round-trip', () => {
  it('loads from disk and passes verification', async () => {
    const { loadPackFromDirectory } = await import('@proofpack/core');
    const fs = await import('node:fs');
    const path = await import('node:path');
    const os = await import('node:os');
    const { canonicalizeString } = await import('@proofpack/core');

    const pack = buildDemoPack();

    // Write to temp directory
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'proofpack-test-'));
    fs.mkdirSync(path.join(tmpDir, 'events'), { recursive: true });
    fs.mkdirSync(path.join(tmpDir, 'policy'), { recursive: true });
    fs.mkdirSync(path.join(tmpDir, 'audit', 'inclusion_proofs'), { recursive: true });

    fs.writeFileSync(path.join(tmpDir, 'manifest.json'), pack.raw.manifest);
    fs.writeFileSync(path.join(tmpDir, 'receipt.json'), pack.raw.receipt);
    fs.writeFileSync(path.join(tmpDir, 'events', 'events.jsonl'), pack.raw.events);
    fs.writeFileSync(path.join(tmpDir, 'policy', 'policy.yml'), pack.raw.policy);
    fs.writeFileSync(path.join(tmpDir, 'policy', 'decisions.jsonl'), pack.raw.decisions);
    fs.writeFileSync(path.join(tmpDir, 'audit', 'merkle.json'), pack.raw.merkle);

    for (const proof of pack.inclusionProofs) {
      fs.writeFileSync(
        path.join(tmpDir, 'audit', 'inclusion_proofs', `${proof.event_id}.json`),
        canonicalizeString(proof) + '\n',
      );
    }

    // Load and verify
    const loaded = loadPackFromDirectory(tmpDir);
    const report = verifyPack(loaded);
    expect(report.verified).toBe(true);

    // Cleanup
    fs.rmSync(tmpDir, { recursive: true });
  });
});
