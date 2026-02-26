import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildServer } from './server.js';

describe('API server', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildServer();
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns healthy status at /api/health', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/health',
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true });
  });

  it('rejects requests exceeding configured upload size', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/verify',
      payload: '',
      headers: {
        'content-type': 'multipart/form-data; boundary=----empty',
        'content-length': String(50 * 1024 * 1024 + 1),
      },
    });

    expect(res.statusCode).toBe(413);
    const json = res.json();
    expect(json.ok).toBe(false);
    expect(json.error.code).toBe('PAYLOAD_TOO_LARGE');
  });
});
