import { z } from 'zod';

export const SUPPORTED_SCHEMA_VERSIONS = ['0.1.0', '1.0.0'] as const;

export const SchemaVersionSchema = z.enum(SUPPORTED_SCHEMA_VERSIONS);

export type SchemaVersion = z.infer<typeof SchemaVersionSchema>;
