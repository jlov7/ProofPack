import { NextResponse } from 'next/server';
import { loadPackFromDirectory, verifyPack } from '@proofpack/core';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { execSync } from 'node:child_process';

function unzipBuffer(zipBuffer: Buffer): string {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'proofpack-web-'));
  const zipPath = path.join(tmpDir, 'upload.zip');
  const extractDir = path.join(tmpDir, 'extracted');
  fs.mkdirSync(extractDir);
  fs.writeFileSync(zipPath, zipBuffer);

  // Zip-slip protection
  const listing = execSync(`unzip -l "${zipPath}"`, { encoding: 'utf-8' });
  for (const line of listing.split('\n')) {
    const match = /\d{2}:\d{2}\s+(.+)$/.exec(line);
    if (!match?.[1]) continue;
    const entryPath = match[1].trim();
    if (!entryPath || entryPath === 'Name' || entryPath.startsWith('---')) continue;
    const resolved = path.resolve(extractDir, entryPath);
    if (!resolved.startsWith(extractDir + path.sep) && resolved !== extractDir) {
      fs.rmSync(tmpDir, { recursive: true });
      return NextResponse.json(
        { ok: false, error: { code: 'ZIP_SLIP', message: 'Malicious zip path detected' } },
        { status: 400 },
      ) as never;
    }
  }

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

export async function POST(request: Request) {
  let tmpDir: string | null = null;

  try {
    const formData = await request.formData();
    const file = formData.get('file');
    if (!file || !(file instanceof Blob)) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: 'MISSING_FILE',
            message: 'No file uploaded',
            hint: 'Send a multipart form with a "file" field',
          },
        },
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const extractDir = unzipBuffer(buffer);
    tmpDir = path.dirname(extractDir);

    const packRoot = findPackRoot(extractDir);
    const pack = loadPackFromDirectory(packRoot);
    const report = verifyPack(pack);

    return NextResponse.json({
      ok: true,
      summary: {
        verified: report.verified,
        run_id: report.run_id,
        created_at: report.created_at,
        producer: report.producer,
      },
      checks: report.checks,
      events_preview: report.events_preview,
      policy_rules: pack.policy.rules.map((r) => ({
        id: r.id,
        when: r.when,
        decision: r.decision,
        severity: r.severity,
        reason: r.reason,
      })),
      decisions: pack.decisions.map((d) => ({
        event_id: d.event_id,
        rule_id: d.rule_id,
        decision: d.decision,
        severity: d.severity,
        reason: d.reason,
      })),
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: { code: 'INVALID_PACK', message: err instanceof Error ? err.message : String(err) },
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
