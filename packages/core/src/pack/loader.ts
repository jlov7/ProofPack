import * as fs from 'node:fs';
import * as path from 'node:path';
import * as yaml from 'js-yaml';
import { ManifestSchema } from '../types/manifest.js';
import { ReceiptSchema } from '../types/receipt.js';
import { EventSchema } from '../types/event.js';
import { PolicySchema } from '../types/policy.js';
import { DecisionSchema } from '../types/policy.js';
import { MerkleFileSchema } from '../types/merkle.js';
import { InclusionProofFileSchema } from '../types/merkle.js';
import type { PackContents, Opening } from './types.js';

function readFile(dir: string, ...segments: string[]): Uint8Array {
  const filePath = path.join(dir, ...segments);
  const normalized = path.normalize(filePath);
  // Zip-slip protection: ensure resolved path stays within the pack directory
  const resolved = path.resolve(normalized);
  const resolvedDir = path.resolve(dir);
  if (!resolved.startsWith(resolvedDir + path.sep) && resolved !== resolvedDir) {
    throw new Error(`Path traversal detected: ${filePath}`);
  }
  return new Uint8Array(fs.readFileSync(resolved));
}

function parseJsonl<T>(bytes: Uint8Array, parse: (obj: unknown) => T): T[] {
  const text = new TextDecoder().decode(bytes);
  return text
    .split('\n')
    .filter((line) => line.trim().length > 0)
    .map((line) => parse(JSON.parse(line)));
}

/**
 * Load a ProofPack from a directory.
 * Validates all files against their Zod schemas.
 */
export function loadPackFromDirectory(dir: string): PackContents {
  const decoder = new TextDecoder();

  // Read raw file bytes
  const manifestBytes = readFile(dir, 'manifest.json');
  const receiptBytes = readFile(dir, 'receipt.json');
  const eventsBytes = readFile(dir, 'events', 'events.jsonl');
  const policyBytes = readFile(dir, 'policy', 'policy.yml');
  const decisionsBytes = readFile(dir, 'policy', 'decisions.jsonl');
  const merkleBytes = readFile(dir, 'audit', 'merkle.json');

  // Parse and validate
  const manifest = ManifestSchema.parse(JSON.parse(decoder.decode(manifestBytes)));
  const receipt = ReceiptSchema.parse(JSON.parse(decoder.decode(receiptBytes)));
  const events = parseJsonl(eventsBytes, (obj) => EventSchema.parse(obj));
  const policy = PolicySchema.parse(yaml.load(decoder.decode(policyBytes)));
  const decisions = parseJsonl(decisionsBytes, (obj) => DecisionSchema.parse(obj));
  const merkleFile = MerkleFileSchema.parse(JSON.parse(decoder.decode(merkleBytes)));

  // Load inclusion proofs
  const inclusionProofs = events.map((event) => {
    const proofBytes = readFile(dir, 'audit', 'inclusion_proofs', `${event.event_id}.json`);
    return InclusionProofFileSchema.parse(JSON.parse(decoder.decode(proofBytes)));
  });

  // Load optional openings
  let openings: Opening[] | undefined;
  const openingsPath = path.join(dir, 'disclosure', 'openings.json');
  if (fs.existsSync(openingsPath)) {
    const openingsBytes = readFile(dir, 'disclosure', 'openings.json');
    openings = JSON.parse(decoder.decode(openingsBytes)) as Opening[];
  }

  return {
    raw: {
      manifest: manifestBytes,
      receipt: receiptBytes,
      events: eventsBytes,
      policy: policyBytes,
      decisions: decisionsBytes,
      merkle: merkleBytes,
    },
    manifest,
    receipt,
    events,
    policy,
    decisions,
    merkleFile,
    inclusionProofs,
    openings,
  };
}
