import { NextResponse } from 'next/server';
import {
  cleanupExtractedPack,
  extractPackZipToTemp,
  loadPackFromDirectory,
  packArchiveErrorHint,
  PackArchiveError,
  parseTrustStoreJson,
  TrustStoreParseError,
  verifyPack,
  type VerifyPackOptions,
} from '@proofpack/core';

function parseProfile(value: FormDataEntryValue | null): VerifyPackOptions['profile'] {
  if (value === 'strict' || value === 'permissive' || value === 'standard') return value;
  return undefined;
}

function isPackArchiveError(err: unknown): err is PackArchiveError {
  return (
    err instanceof PackArchiveError || (err instanceof Error && err.name === 'PackArchiveError')
  );
}

function isTrustStoreParseError(err: unknown): err is TrustStoreParseError {
  return (
    err instanceof TrustStoreParseError ||
    (err instanceof Error && err.name === 'TrustStoreParseError')
  );
}

export async function POST(request: Request) {
  let extracted: Awaited<ReturnType<typeof extractPackZipToTemp>> | undefined;

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

    const trustStoreRaw = formData.get('trustStore');
    const trustStore =
      typeof trustStoreRaw === 'string' && trustStoreRaw.trim().length > 0
        ? parseTrustStoreJson(trustStoreRaw)
        : undefined;

    extracted = await extractPackZipToTemp(Buffer.from(await file.arrayBuffer()));
    const pack = loadPackFromDirectory(extracted.packRoot);
    const report = verifyPack(pack, {
      profile: parseProfile(formData.get('profile')),
      trustStore,
      requireTrustedKey: formData.get('requireTrustedKey') === 'true',
      requireTimestampAnchor: formData.get('requireTimestampAnchor') === 'true',
    });

    return NextResponse.json({
      ok: true,
      summary: {
        verified: report.verified,
        profile: report.profile,
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
      receipt: pack.receipt,
      merkle: pack.merkleFile,
    });
  } catch (err) {
    if (isPackArchiveError(err)) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: err.code === 'INVALID_ZIP' ? 'INVALID_PACK' : err.code,
            message: err.message,
            hint: packArchiveErrorHint(err.code),
          },
        },
        { status: err.code === 'PAYLOAD_TOO_LARGE' ? 413 : 400 },
      );
    }

    if (isTrustStoreParseError(err)) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: err.code,
            message: err.message,
            hint: 'Provide trust-store JSON shaped like {"keys":[{"key_id":"...","public_key":"...","status":"active"}]}.',
          },
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        ok: false,
        error: { code: 'INVALID_PACK', message: err instanceof Error ? err.message : String(err) },
      },
      { status: 400 },
    );
  } finally {
    if (extracted) cleanupExtractedPack(extracted);
  }
}
