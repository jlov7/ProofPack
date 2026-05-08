import archiver from 'archiver';
import { describe, expect, it } from 'vitest';
import { canonicalizeString } from '../crypto/canonical.js';
import { evaluateAll } from '../policy/engine.js';
import { keypairFromSeed } from '../crypto/ed25519.js';
import { generatePack } from './generator.js';
import {
  cleanupExtractedPack,
  extractPackZipToTemp,
  PackArchiveError,
  zipRawPackToBuffer,
} from './archive.js';
import { loadPackFromDirectory } from './loader.js';
import type { Event } from '../types/event.js';
import type { Policy } from '../types/policy.js';

function zipEntries(entries: Array<{ name: string; content: string }>): Promise<Buffer> {
  const archive = archiver('zip');
  const chunks: Buffer[] = [];
  archive.on('data', (chunk: Buffer) => chunks.push(chunk));
  const done = new Promise<Buffer>((resolve, reject) => {
    archive.once('error', reject);
    archive.once('end', () => resolve(Buffer.concat(chunks)));
  });
  for (const entry of entries) archive.append(entry.content, { name: entry.name });
  void archive.finalize();
  return done;
}

function storedEmptyZip(entryName: string): Buffer {
  const name = Buffer.from(entryName);
  const local = Buffer.alloc(30 + name.length);
  local.writeUInt32LE(0x04034b50, 0);
  local.writeUInt16LE(20, 4);
  local.writeUInt16LE(0, 6);
  local.writeUInt16LE(0, 8);
  local.writeUInt16LE(0, 10);
  local.writeUInt16LE(0, 12);
  local.writeUInt32LE(0, 14);
  local.writeUInt32LE(0, 18);
  local.writeUInt32LE(0, 22);
  local.writeUInt16LE(name.length, 26);
  local.writeUInt16LE(0, 28);
  name.copy(local, 30);

  const central = Buffer.alloc(46 + name.length);
  central.writeUInt32LE(0x02014b50, 0);
  central.writeUInt16LE(20, 4);
  central.writeUInt16LE(20, 6);
  central.writeUInt16LE(0, 8);
  central.writeUInt16LE(0, 10);
  central.writeUInt16LE(0, 12);
  central.writeUInt16LE(0, 14);
  central.writeUInt32LE(0, 16);
  central.writeUInt32LE(0, 20);
  central.writeUInt32LE(0, 24);
  central.writeUInt16LE(name.length, 28);
  central.writeUInt16LE(0, 30);
  central.writeUInt16LE(0, 32);
  central.writeUInt16LE(0, 34);
  central.writeUInt16LE(0, 36);
  central.writeUInt32LE(0, 38);
  central.writeUInt32LE(0, 42);
  name.copy(central, 46);

  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(1, 8);
  end.writeUInt16LE(1, 10);
  end.writeUInt32LE(central.length, 12);
  end.writeUInt32LE(local.length, 16);
  end.writeUInt16LE(0, 20);

  return Buffer.concat([local, central, end]);
}

function storedZipWithCentralAttributes(entryName: string, externalFileAttributes: number): Buffer {
  const buffer = storedEmptyZip(entryName);
  const centralOffset = 30 + Buffer.byteLength(entryName);
  buffer.writeUInt32LE(externalFileAttributes >>> 0, centralOffset + 38);
  return buffer;
}

const policy: Policy = {
  version: '0.1',
  defaults: { decision: 'allow' },
  rules: [],
};

const policyYaml = `version: "0.1"
defaults:
  decision: allow
rules: []
`;

function makePack() {
  const seed = new Uint8Array(32);
  seed[0] = 0x77;
  const events: Event[] = [
    {
      event_id: '10000000-0000-4000-a000-000000000001',
      ts: '2026-01-15T10:00:00.000Z',
      type: 'run.start',
      actor: 'agent',
      payload: { model: 'test' },
    },
  ];
  return generatePack({
    runId: '10000000-0000-4000-a000-000000000000',
    createdAt: '2026-01-15T10:00:00.000Z',
    producerName: 'archive-test',
    producerVersion: '0.1.0',
    events,
    policy,
    policyYaml,
    decisions: evaluateAll(events, policy),
    keypair: keypairFromSeed(seed),
  });
}

describe('pack archive utilities', () => {
  it('round-trips a generated pack without shell zip commands', async () => {
    const pack = makePack();
    const zip = await zipRawPackToBuffer(
      pack.raw as unknown as Record<string, Uint8Array>,
      pack.inclusionProofs,
      canonicalizeString,
    );
    const extracted = await extractPackZipToTemp(zip);
    try {
      const loaded = loadPackFromDirectory(extracted.packRoot);
      expect(loaded.manifest.run_id).toBe(pack.manifest.run_id);
      expect(loaded.events).toHaveLength(1);
    } finally {
      cleanupExtractedPack(extracted);
    }
  });

  it('rejects zip-slip paths before extraction', async () => {
    const zip = storedEmptyZip('../manifest.json');
    await expect(extractPackZipToTemp(zip)).rejects.toMatchObject({
      code: 'ZIP_SLIP',
    } satisfies Partial<PackArchiveError>);
  });

  it('rejects excessive entry counts', async () => {
    const zip = await zipEntries([
      { name: 'manifest.json', content: '{}' },
      { name: 'receipt.json', content: '{}' },
    ]);
    await expect(
      extractPackZipToTemp(zip, {
        maxEntries: 1,
        maxEntryBytes: 1024 * 1024,
        maxCompressedBytes: 1024 * 1024,
        maxUncompressedBytes: 1024 * 1024,
        maxCompressionRatio: 100,
      }),
    ).rejects.toMatchObject({ code: 'ZIP_ENTRY_LIMIT' });
  });

  it('rejects entries that exceed the per-file size limit', async () => {
    const zip = await zipEntries([{ name: 'events/events.jsonl', content: '0123456789' }]);
    await expect(
      extractPackZipToTemp(zip, {
        maxEntries: 10,
        maxEntryBytes: 4,
        maxCompressedBytes: 1024 * 1024,
        maxUncompressedBytes: 1024 * 1024,
        maxCompressionRatio: 100,
      }),
    ).rejects.toMatchObject({ code: 'ZIP_ENTRY_SIZE_LIMIT' });
  });

  it('rejects duplicate archive entries', async () => {
    const zip = await zipEntries([
      { name: 'manifest.json', content: '{}' },
      { name: 'manifest.json', content: '{}' },
    ]);
    await expect(extractPackZipToTemp(zip)).rejects.toMatchObject({
      code: 'ZIP_DUPLICATE_ENTRY',
    } satisfies Partial<PackArchiveError>);
  });

  it('rejects symlink entries', async () => {
    const symlinkAttributes = 0o120000 << 16;
    const zip = storedZipWithCentralAttributes('manifest.json', symlinkAttributes);
    await expect(extractPackZipToTemp(zip)).rejects.toMatchObject({
      code: 'ZIP_UNSUPPORTED_ENTRY',
    } satisfies Partial<PackArchiveError>);
  });
});
