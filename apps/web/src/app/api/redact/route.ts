import { NextResponse } from 'next/server';
import {
  cleanupExtractedPack,
  createRedactedProjectionPack,
  extractPackZipToTemp,
  keypairFromSeed,
  loadPackFromDirectory,
  packArchiveErrorHint,
  PackArchiveError,
  canonicalizeString,
  zipRawPackToBuffer,
} from '@proofpack/core';

function configuredRedactionKeypair() {
  const seedB64 = process.env.PROOFPACK_REDACTION_SEED_B64;
  if (!seedB64) return undefined;
  const seed = Buffer.from(seedB64, 'base64');
  if (seed.byteLength !== 32) {
    throw new Error('PROOFPACK_REDACTION_SEED_B64 must decode to exactly 32 bytes');
  }
  return keypairFromSeed(new Uint8Array(seed));
}

function isPackArchiveError(err: unknown): err is PackArchiveError {
  return (
    err instanceof PackArchiveError || (err instanceof Error && err.name === 'PackArchiveError')
  );
}

export async function POST(request: Request) {
  let extracted: Awaited<ReturnType<typeof extractPackZipToTemp>> | undefined;

  try {
    const formData = await request.formData();
    const file = formData.get('file');
    if (!file || !(file instanceof Blob)) {
      return NextResponse.json(
        { ok: false, error: { code: 'MISSING_FILE', message: 'No file uploaded' } },
        { status: 400 },
      );
    }

    extracted = await extractPackZipToTemp(Buffer.from(await file.arrayBuffer()));
    const pack = loadPackFromDirectory(extracted.packRoot);
    const keypair = configuredRedactionKeypair();
    const projection = createRedactedProjectionPack(pack, {
      keypair,
      signerPolicy: keypair ? 'configured_redaction_signer' : 'ephemeral_projection_signer',
    });

    const zipBuffer = await zipRawPackToBuffer(
      projection.pack.raw as unknown as Record<string, Uint8Array>,
      projection.pack.inclusionProofs,
      canonicalizeString,
    );

    return new NextResponse(new Uint8Array(zipBuffer), {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': 'attachment; filename="public.proofpack.zip"',
        'X-ProofPack-Redaction-Derivation': projection.derivation.source_receipt_sha256,
        'X-ProofPack-Redaction-Signer-Policy': projection.derivation.signer_policy,
      },
    });
  } catch (err) {
    if (isPackArchiveError(err)) {
      return NextResponse.json(
        {
          ok: false,
          error: { code: err.code, message: err.message, hint: packArchiveErrorHint(err.code) },
        },
        { status: err.code === 'PAYLOAD_TOO_LARGE' ? 413 : 400 },
      );
    }

    return NextResponse.json(
      {
        ok: false,
        error: { code: 'REDACT_FAILED', message: err instanceof Error ? err.message : String(err) },
      },
      { status: 400 },
    );
  } finally {
    if (extracted) cleanupExtractedPack(extracted);
  }
}
