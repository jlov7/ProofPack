import { canonicalize } from '../crypto/canonical.js';
import { verify as ed25519Verify, fromBase64 } from '../crypto/ed25519.js';
import { sha256Hex, toHex, fromHex } from '../crypto/hash.js';
import { computeRoot, verifyInclusion } from '../crypto/merkle.js';
import { ManifestSchema } from '../types/manifest.js';
import { ReceiptSchema } from '../types/receipt.js';
import { verifyHistoryRef } from './history.js';
import { evaluateTrust } from './trust.js';
import { verifyOpenings } from './disclosure.js';
import type { InclusionProof } from '../crypto/merkle.js';
import type {
  PackContents,
  VerificationCheck,
  VerificationReport,
  EventPreview,
  VerifyPackOptions,
} from './types.js';
import type { Signature } from '../types/receipt.js';

function failureHint(name: string, error: string): string | undefined {
  if (name === 'manifest.schema') {
    return 'Regenerate the pack using matching manifest and receipt schema versions.';
  }
  if (name === 'receipt.signature') {
    return 'Re-sign the pack receipt after any change to signed_block fields.';
  }
  if (name === 'receipt.trust') {
    return 'Add the signing key to your trust store, or rotate to an active trusted key.';
  }
  if (name === 'merkle.root' || name === 'merkle.inclusion_all') {
    return 'One or more events or proof files were modified; regenerate the Merkle audit files.';
  }
  if (name === 'policy.hash') {
    return 'Policy or decisions file bytes changed after signing; regenerate or restore originals.';
  }
  if (name === 'disclosure.openings') {
    return 'Ensure each opening uses the original payload and salt from redaction output.';
  }
  if (name === 'timestamp.anchor') {
    return 'Attach a trusted timestamp anchor with timestamp >= created_at.';
  }
  if (name === 'history.consistency') {
    return 'Ensure current pack is append-only from prior run, or clear invalid history metadata.';
  }
  if (error.toLowerCase().includes('missing')) {
    return 'Check that all expected files and metadata are present before verification.';
  }
  return undefined;
}

function check(name: string, fn: () => Record<string, unknown>): VerificationCheck {
  try {
    const details = fn();
    return { name, ok: true, details };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      name,
      ok: false,
      details: {},
      error: message,
      hint: failureHint(name, message),
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

function getReceiptSignatures(pack: PackContents): Signature[] {
  if (pack.receipt.signatures && pack.receipt.signatures.length > 0) {
    return pack.receipt.signatures;
  }
  if (pack.receipt.signature) {
    return [pack.receipt.signature];
  }
  throw new Error('Receipt contains no signatures');
}

export function verifyPack(
  pack: PackContents,
  options: VerifyPackOptions = {},
): VerificationReport {
  const profile = options.profile ?? 'standard';
  const checks: VerificationCheck[] = [];
  const strict = profile === 'strict';

  // Check 1: manifest.schema — validate manifest against Zod schema
  checks.push(
    check('manifest.schema', () => {
      const manifest = ManifestSchema.parse(pack.manifest);
      const receipt = ReceiptSchema.parse(pack.receipt);
      if (manifest.schema_version !== receipt.signed_block.schema_version) {
        throw new Error(
          `Schema version mismatch: manifest=${manifest.schema_version} receipt=${receipt.signed_block.schema_version}`,
        );
      }
      return {};
    }),
  );

  // Check 2: receipt.signature — verify Ed25519 over canonical signed_block
  checks.push(
    check('receipt.signature', () => {
      const canonicalBytes = canonicalize(pack.receipt.signed_block);
      const signatures = getReceiptSignatures(pack);
      const threshold = pack.receipt.threshold ?? signatures.length;
      if (threshold > signatures.length) {
        throw new Error(
          `Invalid signature threshold: ${threshold} > signature count ${signatures.length}`,
        );
      }

      let validSignatures = 0;
      const publicKeys: string[] = [];
      for (const signature of signatures) {
        const publicKey = fromBase64(signature.public_key);
        const sig = fromBase64(signature.sig);
        const valid = ed25519Verify(publicKey, sig, canonicalBytes);
        if (valid) validSignatures++;
        publicKeys.push(signature.public_key);
      }

      if (validSignatures < threshold) {
        throw new Error(
          `Ed25519 signature verification failed: ${validSignatures}/${threshold} valid`,
        );
      }
      return {
        signature_count: signatures.length,
        valid_signatures: validSignatures,
        threshold,
        public_keys: publicKeys,
      };
    }),
  );

  // Optional trust check: only runs when trust is configured or strict profile is requested.
  if (options.trustStore || options.requireTrustedKey || strict) {
    checks.push(
      check('receipt.trust', () => {
        if (!options.trustStore) {
          throw new Error('No trust store provided');
        }

        const signatures = getReceiptSignatures(pack);
        const trust = evaluateTrust(
          signatures.map((s) => s.public_key),
          pack.receipt.signed_block.created_at,
          options.trustStore,
        );

        if (!trust.ok) {
          throw new Error(trust.errors[0] ?? 'Trust store validation failed');
        }

        return {
          trusted_keys: trust.matched.map((m) => m.key_id),
          statuses: trust.matched.map((m) => m.status),
          warnings: trust.warnings,
        };
      }),
    );
  }

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

      const result = verifyOpenings(pack.events, pack.openings);
      if (!result.verified) {
        const firstFailure = result.results.find((r) => !r.ok);
        throw new Error(firstFailure?.error ?? 'Disclosure opening verification failed');
      }

      return { openings: result.results.length };
    }),
  );

  // Optional timestamp check for anchored packs and strict mode.
  if (pack.receipt.signed_block.timestamp_anchor || options.requireTimestampAnchor || strict) {
    checks.push(
      check('timestamp.anchor', () => {
        const anchor = pack.receipt.signed_block.timestamp_anchor;
        if (!anchor) {
          throw new Error('Timestamp anchor is required but missing');
        }
        const runTime = Date.parse(pack.receipt.signed_block.created_at);
        const anchorTime = Date.parse(anchor.timestamp);
        if (Number.isNaN(anchorTime)) {
          throw new Error('Timestamp anchor contains an invalid datetime');
        }
        if (anchorTime < runTime) {
          throw new Error('Timestamp anchor predates the pack creation time');
        }
        return { type: anchor.type, timestamp: anchor.timestamp };
      }),
    );
  }

  // Optional append-only history consistency check.
  if (pack.receipt.signed_block.history || strict) {
    checks.push(
      check('history.consistency', () => {
        const history = pack.receipt.signed_block.history;
        if (!history) {
          throw new Error('History consistency proof missing');
        }
        if (history.previous_tree_size > pack.events.length) {
          throw new Error(
            `History previous_tree_size ${history.previous_tree_size} exceeds current event count ${pack.events.length}`,
          );
        }
        const ok = verifyHistoryRef(pack.events, history);
        if (!ok) {
          throw new Error('Append-only consistency check failed');
        }
        return {
          previous_tree_size: history.previous_tree_size,
          previous_root_hash: history.previous_root_hash,
        };
      }),
    );
  }

  const verified =
    profile === 'permissive'
      ? checks
          .filter((c) =>
            [
              'manifest.schema',
              'receipt.signature',
              'merkle.root',
              'merkle.inclusion_all',
            ].includes(c.name),
          )
          .every((c) => c.ok)
      : checks.every((c) => c.ok);

  return {
    verified,
    profile,
    run_id: pack.manifest.run_id,
    created_at: pack.manifest.created_at,
    producer: pack.manifest.producer,
    checks,
    events_preview: buildEventsPreview(pack),
  };
}
