import { execSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

function execOrThrowZipError(command: string, context: string): string {
  try {
    return execSync(command, { encoding: 'utf-8', stdio: 'pipe' });
  } catch (err) {
    const error = err as { stderr?: Buffer | string };
    const stderr = error.stderr ? String(error.stderr) : '';
    throw new InvalidZipError(context, stderr.trim());
  }
}

/**
 * Extract a zip buffer to a temporary directory.
 * Returns the path to the extracted directory.
 *
 * Includes zip-slip protection: rejects entries that resolve outside
 * the extraction directory.
 */
export function unzipToTemp(zipBuffer: Buffer): string {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'proofpack-'));
  const zipPath = path.join(tmpDir, 'upload.zip');
  const extractDir = path.join(tmpDir, 'extracted');
  fs.mkdirSync(extractDir);
  fs.chmodSync(tmpDir, 0o700);
  fs.chmodSync(extractDir, 0o700);

  fs.writeFileSync(zipPath, zipBuffer, { mode: 0o600 });

  // List entries first to check for zip-slip
  const listing = execOrThrowZipError(`unzip -l "${zipPath}"`, 'listing zip entries');
  const lines = listing.split('\n');
  for (const line of lines) {
    // unzip -l format: "  length  date time  name"
    const match = /\d{2}:\d{2}\s+(.+)$/.exec(line);
    if (!match?.[1]) continue;
    const entryPath = match[1].trim();
    if (!entryPath || entryPath === 'Name' || entryPath.startsWith('---')) continue;

    const resolved = path.resolve(extractDir, entryPath);
    if (!resolved.startsWith(extractDir + path.sep) && resolved !== extractDir) {
      // Clean up and throw
      fs.rmSync(tmpDir, { recursive: true, force: true });
      throw new ZipSlipError(entryPath);
    }
  }

  execOrThrowZipError(`unzip -qo "${zipPath}" -d "${extractDir}"`, 'extracting zip archive');
  fs.unlinkSync(zipPath);

  return extractDir;
}

/**
 * Find the pack root directory inside an extracted zip.
 * Handles both flat zips (files at root) and nested zips (single dir at root).
 */
export function findPackRoot(extractedDir: string): string {
  const entries = fs.readdirSync(extractedDir);

  // If manifest.json exists at root, this is the pack root
  if (entries.includes('manifest.json')) {
    return extractedDir;
  }

  // Check for a single subdirectory containing manifest.json
  const dirs = entries.filter((e) => fs.statSync(path.join(extractedDir, e)).isDirectory());
  if (dirs.length === 1) {
    const subdir = path.join(extractedDir, dirs[0]!);
    if (fs.existsSync(path.join(subdir, 'manifest.json'))) {
      return subdir;
    }
  }

  throw new Error('Cannot find manifest.json in uploaded zip');
}

/**
 * Create a zip buffer from a directory.
 */
export function zipDirectory(dir: string): Buffer {
  // Use a unique temp dir to avoid collisions between parallel calls
  const tmpZipDir = fs.mkdtempSync(path.join(os.tmpdir(), 'proofpack-out-'));
  const tmpZip = path.join(tmpZipDir, 'output.zip');
  fs.chmodSync(tmpZipDir, 0o700);

  try {
    execSync(`cd "${dir}" && zip -qr "${tmpZip}" .`, { stdio: 'pipe' });
    const buffer = fs.readFileSync(tmpZip);
    return buffer;
  } finally {
    fs.rmSync(tmpZipDir, { recursive: true, force: true });
  }
}

/**
 * Write a PackContents to a temporary directory and zip it.
 */
export function zipPack(
  raw: Record<string, Uint8Array>,
  inclusionProofs: Array<{ event_id: string }>,
  canonicalizeString: (obj: unknown) => string,
): Buffer {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'proofpack-zip-'));
  fs.chmodSync(tmpDir, 0o700);

  fs.mkdirSync(path.join(tmpDir, 'events'), { recursive: true });
  fs.mkdirSync(path.join(tmpDir, 'policy'), { recursive: true });
  fs.mkdirSync(path.join(tmpDir, 'audit', 'inclusion_proofs'), { recursive: true });

  fs.writeFileSync(path.join(tmpDir, 'manifest.json'), raw.manifest!);
  fs.writeFileSync(path.join(tmpDir, 'receipt.json'), raw.receipt!);
  fs.writeFileSync(path.join(tmpDir, 'events', 'events.jsonl'), raw.events!);
  fs.writeFileSync(path.join(tmpDir, 'policy', 'policy.yml'), raw.policy!);
  fs.writeFileSync(path.join(tmpDir, 'policy', 'decisions.jsonl'), raw.decisions!);
  fs.writeFileSync(path.join(tmpDir, 'audit', 'merkle.json'), raw.merkle!);

  for (const proof of inclusionProofs) {
    const proofPath = path.join(tmpDir, 'audit', 'inclusion_proofs', `${proof.event_id}.json`);
    fs.writeFileSync(proofPath, canonicalizeString(proof) + '\n');
  }

  const buffer = zipDirectory(tmpDir);
  fs.rmSync(tmpDir, { recursive: true, force: true });
  return buffer;
}

export class ZipSlipError extends Error {
  constructor(entryPath: string) {
    super(`Zip-slip detected: entry "${entryPath}" resolves outside extraction directory`);
    this.name = 'ZipSlipError';
  }
}

export class InvalidZipError extends Error {
  constructor(context: string, stderr?: string) {
    super(`Invalid zip while ${context}${stderr ? `: ${stderr.split('\n')[0]}` : ''}`.trim());
    this.name = 'InvalidZipError';
  }
}

/**
 * Clean up a temporary directory. Safe to call even if dir doesn't exist.
 */
export function cleanupTemp(dir: string): void {
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch {
    // Ignore cleanup errors
  }
}
