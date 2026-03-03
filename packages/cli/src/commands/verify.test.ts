import { afterEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { generatePack, evaluateAll, canonicalizeString } from '@proofpack/core';
import { runVerify } from './verify.js';
import { makeDemoEvents, DEMO_RUN_ID } from '../demo/events.js';
import { demoPolicy, demoPolicyYaml } from '../demo/policy.js';
import { demoKeypair } from '../demo/keypair.js';

function writePackToTempDir(): { dir: string; publicKey: string } {
  const events = makeDemoEvents();
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

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'proofpack-cli-verify-'));
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

  return { dir, publicKey: pack.receipt.signature!.public_key };
}

describe('runVerify', () => {
  afterEach(() => {
    process.exitCode = undefined;
  });

  it('supports machine-readable JSON output mode', () => {
    const { dir } = writePackToTempDir();
    const spy = vi.spyOn(process.stdout, 'write').mockReturnValue(true);

    try {
      runVerify(dir, { json: true });
      expect(process.exitCode).toBe(0);
      const output = spy.mock.calls.map((call) => String(call[0])).join('');
      const parsed = JSON.parse(output) as {
        verified: boolean;
        checks: unknown[];
        profile: string;
      };
      expect(parsed.verified).toBe(true);
      expect(parsed.checks).toHaveLength(6);
      expect(parsed.profile).toBe('standard');
    } finally {
      spy.mockRestore();
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('enforces trusted key verification when trust store is configured', () => {
    const { dir, publicKey } = writePackToTempDir();
    const trustStorePath = path.join(dir, 'trust-store.json');
    fs.writeFileSync(
      trustStorePath,
      JSON.stringify(
        {
          version: '1',
          keys: [{ key_id: 'trusted-key', public_key: publicKey, status: 'active' }],
        },
        null,
        2,
      ),
    );
    const spy = vi.spyOn(process.stdout, 'write').mockReturnValue(true);

    try {
      runVerify(dir, {
        json: true,
        trustStorePath,
        requireTrustedKey: true,
      });
      expect(process.exitCode).toBe(0);
      const output = spy.mock.calls.map((call) => String(call[0])).join('');
      const parsed = JSON.parse(output) as {
        verified: boolean;
        checks: Array<{ name: string; ok: boolean }>;
      };
      expect(parsed.verified).toBe(true);
      expect(parsed.checks.find((check) => check.name === 'receipt.trust')?.ok).toBe(true);
    } finally {
      spy.mockRestore();
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});
