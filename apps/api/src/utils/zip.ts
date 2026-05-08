import * as fs from 'node:fs';
import * as path from 'node:path';
import { cleanupExtractedPack, extractPackZipToTemp, zipRawPackToBuffer } from '@proofpack/core';
import type { InclusionProofFile } from '@proofpack/core';

export async function unzipToTemp(zipBuffer: Buffer): Promise<string> {
  const extracted = await extractPackZipToTemp(zipBuffer);
  return extracted.extractDir;
}

export function findPackRoot(extractedDir: string): string {
  const entries = fs.readdirSync(extractedDir);
  if (entries.includes('manifest.json')) return extractedDir;

  const dirs = entries.filter((entry) => fs.statSync(path.join(extractedDir, entry)).isDirectory());
  if (dirs.length === 1) {
    const subdir = path.join(extractedDir, dirs[0]!);
    if (fs.existsSync(path.join(subdir, 'manifest.json'))) return subdir;
  }

  throw new Error('Cannot find manifest.json in uploaded zip');
}

export async function zipPack(
  raw: Record<string, Uint8Array>,
  inclusionProofs: InclusionProofFile[],
  canonicalizeString: (obj: unknown) => string,
): Promise<Buffer> {
  return zipRawPackToBuffer(raw, inclusionProofs, canonicalizeString);
}

export function cleanupTemp(dir: string): void {
  const target = path.basename(dir) === 'extracted' ? path.dirname(dir) : dir;
  cleanupExtractedPack({ tmpDir: target });
}
