import type { FastifyInstance } from 'fastify';
import fs from 'node:fs';
import {
  cleanupExtractedPack,
  extractPackZipToTemp,
  loadPackFromDirectory,
  packArchiveErrorHint,
  PackArchiveError,
  verifyPack,
  parseTrustStoreJson,
  TrustStoreParseError,
  type VerifyPackOptions,
} from '@proofpack/core';
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
    trustStore = parseTrustStoreJson(content);
  }

  return {
    profile: parseProfile(process.env.PROOFPACK_VERIFY_PROFILE),
    trustStore,
    requireTrustedKey: process.env.PROOFPACK_REQUIRE_TRUSTED_KEY === '1',
    requireTimestampAnchor: process.env.PROOFPACK_REQUIRE_TIMESTAMP_ANCHOR === '1',
  };
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

export async function verifyRoute(app: FastifyInstance): Promise<void> {
  const verifyRateLimitMax = Number(
    process.env.PROOFPACK_VERIFY_RATE_LIMIT_MAX ?? process.env.PROOFPACK_RATE_LIMIT_MAX ?? 30,
  );
  const verifyRateLimitWindow =
    process.env.PROOFPACK_VERIFY_RATE_LIMIT_WINDOW ??
    process.env.PROOFPACK_RATE_LIMIT_WINDOW ??
    '1 minute';

  app.post(
    '/api/verify',
    {
      config: {
        rateLimit: {
          max: verifyRateLimitMax,
          timeWindow: verifyRateLimitWindow,
        },
      },
    },
    async (request, reply) => {
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
      let extracted: Awaited<ReturnType<typeof extractPackZipToTemp>> | undefined;

      try {
        extracted = await extractPackZipToTemp(Buffer.from(buffer));
        const pack = loadPackFromDirectory(extracted.packRoot);
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
        if (isPackArchiveError(err)) {
          recordVerifyRequest(Date.now() - started, false);
          const status = err.code === 'PAYLOAD_TOO_LARGE' ? 413 : 400;
          const code = err.code === 'INVALID_ZIP' ? 'INVALID_PACK' : err.code;
          return sendError(reply, status, code, err.message, packArchiveErrorHint(err.code));
        }
        if (isTrustStoreParseError(err)) {
          recordVerifyRequest(Date.now() - started, false);
          return sendError(
            reply,
            400,
            err.code,
            err.message,
            'Fix PROOFPACK_TRUST_STORE_PATH so it points to valid trust-store JSON.',
          );
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
        if (extracted) cleanupExtractedPack(extracted);
      }
    },
  );
}
