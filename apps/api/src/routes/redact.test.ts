import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildServer } from '../server.js';
import { buildDemoPack } from './demo.js';
import { canonicalizeString, verifyPack, loadPackFromDirectory } from '@proofpack/core';
import { zipPack, unzipToTemp, findPackRoot, cleanupTemp } from '../utils/zip.js';
import type { PackContents } from '@proofpack/core';

async function packToZipBuffer(pack: PackContents): Promise<Buffer> {
  return zipPack(
    pack.raw as unknown as Record<string, Uint8Array>,
    pack.inclusionProofs,
    canonicalizeString,
  );
}

function buildMultipartPayload(
  zipBuffer: Buffer,
  options?: { filename?: string; mimeType?: string },
): {
  body: Buffer;
  contentType: string;
} {
  const boundary = '----ProofPackTestBoundary';
  const parts: Buffer[] = [];
  const filename = options?.filename ?? 'pack.zip';
  const mimeType = options?.mimeType ?? 'application/zip';

  parts.push(
    Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: ${mimeType}\r\n\r\n`,
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
    const zip = await packToZipBuffer(pack);
    const { body, contentType } = buildMultipartPayload(zip);

    const res = await app.inject({
      method: 'POST',
      url: '/api/redact',
      payload: body,
      headers: { 'content-type': contentType },
    });

    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toBe('application/zip');
    expect(res.headers['x-proofpack-redaction-derivation']).toMatch(/^[a-f0-9]{64}$/);
    expect(res.headers['x-proofpack-redaction-signer-policy']).toBe('unsigned_projection');

    // Extract and verify the public pack
    const resultBuffer = Buffer.from(res.rawPayload);
    const tmpDir = await unzipToTemp(resultBuffer);

    try {
      const packRoot = findPackRoot(tmpDir);
      const publicPack = loadPackFromDirectory(packRoot);

      expect(publicPack.manifest.schema_version).toBe('1.0.0');
      expect(publicPack.receipt.signature).toBeUndefined();
      expect(publicPack.receipt.signed_block.derivation?.signer_policy).toBe('unsigned_projection');

      // Public pack should verify its projection integrity without pretending to be producer-signed.
      const report = verifyPack(publicPack);
      expect(report.verified).toBe(true);
      expect(report.checks.find((c) => c.name === 'receipt.signature')?.details).toMatchObject({
        unsigned_projection: true,
        signature_count: 0,
      });

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

  it('returns 415 for non-zip file uploads', async () => {
    const { body, contentType } = buildMultipartPayload(Buffer.from('not a zip'), {
      filename: 'payload.txt',
      mimeType: 'text/plain',
    });

    const res = await app.inject({
      method: 'POST',
      url: '/api/redact',
      payload: body,
      headers: { 'content-type': contentType },
    });

    expect(res.statusCode).toBe(415);
    const json = res.json();
    expect(json.ok).toBe(false);
    expect(json.error.code).toBe('UNSUPPORTED_MEDIA_TYPE');
  });
});
