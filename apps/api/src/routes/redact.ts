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

/** Ephemeral keypair for re-signing redacted packs */
const redactSeed = new Uint8Array(32);
redactSeed[0] = 0xaa;
redactSeed[1] = 0xbb;
redactSeed[2] = 0xcc;
const redactKeypair = keypairFromSeed(redactSeed);

export async function redactRoute(app: FastifyInstance): Promise<void> {
  app.post('/api/redact', async (request, reply) => {
    const data = await request.file();
    if (!data) {
      return sendError(reply, 400, 'NO_FILE', 'No file uploaded', 'Upload a .zip ProofPack file');
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

      return reply
        .header('Content-Type', 'application/zip')
        .header('Content-Disposition', 'attachment; filename="public.proofpack.zip"')
        .send(zip);
    } catch (err) {
      if (err instanceof ZipSlipError) {
        return sendError(reply, 400, 'ZIP_SLIP', err.message);
      }
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
