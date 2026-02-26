import { z } from 'zod';
import { ProducerSchema } from './manifest.js';

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

export const SignedBlockSchema = z.object({
  schema_version: z.string(),
  run_id: z.string().uuid(),
  created_at: z.string().datetime(),
  producer: ProducerSchema,
  merkle_tree: MerkleTreeRefSchema,
  policy: PolicyRefSchema,
  artifact: ArtifactRefSchema,
});

export const SignatureSchema = z.object({
  alg: z.literal('Ed25519'),
  public_key: z.string(), // base64
  sig: z.string(), // base64
  canonicalization: z.literal('RFC8785'),
  hash: z.literal('SHA-256'),
});

export const ReceiptSchema = z.object({
  signed_block: SignedBlockSchema,
  signature: SignatureSchema,
});

export type SignedBlock = z.infer<typeof SignedBlockSchema>;
export type Signature = z.infer<typeof SignatureSchema>;
export type Receipt = z.infer<typeof ReceiptSchema>;
