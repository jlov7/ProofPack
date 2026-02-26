import { z } from 'zod';

export const MerkleFileSchema = z.object({
  hash_alg: z.literal('SHA-256'),
  tree_alg: z.literal('RFC6962'),
  tree_size: z.number().int().nonnegative(),
  root_hash_hex: z.string(),
  leaf_hashes_present: z.boolean(),
});

export const InclusionProofFileSchema = z.object({
  event_id: z.string().uuid(),
  leaf_index: z.number().int().nonnegative(),
  tree_size: z.number().int().positive(),
  hashes_hex: z.array(z.string()),
});

export type MerkleFile = z.infer<typeof MerkleFileSchema>;
export type InclusionProofFile = z.infer<typeof InclusionProofFileSchema>;
