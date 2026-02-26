import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildServer } from '../server.js';

describe('GET /api/demo-pack', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildServer();
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns a zip file with correct headers', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/demo-pack',
    });

    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toBe('application/zip');
    expect(res.headers['content-disposition']).toContain('demo.proofpack.zip');

    // Zip files start with PK magic bytes (0x50 0x4B)
    const buffer = Buffer.from(res.rawPayload);
    expect(buffer[0]).toBe(0x50);
    expect(buffer[1]).toBe(0x4b);
    expect(buffer.length).toBeGreaterThan(100);
  });

  it('returns verifiable pack when extracted', async () => {
    const { loadPackFromDirectory, verifyPack } = await import('@proofpack/core');
    const { unzipToTemp, findPackRoot, cleanupTemp } = await import('../utils/zip.js');

    const res = await app.inject({
      method: 'GET',
      url: '/api/demo-pack',
    });

    const buffer = Buffer.from(res.rawPayload);
    const tmpDir = unzipToTemp(buffer);

    try {
      const packRoot = findPackRoot(tmpDir);
      const pack = loadPackFromDirectory(packRoot);
      const report = verifyPack(pack);
      expect(report.verified).toBe(true);
      expect(report.checks).toHaveLength(6);
    } finally {
      cleanupTemp(tmpDir);
    }
  });
});
