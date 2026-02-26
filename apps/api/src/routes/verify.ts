import type { FastifyInstance } from 'fastify';
import { loadPackFromDirectory, verifyPack } from '@proofpack/core';
import { unzipToTemp, findPackRoot, cleanupTemp, ZipSlipError } from '../utils/zip.js';
import { sendError } from '../utils/errors.js';

export async function verifyRoute(app: FastifyInstance): Promise<void> {
  app.post('/api/verify', async (request, reply) => {
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
      const report = verifyPack(pack);

      return reply.send({
        ok: true,
        summary: {
          verified: report.verified,
          run_id: report.run_id,
          created_at: report.created_at,
          producer: report.producer,
        },
        checks: report.checks,
        events_preview: report.events_preview,
      });
    } catch (err) {
      if (err instanceof ZipSlipError) {
        return sendError(reply, 400, 'ZIP_SLIP', err.message);
      }
      return sendError(
        reply,
        400,
        'INVALID_PACK',
        err instanceof Error ? err.message : 'Invalid ProofPack',
        'Ensure the zip contains a valid ProofPack directory',
      );
    } finally {
      if (tmpDir) cleanupTemp(tmpDir);
    }
  });
}
