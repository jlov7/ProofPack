import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { canonicalizeString } from '@proofpack/core';
import { buildDemoPack } from '../routes/demo.js';
import { cleanupTemp, findPackRoot, unzipToTemp, zipPack } from './zip.js';

describe('zip utilities', () => {
  it('round-trips a valid pack zip and discovers root directory', async () => {
    const pack = buildDemoPack();
    const zip = await zipPack(
      pack.raw as unknown as Record<string, Uint8Array>,
      pack.inclusionProofs,
      canonicalizeString,
    );
    const extracted = await unzipToTemp(zip);

    try {
      const root = findPackRoot(extracted);
      expect(fs.existsSync(path.join(root, 'manifest.json'))).toBe(true);
      expect(fs.existsSync(path.join(root, 'receipt.json'))).toBe(true);
    } finally {
      cleanupTemp(extracted);
    }
  });

  it('applies hardened temporary directory permissions and cleanup', async () => {
    const pack = buildDemoPack();
    const zip = await zipPack(
      pack.raw as unknown as Record<string, Uint8Array>,
      pack.inclusionProofs,
      canonicalizeString,
    );
    const extracted = await unzipToTemp(zip);

    const extractedStats = fs.statSync(extracted);
    const mode = extractedStats.mode & 0o777;
    expect(mode).toBe(0o700);

    cleanupTemp(extracted);
    expect(fs.existsSync(extracted)).toBe(false);
  });

  it('throws for malformed zip bytes', async () => {
    await expect(unzipToTemp(Buffer.from('not-a-zip'))).rejects.toThrow();
  });

  it('cleanupTemp is safe on missing directories', () => {
    expect(() => cleanupTemp('/tmp/definitely-does-not-exist-proofpack')).not.toThrow();
  });
});
