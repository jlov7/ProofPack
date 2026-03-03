import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildServer } from './server.js';
import { resetMetricsForTests } from './utils/observability.js';

describe('API server', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    resetMetricsForTests();
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

  it('exposes structured in-memory API metrics', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/metrics',
    });

    expect(res.statusCode).toBe(200);
    const json = res.json();
    expect(json.ok).toBe(true);
    expect(typeof json.metrics.verify_requests_total).toBe('number');
    expect(typeof json.metrics.redact_requests_total).toBe('number');
  });
});

describe('API auth mode', () => {
  let app: FastifyInstance;
  const previousToken = process.env.PROOFPACK_API_TOKEN;

  beforeAll(async () => {
    process.env.PROOFPACK_API_TOKEN = 'test-secret-token';
    app = await buildServer();
  });

  afterAll(async () => {
    if (previousToken === undefined) {
      delete process.env.PROOFPACK_API_TOKEN;
    } else {
      process.env.PROOFPACK_API_TOKEN = previousToken;
    }
    await app.close();
  });

  it('allows /api/health without auth token', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/health',
    });
    expect(res.statusCode).toBe(200);
  });

  it('rejects protected routes without a bearer token', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/demo-pack',
    });

    expect(res.statusCode).toBe(401);
    const json = res.json();
    expect(json.ok).toBe(false);
    expect(json.error.code).toBe('UNAUTHORIZED');
  });

  it('allows protected routes with valid bearer token', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/demo-pack',
      headers: {
        authorization: 'Bearer test-secret-token',
      },
    });

    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toBe('application/zip');
  });
});

describe('API rate limiting', () => {
  let app: FastifyInstance;
  const previousMax = process.env.PROOFPACK_RATE_LIMIT_MAX;
  const previousWindow = process.env.PROOFPACK_RATE_LIMIT_WINDOW;

  beforeAll(async () => {
    process.env.PROOFPACK_RATE_LIMIT_MAX = '1';
    process.env.PROOFPACK_RATE_LIMIT_WINDOW = '1 minute';
    app = await buildServer();
  });

  afterAll(async () => {
    if (previousMax === undefined) {
      delete process.env.PROOFPACK_RATE_LIMIT_MAX;
    } else {
      process.env.PROOFPACK_RATE_LIMIT_MAX = previousMax;
    }
    if (previousWindow === undefined) {
      delete process.env.PROOFPACK_RATE_LIMIT_WINDOW;
    } else {
      process.env.PROOFPACK_RATE_LIMIT_WINDOW = previousWindow;
    }
    await app.close();
  });

  it('returns 429 after exceeding request budget on protected endpoints', async () => {
    const first = await app.inject({
      method: 'GET',
      url: '/api/demo-pack',
    });
    expect(first.statusCode).toBe(200);

    const second = await app.inject({
      method: 'GET',
      url: '/api/demo-pack',
    });
    expect(second.statusCode).toBe(429);

    const health = await app.inject({
      method: 'GET',
      url: '/api/health',
    });
    expect(health.statusCode).toBe(200);
  });
});
