import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { canonicalizeString } from '../crypto/canonical.js';
import { evaluateAll } from '../policy/engine.js';
import { keypairFromSeed } from '../crypto/ed25519.js';
import { generatePack } from './generator.js';
import { loadPackFromDirectory } from './loader.js';
import type { Event } from '../types/event.js';
import type { Policy } from '../types/policy.js';

const fuzzPolicy: Policy = {
  version: '0.1',
  defaults: { decision: 'allow' },
  rules: [],
};

const fuzzPolicyYaml = `version: "0.1"
defaults:
  decision: allow
rules: []
`;

function makeEvents(): Event[] {
  return [
    {
      event_id: '11111111-1111-4000-a000-000000000001',
      ts: '2026-01-15T10:00:00.000Z',
      type: 'run.start',
      actor: 'fuzz-agent',
      payload: { step: 1 },
    },
    {
      event_id: '11111111-1111-4000-a000-000000000002',
      ts: '2026-01-15T10:00:01.000Z',
      type: 'run.end',
      actor: 'fuzz-agent',
      payload: { step: 2 },
    },
  ];
}

function writePackDir(): string {
  const seed = new Uint8Array(32);
  seed[0] = 0x44;
  const keypair = keypairFromSeed(seed);
  const events = makeEvents();
  const decisions = evaluateAll(events, fuzzPolicy);
  const pack = generatePack({
    runId: '11111111-1111-4000-a000-000000000000',
    createdAt: '2026-01-15T10:00:00.000Z',
    producerName: 'fuzz-test',
    producerVersion: '0.1.0',
    events,
    policy: fuzzPolicy,
    policyYaml: fuzzPolicyYaml,
    decisions,
    keypair,
  });

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'proofpack-loader-fuzz-'));
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

describe('loadPackFromDirectory malformed/fuzz handling', () => {
  it('rejects malformed JSON in manifest', () => {
    const dir = writePackDir();
    try {
      fs.writeFileSync(path.join(dir, 'manifest.json'), '{not valid json');
      expect(() => loadPackFromDirectory(dir)).toThrow();
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('rejects malformed JSONL in events', () => {
    const dir = writePackDir();
    try {
      fs.writeFileSync(path.join(dir, 'events', 'events.jsonl'), '{"x":1}\n{bad json}\n');
      expect(() => loadPackFromDirectory(dir)).toThrow();
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('rejects random-byte corruption across critical files without crashing', () => {
    const targets = [
      ['manifest.json'],
      ['receipt.json'],
      ['events', 'events.jsonl'],
      ['policy', 'decisions.jsonl'],
      ['audit', 'merkle.json'],
    ] as const;

    for (let i = 0; i < 25; i++) {
      const dir = writePackDir();
      try {
        const target = targets[i % targets.length]!;
        const bytes = Buffer.alloc(256);
        for (let j = 0; j < bytes.length; j++) {
          bytes[j] = (i * 31 + j * 17) % 256;
        }
        fs.writeFileSync(path.join(dir, ...target), bytes);
        expect(() => loadPackFromDirectory(dir)).toThrow();
      } finally {
        fs.rmSync(dir, { recursive: true, force: true });
      }
    }
  });
});
