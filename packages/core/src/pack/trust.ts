import { z } from 'zod';
import { fromBase64 } from '../crypto/ed25519.js';
import { sha256Hex } from '../crypto/hash.js';

export const TrustedKeySchema = z.object({
  key_id: z.string().min(1),
  public_key: z.string(),
  status: z.enum(['active', 'retired', 'revoked']).default('active'),
  valid_from: z.string().datetime().optional(),
  valid_to: z.string().datetime().optional(),
  rotated_from: z.string().min(1).optional(),
  revoked_at: z.string().datetime().optional(),
});

export const TrustStoreSchema = z.object({
  version: z.string().default('1'),
  keys: z.array(TrustedKeySchema).min(1),
});

export type TrustedKey = z.infer<typeof TrustedKeySchema>;
export type TrustStore = z.infer<typeof TrustStoreSchema>;

export interface TrustEvaluation {
  ok: boolean;
  matched: Array<{
    key_id: string;
    status: TrustedKey['status'];
    rotated_from?: string;
  }>;
  warnings: string[];
  errors: string[];
}

export function fingerprintPublicKeyB64(publicKeyB64: string): string {
  return sha256Hex(fromBase64(publicKeyB64));
}

export function evaluateTrust(
  publicKeysB64: string[],
  createdAt: string,
  store: TrustStore,
): TrustEvaluation {
  const createdMs = Date.parse(createdAt);
  const warnings: string[] = [];
  const errors: string[] = [];
  const matched: TrustEvaluation['matched'] = [];

  for (const publicKey of publicKeysB64) {
    const fingerprint = fingerprintPublicKeyB64(publicKey);
    const trusted = store.keys.find((k) => k.public_key === publicKey || k.key_id === fingerprint);

    if (!trusted) {
      errors.push(`Signing key not in trust store (fingerprint=${fingerprint.slice(0, 12)}...)`);
      continue;
    }

    if (trusted.valid_from && createdMs < Date.parse(trusted.valid_from)) {
      errors.push(`Signing key ${trusted.key_id} not yet valid at run timestamp`);
      continue;
    }
    if (trusted.valid_to && createdMs > Date.parse(trusted.valid_to)) {
      errors.push(`Signing key ${trusted.key_id} expired before run timestamp`);
      continue;
    }

    if (trusted.status === 'revoked') {
      const revokedAtMs = trusted.revoked_at
        ? Date.parse(trusted.revoked_at)
        : Number.NEGATIVE_INFINITY;
      if (createdMs >= revokedAtMs) {
        errors.push(`Signing key ${trusted.key_id} is revoked`);
        continue;
      }
    }

    if (trusted.status === 'retired') {
      warnings.push(`Signing key ${trusted.key_id} is retired`);
    }
    if (trusted.rotated_from) {
      warnings.push(`Signing key ${trusted.key_id} rotated from ${trusted.rotated_from}`);
    }

    matched.push({
      key_id: trusted.key_id,
      status: trusted.status,
      rotated_from: trusted.rotated_from,
    });
  }

  return {
    ok: errors.length === 0,
    matched,
    warnings,
    errors,
  };
}
