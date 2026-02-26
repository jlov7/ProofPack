import { canonicalize } from '../crypto/canonical.js';
import { verify as ed25519Verify, fromBase64 } from '../crypto/ed25519.js';
import { sha256Hex, toHex, fromHex } from '../crypto/hash.js';
import { computeRoot, verifyInclusion } from '../crypto/merkle.js';
import { ManifestSchema } from '../types/manifest.js';
import { ReceiptSchema } from '../types/receipt.js';
import type { InclusionProof } from '../crypto/merkle.js';
import type { PackContents, VerificationCheck, VerificationReport, EventPreview } from './types.js';

function check(name: string, fn: () => Record<string, unknown>): VerificationCheck {
  try {
    const details = fn();
    return { name, ok: true, details };
  } catch (err) {
    return {
      name,
      ok: false,
      details: {},
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

function buildEventsPreview(pack: PackContents): EventPreview[] {
  return pack.events.map((event) => {
    const decision = pack.decisions.find((d) => d.event_id === event.event_id);
    const payloadStr = event.payload ? JSON.stringify(event.payload) : '';
    const summary =
      payloadStr.length > 80 ? payloadStr.slice(0, 77) + '...' : payloadStr || event.type;
    return {
      event_id: event.event_id,
      ts: event.ts,
      type: event.type,
      summary,
      decision: decision?.decision,
    };
  });
}

export function verifyPack(pack: PackContents): VerificationReport {
  const checks: VerificationCheck[] = [];

  // Check 1: manifest.schema — validate manifest against Zod schema
  checks.push(
    check('manifest.schema', () => {
      ManifestSchema.parse(pack.manifest);
      ReceiptSchema.parse(pack.receipt);
      return {};
    }),
  );

  // Check 2: receipt.signature — verify Ed25519 over canonical signed_block
  checks.push(
    check('receipt.signature', () => {
      const canonicalBytes = canonicalize(pack.receipt.signed_block);
      const publicKey = fromBase64(pack.receipt.signature.public_key);
      const sig = fromBase64(pack.receipt.signature.sig);
      const valid = ed25519Verify(publicKey, sig, canonicalBytes);
      if (!valid) throw new Error('Ed25519 signature verification failed');
      return { public_key: pack.receipt.signature.public_key };
    }),
  );

  // Check 3: merkle.root — recompute tree from events, compare root to receipt
  checks.push(
    check('merkle.root', () => {
      const eventCanonicalBytes = pack.events.map((e) => canonicalize(e));
      const root = computeRoot(eventCanonicalBytes);
      const rootHex = toHex(root);
      const receiptRootHex = pack.receipt.signed_block.merkle_tree.root_hash;
      if (rootHex !== receiptRootHex) {
        throw new Error(`Merkle root mismatch: computed ${rootHex}, receipt has ${receiptRootHex}`);
      }
      return { tree_size: pack.events.length };
    }),
  );

  // Check 4: merkle.inclusion_all — verify each event's inclusion proof
  checks.push(
    check('merkle.inclusion_all', () => {
      const eventCanonicalBytes = pack.events.map((e) => canonicalize(e));
      const root = computeRoot(eventCanonicalBytes);
      let verified = 0;

      for (const proofFile of pack.inclusionProofs) {
        const event = pack.events.find((e) => e.event_id === proofFile.event_id);
        if (!event) throw new Error(`No event found for proof: ${proofFile.event_id}`);

        const proof: InclusionProof = {
          leafIndex: proofFile.leaf_index,
          treeSize: proofFile.tree_size,
          hashes: proofFile.hashes_hex.map((h) => fromHex(h)),
        };

        const eventBytes = canonicalize(event);
        const valid = verifyInclusion(proof, eventBytes, root);
        if (!valid) throw new Error(`Inclusion proof failed for event ${proofFile.event_id}`);
        verified++;
      }

      return { verified_events: verified };
    }),
  );

  // Check 5: policy.hash — verify policy and decisions hashes match receipt
  checks.push(
    check('policy.hash', () => {
      const policyHash = sha256Hex(pack.raw.policy);
      const decisionsHash = sha256Hex(pack.raw.decisions);
      const receiptPolicyHash = pack.receipt.signed_block.policy.policy_sha256;
      const receiptDecisionsHash = pack.receipt.signed_block.policy.decisions_sha256;

      if (policyHash !== receiptPolicyHash) {
        throw new Error(`Policy hash mismatch: ${policyHash} vs ${receiptPolicyHash}`);
      }
      if (decisionsHash !== receiptDecisionsHash) {
        throw new Error(`Decisions hash mismatch: ${decisionsHash} vs ${receiptDecisionsHash}`);
      }
      return {};
    }),
  );

  // Check 6: disclosure.openings — verify openings match commitments (if present)
  checks.push(
    check('disclosure.openings', () => {
      if (!pack.openings || pack.openings.length === 0) {
        return { openings: 0, skipped: true };
      }

      let verified = 0;
      for (const opening of pack.openings) {
        const event = pack.events.find((e) => e.event_id === opening.event_id);
        if (!event) throw new Error(`No event for opening: ${opening.event_id}`);
        if (!event.payload_commitment) {
          throw new Error(`Event ${opening.event_id} has no payload_commitment`);
        }

        const canonicalPayload = canonicalize(opening.payload);
        const salt = fromBase64(opening.salt_b64);
        const combined = new Uint8Array(canonicalPayload.length + salt.length);
        combined.set(canonicalPayload);
        combined.set(salt, canonicalPayload.length);
        const commitment = sha256Hex(combined);

        if (commitment !== event.payload_commitment) {
          throw new Error(
            `Opening commitment mismatch for ${opening.event_id}: ${commitment} vs ${event.payload_commitment}`,
          );
        }
        verified++;
      }

      return { openings: verified };
    }),
  );

  const verified = checks.every((c) => c.ok);

  return {
    verified,
    run_id: pack.manifest.run_id,
    created_at: pack.manifest.created_at,
    producer: pack.manifest.producer,
    checks,
    events_preview: buildEventsPreview(pack),
  };
}
