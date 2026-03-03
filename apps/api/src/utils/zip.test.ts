import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { canonicalizeString } from '@proofpack/core';
import { buildDemoPack } from '../routes/demo.js';
import { cleanupTemp, findPackRoot, unzipToTemp, zipPack, zipDirectory } from './zip.js';

describe('zip utilities', () => {
  it('round-trips a valid pack zip and discovers root directory', () => {
    const pack = buildDemoPack();
    const zip = zipPack(
      pack.raw as unknown as Record<string, Uint8Array>,
      pack.inclusionProofs,
      canonicalizeString,
    );
    const extracted = unzipToTemp(zip);

    try {
      const root = findPackRoot(extracted);
      expect(fs.existsSync(path.join(root, 'manifest.json'))).toBe(true);
      expect(fs.existsSync(path.join(root, 'receipt.json'))).toBe(true);
    } finally {
      cleanupTemp(extracted);
    }
  });

  it('applies hardened temporary directory permissions and cleanup', () => {
    const pack = buildDemoPack();
    const zip = zipPack(
      pack.raw as unknown as Record<string, Uint8Array>,
      pack.inclusionProofs,
      canonicalizeString,
    );
    const extracted = unzipToTemp(zip);

    const extractedStats = fs.statSync(extracted);
    const mode = extractedStats.mode & 0o777;
    expect(mode).toBe(0o700);

    cleanupTemp(extracted);
    expect(fs.existsSync(extracted)).toBe(false);
  });

  it('throws for malformed zip bytes', () => {
    expect(() => unzipToTemp(Buffer.from('not-a-zip'))).toThrow();
  });

  it('cleanupTemp is safe on missing directories', () => {
    expect(() => cleanupTemp('/tmp/definitely-does-not-exist-proofpack')).not.toThrow();
  });

  it('zipDirectory creates a zip artifact from a directory', () => {
    const pack = buildDemoPack();
    const extracted = unzipToTemp(
      zipPack(
        pack.raw as unknown as Record<string, Uint8Array>,
        pack.inclusionProofs,
        canonicalizeString,
      ),
    );

    try {
      const root = findPackRoot(extracted);
      const zip = zipDirectory(root);
      expect(zip.byteLength).toBeGreaterThan(1024);
    } finally {
      cleanupTemp(extracted);
    }
  });
});
