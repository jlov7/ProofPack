import Fastify from 'fastify';
import multipart from '@fastify/multipart';
import cors from '@fastify/cors';
import { verifyRoute } from './routes/verify.js';
import { demoRoute } from './routes/demo.js';
import { redactRoute } from './routes/redact.js';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

export async function buildServer() {
  const app = Fastify({ logger: false });

  await app.register(multipart, {
    limits: { fileSize: MAX_FILE_SIZE },
  });

  await app.register(cors, {
    origin: ['http://localhost:3000', 'http://localhost:3001'],
  });

  // Size limit hook — reject before processing
  app.addHook('onRequest', async (request, reply) => {
    const contentLength = request.headers['content-length'];
    if (contentLength && Number(contentLength) > MAX_FILE_SIZE) {
      reply.status(413).send({
        ok: false,
        error: {
          code: 'PAYLOAD_TOO_LARGE',
          message: `Upload exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit`,
        },
      });
    }
  });

  // Register routes
  await app.register(verifyRoute);
  await app.register(demoRoute);
  await app.register(redactRoute);

  // Health check
  app.get('/api/health', async () => ({ ok: true }));

  return app;
}
