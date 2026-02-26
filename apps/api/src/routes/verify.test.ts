import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildServer } from '../server.js';
import { buildDemoPack } from './demo.js';
import { canonicalizeString } from '@proofpack/core';
import { zipPack } from '../utils/zip.js';
import type { PackContents } from '@proofpack/core';

function packToZipBuffer(pack: PackContents): Buffer {
  return zipPack(
    pack.raw as unknown as Record<string, Uint8Array>,
    pack.inclusionProofs,
    canonicalizeString,
  );
}

/** Build a multipart form body with a file field */
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

describe('POST /api/verify', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildServer();
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns verified: true for valid demo pack', async () => {
    const pack = buildDemoPack();
    const zip = packToZipBuffer(pack);
    const { body, contentType } = buildMultipartPayload(zip);

    const res = await app.inject({
      method: 'POST',
      url: '/api/verify',
      payload: body,
      headers: { 'content-type': contentType },
    });

    expect(res.statusCode).toBe(200);
    const json = res.json();
    expect(json.ok).toBe(true);
    expect(json.summary.verified).toBe(true);
    expect(json.checks).toHaveLength(6);
    expect(json.checks.every((c: { ok: boolean }) => c.ok)).toBe(true);
    expect(json.events_preview).toHaveLength(13);
  });

  it('returns verified: false for tampered pack', async () => {
    const pack = buildDemoPack();

    // Tamper: modify the receipt's run_id in signed_block
    const tamperedReceipt = JSON.parse(new TextDecoder().decode(pack.raw.receipt));
    tamperedReceipt.signed_block.run_id = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';
    const tamperedReceiptBytes = new TextEncoder().encode(JSON.stringify(tamperedReceipt));

    const tamperedPack: PackContents = {
      ...pack,
      raw: { ...pack.raw, receipt: tamperedReceiptBytes },
      receipt: tamperedReceipt,
    };

    const zip = packToZipBuffer(tamperedPack);
    const { body, contentType } = buildMultipartPayload(zip);

    const res = await app.inject({
      method: 'POST',
      url: '/api/verify',
      payload: body,
      headers: { 'content-type': contentType },
    });

    expect(res.statusCode).toBe(200);
    const json = res.json();
    expect(json.ok).toBe(true);
    expect(json.summary.verified).toBe(false);
    // Signature check should fail
    const sigCheck = json.checks.find((c: { name: string }) => c.name === 'receipt.signature');
    expect(sigCheck.ok).toBe(false);
  });

  it('returns 400 for missing file', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/verify',
      payload: '',
      headers: { 'content-type': 'multipart/form-data; boundary=----empty' },
    });

    // Fastify may return 400 for malformed multipart
    expect(res.statusCode).toBeGreaterThanOrEqual(400);
  });
});
