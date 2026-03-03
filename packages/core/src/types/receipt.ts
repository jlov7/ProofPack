import { z } from 'zod';
import { ProducerSchema } from './manifest.js';
import { SchemaVersionSchema } from './schema-version.js';

export const MerkleTreeRefSchema = z.object({
  tree_size: z.number().int().positive(),
  root_hash: z.string(), // hex
});

export const PolicyRefSchema = z.object({
  policy_sha256: z.string(),
  decisions_sha256: z.string(),
});

export const ArtifactRefSchema = z.object({
  manifest_sha256: z.string(),
});

export const TimestampAnchorSchema = z.object({
  type: z.enum(['rfc3161', 'rekor']),
  timestamp: z.string().datetime(),
  token_sha256: z.string().regex(/^[a-fA-F0-9]{64}$/),
});

export const HistoryRefSchema = z.object({
  previous_tree_size: z.number().int().nonnegative(),
  previous_root_hash: z.string().regex(/^[a-fA-F0-9]{64}$/),
});

export const SignedBlockSchema = z.object({
  schema_version: SchemaVersionSchema,
  run_id: z.string().uuid(),
  created_at: z.string().datetime(),
  producer: ProducerSchema,
  merkle_tree: MerkleTreeRefSchema,
  policy: PolicyRefSchema,
  artifact: ArtifactRefSchema,
  timestamp_anchor: TimestampAnchorSchema.optional(),
  history: HistoryRefSchema.optional(),
});

export const SignatureSchema = z.object({
  alg: z.literal('Ed25519'),
  key_id: z.string().min(1).optional(),
  public_key: z.string(), // base64
  sig: z.string(), // base64
  canonicalization: z.literal('RFC8785'),
  hash: z.literal('SHA-256'),
});

export const ReceiptSchema = z
  .object({
    signed_block: SignedBlockSchema,
    signature: SignatureSchema.optional(),
    signatures: z.array(SignatureSchema).min(1).optional(),
    threshold: z.number().int().positive().optional(),
  })
  .superRefine((value, ctx) => {
    const hasSingle = !!value.signature;
    const hasMulti = !!value.signatures && value.signatures.length > 0;
    if (!hasSingle && !hasMulti) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Receipt must contain signature or signatures',
        path: ['signature'],
      });
    }

    if (value.threshold && !hasMulti) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'threshold requires signatures array',
        path: ['threshold'],
      });
    }
  });

export type SignedBlock = z.infer<typeof SignedBlockSchema>;
export type Signature = z.infer<typeof SignatureSchema>;
export type TimestampAnchor = z.infer<typeof TimestampAnchorSchema>;
export type HistoryRef = z.infer<typeof HistoryRefSchema>;
export type Receipt = z.infer<typeof ReceiptSchema>;
