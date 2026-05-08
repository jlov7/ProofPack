import archiver from 'archiver';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { pipeline } from 'node:stream/promises';
import yauzl from 'yauzl';
import type { InclusionProofFile } from '../types/merkle.js';

export interface ZipSafetyLimits {
  maxEntries: number;
  maxEntryBytes: number;
  maxCompressedBytes: number;
  maxUncompressedBytes: number;
  maxCompressionRatio: number;
}

export const DEFAULT_ZIP_SAFETY_LIMITS: ZipSafetyLimits = {
  maxEntries: 2_500,
  maxEntryBytes: 25 * 1024 * 1024,
  maxCompressedBytes: 50 * 1024 * 1024,
  maxUncompressedBytes: 200 * 1024 * 1024,
  maxCompressionRatio: 100,
};

export class PackArchiveError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'PackArchiveError';
  }
}

export function packArchiveErrorHint(code: string): string {
  switch (code) {
    case 'PAYLOAD_TOO_LARGE':
      return 'Upload a smaller .proofpack.zip or raise the configured archive limits.';
    case 'ZIP_ENTRY_LIMIT':
      return 'Reduce the number of files in the archive and regenerate the ProofPack.';
    case 'ZIP_ENTRY_SIZE_LIMIT':
    case 'ZIP_SIZE_LIMIT':
      return 'Remove unexpectedly large files and regenerate the ProofPack archive.';
    case 'ZIP_COMPRESSION_RATIO':
      return 'The archive looks like a zip bomb; regenerate it with normal compression.';
    case 'ZIP_SLIP':
    case 'ZIP_UNSUPPORTED_ENTRY':
    case 'ZIP_DUPLICATE_ENTRY':
      return 'Regenerate the archive with plain files under the ProofPack root.';
    case 'INVALID_PACK':
      return 'Ensure the zip contains a valid ProofPack directory with manifest.json at the root or one top-level folder.';
    default:
      return 'Upload a valid .proofpack.zip file.';
  }
}

export interface ExtractedPackZip {
  tmpDir: string;
  extractDir: string;
  packRoot: string;
}

function ensureSafeEntryName(entryName: string): void {
  if (!entryName || entryName.includes('\0')) {
    throw new PackArchiveError('INVALID_ZIP_ENTRY', 'Zip contains an invalid entry name');
  }
  if (entryName.includes('\\')) {
    throw new PackArchiveError('ZIP_SLIP', `Zip entry uses unsafe path separators: ${entryName}`);
  }
  if (path.posix.isAbsolute(entryName)) {
    throw new PackArchiveError('ZIP_SLIP', `Zip entry is absolute: ${entryName}`);
  }
  const normalized = path.posix.normalize(entryName);
  if (normalized === '..' || normalized.startsWith('../') || normalized.includes('/../')) {
    throw new PackArchiveError('ZIP_SLIP', `Zip entry escapes extraction root: ${entryName}`);
  }
}

function isSymlinkEntry(entry: yauzl.Entry): boolean {
  const unixMode = entry.externalFileAttributes >>> 16;
  return (unixMode & 0o170000) === 0o120000;
}

function findPackRoot(extractedDir: string): string {
  const entries = fs.readdirSync(extractedDir);
  if (entries.includes('manifest.json')) return extractedDir;

  const dirs = entries.filter((entry) => fs.statSync(path.join(extractedDir, entry)).isDirectory());
  if (dirs.length === 1) {
    const subdir = path.join(extractedDir, dirs[0]!);
    if (fs.existsSync(path.join(subdir, 'manifest.json'))) return subdir;
  }

  throw new PackArchiveError('INVALID_PACK', 'Cannot find manifest.json in uploaded ProofPack zip');
}

function openZip(buffer: Buffer): Promise<yauzl.ZipFile> {
  return new Promise((resolve, reject) => {
    yauzl.fromBuffer(buffer, { lazyEntries: true, validateEntrySizes: true }, (err, zipfile) => {
      if (err) {
        const code = err.message.toLowerCase().includes('relative path')
          ? 'ZIP_SLIP'
          : 'INVALID_ZIP';
        reject(new PackArchiveError(code, err.message));
        return;
      }
      if (!zipfile) {
        reject(new PackArchiveError('INVALID_ZIP', 'Unable to open zip archive'));
        return;
      }
      resolve(zipfile);
    });
  });
}

function openReadStream(
  zipfile: yauzl.ZipFile,
  entry: yauzl.Entry,
): Promise<NodeJS.ReadableStream> {
  return new Promise((resolve, reject) => {
    zipfile.openReadStream(entry, (err, stream) => {
      if (err) {
        reject(new PackArchiveError('INVALID_ZIP', err.message));
        return;
      }
      if (!stream) {
        reject(new PackArchiveError('INVALID_ZIP', `Unable to read ${entry.fileName}`));
        return;
      }
      resolve(stream);
    });
  });
}

export async function extractPackZipToTemp(
  zipBuffer: Uint8Array,
  limits: ZipSafetyLimits = DEFAULT_ZIP_SAFETY_LIMITS,
): Promise<ExtractedPackZip> {
  const buffer = Buffer.from(zipBuffer);
  if (buffer.byteLength > limits.maxCompressedBytes) {
    throw new PackArchiveError(
      'PAYLOAD_TOO_LARGE',
      `Zip upload exceeds ${limits.maxCompressedBytes} byte compressed limit`,
    );
  }

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'proofpack-'));
  const extractDir = path.join(tmpDir, 'extracted');
  fs.mkdirSync(extractDir, { recursive: true, mode: 0o700 });
  fs.chmodSync(tmpDir, 0o700);

  let zipfile: yauzl.ZipFile | undefined;
  let entryCount = 0;
  let uncompressedTotal = 0;
  const seenEntries = new Set<string>();

  try {
    zipfile = await openZip(buffer);

    await new Promise<void>((resolve, reject) => {
      zipfile!.on('entry', async (entry: yauzl.Entry) => {
        try {
          entryCount++;
          if (entryCount > limits.maxEntries) {
            throw new PackArchiveError(
              'ZIP_ENTRY_LIMIT',
              `Zip contains more than ${limits.maxEntries} entries`,
            );
          }

          ensureSafeEntryName(entry.fileName);
          if (isSymlinkEntry(entry)) {
            throw new PackArchiveError(
              'ZIP_UNSUPPORTED_ENTRY',
              `Zip entry is a symlink: ${entry.fileName}`,
            );
          }
          const normalizedEntryName = path.posix.normalize(entry.fileName);
          if (seenEntries.has(normalizedEntryName)) {
            throw new PackArchiveError(
              'ZIP_DUPLICATE_ENTRY',
              `Zip contains a duplicate entry: ${entry.fileName}`,
            );
          }
          seenEntries.add(normalizedEntryName);

          if (entry.uncompressedSize > limits.maxEntryBytes) {
            throw new PackArchiveError(
              'ZIP_ENTRY_SIZE_LIMIT',
              `Zip entry exceeds ${limits.maxEntryBytes} bytes: ${entry.fileName}`,
            );
          }
          uncompressedTotal += entry.uncompressedSize;
          if (uncompressedTotal > limits.maxUncompressedBytes) {
            throw new PackArchiveError(
              'ZIP_SIZE_LIMIT',
              `Zip expands beyond ${limits.maxUncompressedBytes} bytes`,
            );
          }
          if (
            (entry.compressedSize === 0 && entry.uncompressedSize > 0) ||
            (entry.compressedSize > 0 &&
              entry.uncompressedSize / entry.compressedSize > limits.maxCompressionRatio)
          ) {
            throw new PackArchiveError(
              'ZIP_COMPRESSION_RATIO',
              `Zip entry compression ratio is too high: ${entry.fileName}`,
            );
          }

          const resolved = path.resolve(extractDir, entry.fileName);
          if (!resolved.startsWith(extractDir + path.sep) && resolved !== extractDir) {
            throw new PackArchiveError(
              'ZIP_SLIP',
              `Zip entry escapes extraction root: ${entry.fileName}`,
            );
          }

          if (entry.fileName.endsWith('/')) {
            fs.mkdirSync(resolved, { recursive: true, mode: 0o700 });
          } else {
            fs.mkdirSync(path.dirname(resolved), { recursive: true, mode: 0o700 });
            const stream = await openReadStream(zipfile!, entry);
            await pipeline(stream, fs.createWriteStream(resolved, { mode: 0o600 }));
          }

          zipfile!.readEntry();
        } catch (err) {
          reject(err);
        }
      });
      zipfile!.once('end', () => resolve());
      zipfile!.once('error', (err) => {
        const code = err.message.toLowerCase().includes('relative path')
          ? 'ZIP_SLIP'
          : 'INVALID_ZIP';
        reject(new PackArchiveError(code, err.message));
      });
      zipfile!.readEntry();
    });

    return { tmpDir, extractDir, packRoot: findPackRoot(extractDir) };
  } catch (err) {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    throw err;
  } finally {
    zipfile?.close();
  }
}

export function cleanupExtractedPack(extracted: Pick<ExtractedPackZip, 'tmpDir'>): void {
  fs.rmSync(extracted.tmpDir, { recursive: true, force: true });
}

export async function zipRawPackToBuffer(
  raw: Record<string, Uint8Array>,
  inclusionProofs: InclusionProofFile[],
  canonicalizeString: (obj: unknown) => string,
  openings?: unknown[],
): Promise<Buffer> {
  const archive = archiver('zip', { zlib: { level: 9 } });
  const chunks: Buffer[] = [];

  archive.on('data', (chunk: Buffer) => chunks.push(chunk));

  const finished = new Promise<Buffer>((resolve, reject) => {
    archive.once('error', reject);
    archive.once('end', () => resolve(Buffer.concat(chunks)));
  });

  archive.append(Buffer.from(raw.manifest!), { name: 'manifest.json' });
  archive.append(Buffer.from(raw.receipt!), { name: 'receipt.json' });
  archive.append(Buffer.from(raw.events!), { name: 'events/events.jsonl' });
  archive.append(Buffer.from(raw.policy!), { name: 'policy/policy.yml' });
  archive.append(Buffer.from(raw.decisions!), { name: 'policy/decisions.jsonl' });
  archive.append(Buffer.from(raw.merkle!), { name: 'audit/merkle.json' });

  for (const proof of inclusionProofs) {
    archive.append(canonicalizeString(proof) + '\n', {
      name: `audit/inclusion_proofs/${proof.event_id}.json`,
    });
  }

  if (openings && openings.length > 0) {
    archive.append(canonicalizeString(openings) + '\n', { name: 'disclosure/openings.json' });
  }

  await archive.finalize();
  return finished;
}
