import { afterEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { generatePack, evaluateAll, canonicalizeString } from '@proofpack/core';
import { runDiff } from './diff.js';
import { makeDemoEvents, DEMO_RUN_ID } from '../demo/events.js';
import { demoPolicy, demoPolicyYaml } from '../demo/policy.js';
import { demoKeypair } from '../demo/keypair.js';

function writePackToTempDir(
  eventMutation?: (events: ReturnType<typeof makeDemoEvents>) => void,
): string {
  const events = makeDemoEvents();
  if (eventMutation) eventMutation(events);
  const decisions = evaluateAll(events, demoPolicy);
  const pack = generatePack({
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

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'proofpack-cli-diff-'));
  fs.mkdirSync(path.join(dir, 'events'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'policy'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'audit', 'inclusion_proofs'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'manifest.json'), pack.raw.manifest);
  fs.writeFileSync(path.join(dir, 'receipt.json'), pack.raw.receipt);
  fs.writeFileSync(path.join(dir, 'events', 'events.jsonl'), pack.raw.events);
  fs.writeFileSync(path.join(dir, 'policy', 'policy.yml'), pack.raw.policy);
  fs.writeFileSync(path.join(dir, 'policy', 'decisions.jsonl'), pack.raw.decisions);
  fs.writeFileSync(path.join(dir, 'audit', 'merkle.json'), pack.raw.merkle);
  for (const proof of pack.inclusionProofs) {
    fs.writeFileSync(
      path.join(dir, 'audit', 'inclusion_proofs', `${proof.event_id}.json`),
      canonicalizeString(proof) + '\n',
    );
  }
  return dir;
}

describe('runDiff', () => {
  afterEach(() => {
    process.exitCode = undefined;
  });

  it('supports machine-readable JSON diff output', () => {
    const left = writePackToTempDir();
    const right = writePackToTempDir((events) => {
      events[0] = {
        ...events[0]!,
        actor: 'different-actor',
      };
    });
    const spy = vi.spyOn(process.stdout, 'write').mockReturnValue(true);

    try {
      runDiff(left, right, { json: true });
      expect(process.exitCode).toBe(0);
      const output = spy.mock.calls.map((call) => String(call[0])).join('');
      const parsed = JSON.parse(output) as { identical: boolean; events: { changed: string[] } };
      expect(parsed.identical).toBe(false);
      expect(parsed.events.changed.length).toBeGreaterThan(0);
    } finally {
      spy.mockRestore();
      fs.rmSync(left, { recursive: true, force: true });
      fs.rmSync(right, { recursive: true, force: true });
    }
  });
});
