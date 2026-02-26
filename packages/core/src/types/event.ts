import { z } from 'zod';

export const EventTypeSchema = z.enum([
  'run.start',
  'run.end',
  'fs.read',
  'fs.write',
  'tool.call',
  'shell.exec',
  'net.http',
  'hold.request',
  'hold.approve',
  'hold.reject',
]);

export const EventSchema = z.object({
  event_id: z.string().uuid(),
  ts: z.string().datetime(),
  type: EventTypeSchema,
  actor: z.string(),
  payload: z.record(z.unknown()).optional(),
  payload_commitment: z.string().optional(),
});

export type Event = z.infer<typeof EventSchema>;
export type EventType = z.infer<typeof EventTypeSchema>;
