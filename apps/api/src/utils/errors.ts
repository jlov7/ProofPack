import type { FastifyReply } from 'fastify';

export interface ErrorBody {
  ok: false;
  error: { code: string; message: string; hint?: string };
}

export function sendError(
  reply: FastifyReply,
  status: number,
  code: string,
  message: string,
  hint?: string,
): FastifyReply {
  const body: ErrorBody = { ok: false, error: { code, message, hint } };
  return reply.status(status).send(body);
}
