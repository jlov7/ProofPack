import { canonicalize } from '../crypto/canonical.js';
import { sha256Hex } from '../crypto/hash.js';
import { keypairFromSeed } from '../crypto/ed25519.js';
import { generatePack } from './generator.js';
import type { Event } from '../types/event.js';
import type { Keypair } from '../crypto/ed25519.js';
import type { Policy, Decision } from '../types/policy.js';
import type { RedactionDerivation } from '../types/receipt.js';
import type { PackContents, Opening } from './types.js';

/** Generate a random 32-byte salt as a base64 string. */
function randomSalt(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Buffer.from(bytes).toString('base64');
}

/** Compute a payload commitment: SHA-256(canonical_payload || salt). */
export function computeCommitment(payload: Record<string, unknown>, saltB64: string): string {
  const canonicalPayload = canonicalize(payload);
  const salt = new Uint8Array(Buffer.from(saltB64, 'base64'));
  const combined = new Uint8Array(canonicalPayload.length + salt.length);
  combined.set(canonicalPayload);
  combined.set(salt, canonicalPayload.length);
  return sha256Hex(combined);
}

/**
 * Redact a private pack into a public pack.
 * - Removes event payloads
 * - Adds payload_commitment for each event that has a payload
 * - Generates openings array for later selective disclosure
 *
 * The returned pack can be verified without seeing the original payloads.
 * The openings can be shared separately to reveal specific payloads.
 */
export function redactPack(pack: PackContents): { publicPack: PackContents; openings: Opening[] } {
  const openings: Opening[] = [];

  const publicEvents: Event[] = pack.events.map((event) => {
    if (!event.payload) {
      return { ...event };
    }

    const salt = randomSalt();
    const commitment = computeCommitment(event.payload, salt);

    openings.push({
      event_id: event.event_id,
      salt_b64: salt,
      payload: event.payload,
    });

    // Public event: remove payload, add commitment
    const { payload: _, ...rest } = event;
    return {
      ...rest,
      payload_commitment: commitment,
    };
  });

  // Re-generate the pack with public events
  // Note: we need to regenerate because event bytes changed (payloads removed)
  // The caller should use generatePack() to rebuild with the new events.
  // For now, we return the modified events in a new PackContents-like structure.
  // The actual regeneration happens at a higher level since we need the keypair.
  const publicPack: PackContents = {
    ...pack,
    events: publicEvents,
    openings: undefined, // public pack doesn't include openings by default
  };

  return { publicPack, openings };
}

function randomRedactionKeypair(): Keypair {
  const seed = crypto.getRandomValues(new Uint8Array(32));
  return keypairFromSeed(seed);
}

export interface CreateRedactedProjectionOptions {
  keypair?: Keypair;
  signerPolicy?: RedactionDerivation['signer_policy'];
  policy?: Policy;
  decisions?: Decision[];
}

export interface RedactedProjectionResult {
  pack: PackContents;
  openings: Opening[];
  derivation: RedactionDerivation;
}

export function createRedactedProjectionPack(
  sourcePack: PackContents,
  options: CreateRedactedProjectionOptions = {},
): RedactedProjectionResult {
  const { publicPack, openings } = redactPack(sourcePack);
  const signerPolicy =
    options.signerPolicy ??
    (options.keypair ? 'configured_redaction_signer' : 'ephemeral_projection_signer');
  const derivation: RedactionDerivation = {
    kind: 'redaction_projection',
    source_run_id: sourcePack.manifest.run_id,
    source_receipt_sha256: sha256Hex(sourcePack.raw.receipt),
    payload_mode: 'payload_commitments',
    signer_policy: signerPolicy,
  };

  const pack = generatePack({
    runId: sourcePack.manifest.run_id,
    createdAt: sourcePack.manifest.created_at,
    producerName: sourcePack.manifest.producer.name,
    producerVersion: sourcePack.manifest.producer.version,
    events: publicPack.events,
    policy: options.policy ?? sourcePack.policy,
    policyYaml: new TextDecoder().decode(sourcePack.raw.policy),
    decisions: options.decisions ?? sourcePack.decisions,
    keypair: options.keypair ?? randomRedactionKeypair(),
    openings,
    derivation,
  });

  return { pack, openings, derivation };
}
