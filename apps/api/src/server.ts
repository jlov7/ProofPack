import Fastify from 'fastify';
import multipart from '@fastify/multipart';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import { verifyRoute } from './routes/verify.js';
import { demoRoute } from './routes/demo.js';
import { redactRoute } from './routes/redact.js';
import { sendError } from './utils/errors.js';
import { getMetricsSnapshot } from './utils/observability.js';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

export async function buildServer() {
  const app = Fastify({ logger: false });
  const rateLimitMax = Number(process.env.PROOFPACK_RATE_LIMIT_MAX ?? 120);
  const rateLimitWindow = process.env.PROOFPACK_RATE_LIMIT_WINDOW ?? '1 minute';
  const apiToken = process.env.PROOFPACK_API_TOKEN;

  await app.register(multipart, {
    limits: { fileSize: MAX_FILE_SIZE },
  });

  await app.register(cors, {
    origin: ['http://localhost:3000', 'http://localhost:3001'],
  });

  await app.register(rateLimit, {
    max: rateLimitMax,
    timeWindow: rateLimitWindow,
  });

  app.addHook('onRequest', async (request, reply) => {
    if (!apiToken) return;
    if (request.method === 'OPTIONS') return;
    if (request.url.startsWith('/api/health')) return;

    const auth = request.headers.authorization;
    const expected = `Bearer ${apiToken}`;
    if (auth !== expected) {
      return sendError(
        reply,
        401,
        'UNAUTHORIZED',
        'Missing or invalid bearer token',
        'Provide Authorization: Bearer <token>',
      );
    }
  });

  // Size limit hook — reject before processing
  app.addHook('onRequest', async (request, reply) => {
    const contentLength = request.headers['content-length'];
    if (contentLength && Number(contentLength) > MAX_FILE_SIZE) {
      return sendError(
        reply,
        413,
        'PAYLOAD_TOO_LARGE',
        `Upload exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit`,
      );
    }
  });

  // Register routes
  await app.register(verifyRoute);
  await app.register(demoRoute);
  await app.register(redactRoute);

  // Health/metrics are intentionally excluded from abuse throttling.
  app.get('/api/health', { config: { rateLimit: false } }, async () => ({ ok: true }));
  app.get('/api/metrics', { config: { rateLimit: false } }, async () => ({
    ok: true,
    metrics: getMetricsSnapshot(),
  }));

  return app;
}
