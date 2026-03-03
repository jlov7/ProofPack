import { z } from 'zod';
import { SchemaVersionSchema } from './schema-version.js';

export const ProducerSchema = z.object({
  name: z.string(),
  version: z.string(),
});

export const ManifestHashesSchema = z.object({
  receipt_sha256: z.string(),
  events_sha256: z.string(),
  policy_sha256: z.string(),
  decisions_sha256: z.string(),
  merkle_sha256: z.string(),
});

export const ManifestSchema = z.object({
  schema_version: SchemaVersionSchema,
  run_id: z.string().uuid(),
  created_at: z.string().datetime(),
  producer: ProducerSchema,
  hashes: ManifestHashesSchema,
});

export type Manifest = z.infer<typeof ManifestSchema>;
export type Producer = z.infer<typeof ProducerSchema>;
