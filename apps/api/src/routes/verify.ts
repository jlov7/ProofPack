import type { FastifyInstance } from 'fastify';
import fs from 'node:fs';
import {
  loadPackFromDirectory,
  verifyPack,
  TrustStoreSchema,
  type VerifyPackOptions,
} from '@proofpack/core';
import { unzipToTemp, findPackRoot, cleanupTemp, ZipSlipError } from '../utils/zip.js';
import { sendError } from '../utils/errors.js';
import { recordVerifyRequest } from '../utils/observability.js';

const ZIP_MIME_TYPES = new Set(['application/zip', 'application/x-zip-compressed']);

function parseProfile(value: string | undefined): VerifyPackOptions['profile'] {
  if (value === 'strict' || value === 'permissive' || value === 'standard') {
    return value;
  }
  return undefined;
}

function getVerifyOptionsFromEnv(): VerifyPackOptions {
  const trustStorePath = process.env.PROOFPACK_TRUST_STORE_PATH;
  let trustStore: VerifyPackOptions['trustStore'];
  if (trustStorePath) {
    const content = fs.readFileSync(trustStorePath, 'utf-8');
    trustStore = TrustStoreSchema.parse(JSON.parse(content));
  }

  return {
    profile: parseProfile(process.env.PROOFPACK_VERIFY_PROFILE),
    trustStore,
    requireTrustedKey: process.env.PROOFPACK_REQUIRE_TRUSTED_KEY === '1',
    requireTimestampAnchor: process.env.PROOFPACK_REQUIRE_TIMESTAMP_ANCHOR === '1',
  };
}

export async function verifyRoute(app: FastifyInstance): Promise<void> {
  app.post('/api/verify', async (request, reply) => {
    const started = Date.now();
    let ok = false;
    const data = await request.file();
    if (!data) {
      recordVerifyRequest(Date.now() - started, false);
      return sendError(reply, 400, 'NO_FILE', 'No file uploaded', 'Upload a .zip ProofPack file');
    }

    const filename = data.filename?.toLowerCase() ?? '';
    const isZipMimeType = ZIP_MIME_TYPES.has(data.mimetype);
    if (!isZipMimeType && !filename.endsWith('.zip')) {
      recordVerifyRequest(Date.now() - started, false);
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
      const report = verifyPack(pack, getVerifyOptionsFromEnv());
      ok = report.verified;
      const durationMs = Date.now() - started;
      recordVerifyRequest(durationMs, ok);
      reply.header('x-proofpack-verify-duration-ms', String(durationMs));

      return reply.send({
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
      });
    } catch (err) {
      if (err instanceof ZipSlipError) {
        recordVerifyRequest(Date.now() - started, false);
        return sendError(reply, 400, 'ZIP_SLIP', err.message);
      }
      recordVerifyRequest(Date.now() - started, false);
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
