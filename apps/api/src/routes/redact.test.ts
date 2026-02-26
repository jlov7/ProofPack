import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildServer } from '../server.js';
import { buildDemoPack } from './demo.js';
import { canonicalizeString, verifyPack, loadPackFromDirectory } from '@proofpack/core';
import { zipPack, unzipToTemp, findPackRoot, cleanupTemp } from '../utils/zip.js';
import type { PackContents } from '@proofpack/core';

function packToZipBuffer(pack: PackContents): Buffer {
  return zipPack(
    pack.raw as unknown as Record<string, Uint8Array>,
    pack.inclusionProofs,
    canonicalizeString,
  );
}

function buildMultipartPayload(zipBuffer: Buffer): {
  body: Buffer;
  contentType: string;
} {
  const boundary = '----ProofPackTestBoundary';
  const parts: Buffer[] = [];

  parts.push(
    Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="pack.zip"\r\nContent-Type: application/zip\r\n\r\n`,
    ),
  );
  parts.push(zipBuffer);
  parts.push(Buffer.from(`\r\n--${boundary}--\r\n`));

  return {
    body: Buffer.concat(parts),
    contentType: `multipart/form-data; boundary=${boundary}`,
  };
}

describe('POST /api/redact', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildServer();
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns a zip of the redacted public pack', async () => {
    const pack = buildDemoPack();
    const zip = packToZipBuffer(pack);
    const { body, contentType } = buildMultipartPayload(zip);

    const res = await app.inject({
      method: 'POST',
      url: '/api/redact',
      payload: body,
      headers: { 'content-type': contentType },
    });

    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toBe('application/zip');

    // Extract and verify the public pack
    const resultBuffer = Buffer.from(res.rawPayload);
    const tmpDir = unzipToTemp(resultBuffer);

    try {
      const packRoot = findPackRoot(tmpDir);
      const publicPack = loadPackFromDirectory(packRoot);

      // Public pack should verify (re-signed)
      const report = verifyPack(publicPack);
      expect(report.verified).toBe(true);

      // Events should have commitments, not payloads
      const eventsWithCommitments = publicPack.events.filter((e) => e.payload_commitment);
      expect(eventsWithCommitments.length).toBeGreaterThan(0);

      // Events should NOT have raw payloads (those with commitments)
      for (const event of eventsWithCommitments) {
        expect(event.payload).toBeUndefined();
      }
    } finally {
      cleanupTemp(tmpDir);
    }
  });
});
