import type { FastifyInstance } from 'fastify';
import {
  loadPackFromDirectory,
  redactPack,
  generatePack,
  keypairFromSeed,
  canonicalizeString,
} from '@proofpack/core';
import { unzipToTemp, findPackRoot, cleanupTemp, zipPack, ZipSlipError } from '../utils/zip.js';
import { sendError } from '../utils/errors.js';
import { recordRedactRequest } from '../utils/observability.js';

const ZIP_MIME_TYPES = new Set(['application/zip', 'application/x-zip-compressed']);

/** Ephemeral keypair for re-signing redacted packs */
const redactSeed = new Uint8Array(32);
redactSeed[0] = 0xaa;
redactSeed[1] = 0xbb;
redactSeed[2] = 0xcc;
const redactKeypair = keypairFromSeed(redactSeed);

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
    let tmpDir: string | undefined;

    try {
      tmpDir = unzipToTemp(Buffer.from(buffer));
      const packRoot = findPackRoot(tmpDir);
      const pack = loadPackFromDirectory(packRoot);

      // Redact: remove payloads, generate commitments
      const { publicPack, openings } = redactPack(pack);

      // Re-generate the pack with redacted events (needs re-signing)
      const newPack = generatePack({
        runId: pack.manifest.run_id,
        createdAt: pack.manifest.created_at,
        producerName: pack.manifest.producer.name,
        producerVersion: pack.manifest.producer.version,
        events: publicPack.events,
        policy: pack.policy,
        policyYaml: new TextDecoder().decode(pack.raw.policy),
        decisions: pack.decisions,
        keypair: redactKeypair,
        openings,
      });

      const zip = zipPack(
        newPack.raw as unknown as Record<string, Uint8Array>,
        newPack.inclusionProofs,
        canonicalizeString,
      );
      const durationMs = Date.now() - started;
      recordRedactRequest(durationMs, true);
      reply.header('x-proofpack-redact-duration-ms', String(durationMs));

      return reply
        .header('Content-Type', 'application/zip')
        .header('Content-Disposition', 'attachment; filename="public.proofpack.zip"')
        .send(zip);
    } catch (err) {
      if (err instanceof ZipSlipError) {
        recordRedactRequest(Date.now() - started, false);
        return sendError(reply, 400, 'ZIP_SLIP', err.message);
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
      if (tmpDir) cleanupTemp(tmpDir);
    }
  });
}
