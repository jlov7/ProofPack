import type { FastifyInstance } from 'fastify';
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
import { sendError } from '../utils/errors.js';
import { recordRedactRequest } from '../utils/observability.js';

const ZIP_MIME_TYPES = new Set(['application/zip', 'application/x-zip-compressed']);

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

export async function redactRoute(app: FastifyInstance): Promise<void> {
  app.post('/api/redact', async (request, reply) => {
    const started = Date.now();
    const data = await request.file();
    if (!data) {
      recordRedactRequest(Date.now() - started, false);
      return sendError(reply, 400, 'NO_FILE', 'No file uploaded', 'Upload a .zip ProofPack file');
    }

    const filename = data.filename?.toLowerCase() ?? '';
    const isZipMimeType = ZIP_MIME_TYPES.has(data.mimetype);
    if (!isZipMimeType && !filename.endsWith('.zip')) {
      recordRedactRequest(Date.now() - started, false);
      return sendError(
        reply,
        415,
        'UNSUPPORTED_MEDIA_TYPE',
        `Unsupported upload type: ${data.mimetype || 'unknown'}`,
        'Upload a .zip ProofPack file',
      );
    }

    const buffer = await data.toBuffer();
    let extracted: Awaited<ReturnType<typeof extractPackZipToTemp>> | undefined;

    try {
      extracted = await extractPackZipToTemp(Buffer.from(buffer));
      const pack = loadPackFromDirectory(extracted.packRoot);
      const keypair = configuredRedactionKeypair();
      const projection = createRedactedProjectionPack(pack, {
        keypair,
        signerPolicy: keypair ? 'configured_redaction_signer' : 'ephemeral_projection_signer',
      });

      const zip = await zipRawPackToBuffer(
        projection.pack.raw as unknown as Record<string, Uint8Array>,
        projection.pack.inclusionProofs,
        canonicalizeString,
      );
      const durationMs = Date.now() - started;
      recordRedactRequest(durationMs, true);
      reply.header('x-proofpack-redact-duration-ms', String(durationMs));

      return reply
        .header('Content-Type', 'application/zip')
        .header('Content-Disposition', 'attachment; filename="public.proofpack.zip"')
        .header('X-ProofPack-Redaction-Derivation', projection.derivation.source_receipt_sha256)
        .header('X-ProofPack-Redaction-Signer-Policy', projection.derivation.signer_policy)
        .send(zip);
    } catch (err) {
      if (isPackArchiveError(err)) {
        recordRedactRequest(Date.now() - started, false);
        const status = err.code === 'PAYLOAD_TOO_LARGE' ? 413 : 400;
        return sendError(reply, status, err.code, err.message, packArchiveErrorHint(err.code));
      }
      recordRedactRequest(Date.now() - started, false);
      return sendError(
        reply,
        400,
        'REDACT_FAILED',
        err instanceof Error ? err.message : 'Redaction failed',
        'Ensure the zip contains a valid private ProofPack',
      );
    } finally {
      if (extracted) cleanupExtractedPack(extracted);
    }
  });
}
