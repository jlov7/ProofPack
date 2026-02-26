import { NextResponse } from 'next/server';
import {
  loadPackFromDirectory,
  redactPack,
  generatePack,
  keypairFromSeed,
  canonicalizeString,
} from '@proofpack/core';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { execSync } from 'node:child_process';

/** Ephemeral keypair for re-signing public packs */
const ephemeralSeed = new Uint8Array(32);
ephemeralSeed[0] = 0xaa;
ephemeralSeed[1] = 0xbb;
ephemeralSeed[2] = 0xcc;
const ephemeralKeypair = keypairFromSeed(ephemeralSeed);

function unzipBuffer(zipBuffer: Buffer): string {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'proofpack-web-'));
  const zipPath = path.join(tmpDir, 'upload.zip');
  const extractDir = path.join(tmpDir, 'extracted');
  fs.mkdirSync(extractDir);
  fs.writeFileSync(zipPath, zipBuffer);
  execSync(`unzip -qo "${zipPath}" -d "${extractDir}"`);
  fs.unlinkSync(zipPath);
  return extractDir;
}

function findPackRoot(dir: string): string {
  const entries = fs.readdirSync(dir);
  if (entries.includes('manifest.json')) return dir;
  const dirs = entries.filter((e) => fs.statSync(path.join(dir, e)).isDirectory());
  if (dirs.length === 1) {
    const sub = path.join(dir, dirs[0]!);
    if (fs.existsSync(path.join(sub, 'manifest.json'))) return sub;
  }
  throw new Error('Cannot find manifest.json in uploaded zip');
}

function zipPackToBuffer(
  raw: Record<string, Uint8Array>,
  inclusionProofs: Array<{ event_id: string }>,
): Buffer {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'proofpack-redact-'));
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

  const tmpZipDir = fs.mkdtempSync(path.join(os.tmpdir(), 'proofpack-out-'));
  const tmpZip = path.join(tmpZipDir, 'output.zip');
  try {
    execSync(`cd "${tmpDir}" && zip -qr "${tmpZip}" .`, { stdio: 'pipe' });
    return fs.readFileSync(tmpZip);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    fs.rmSync(tmpZipDir, { recursive: true, force: true });
  }
}

export async function POST(request: Request) {
  let tmpDir: string | null = null;

  try {
    const formData = await request.formData();
    const file = formData.get('file');
    if (!file || !(file instanceof Blob)) {
      return NextResponse.json(
        { ok: false, error: { code: 'MISSING_FILE', message: 'No file uploaded' } },
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const extractDir = unzipBuffer(buffer);
    tmpDir = path.dirname(extractDir);

    const packRoot = findPackRoot(extractDir);
    const pack = loadPackFromDirectory(packRoot);
    const { publicPack, openings } = redactPack(pack);

    const publicGenerated = generatePack({
      runId: pack.manifest.run_id,
      createdAt: pack.manifest.created_at,
      producerName: pack.manifest.producer.name,
      producerVersion: pack.manifest.producer.version,
      events: publicPack.events,
      policy: pack.policy,
      policyYaml: new TextDecoder().decode(pack.raw.policy),
      decisions: pack.decisions,
      keypair: ephemeralKeypair,
      openings,
    });

    const zipBuffer = zipPackToBuffer(
      publicGenerated.raw as unknown as Record<string, Uint8Array>,
      publicGenerated.inclusionProofs,
    );

    return new NextResponse(new Uint8Array(zipBuffer), {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': 'attachment; filename="public.proofpack.zip"',
      },
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: { code: 'REDACT_FAILED', message: err instanceof Error ? err.message : String(err) },
      },
      { status: 400 },
    );
  } finally {
    if (tmpDir) {
      try {
        fs.rmSync(tmpDir, { recursive: true });
      } catch {
        /* ignore */
      }
    }
  }
}
