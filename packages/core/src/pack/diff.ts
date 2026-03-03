import { canonicalizeString } from '../crypto/canonical.js';
import { sha256Hex } from '../crypto/hash.js';
import type { PackContents } from './types.js';

export interface PackDiffReport {
  identical: boolean;
  run: {
    left_run_id: string;
    right_run_id: string;
    same_run_id: boolean;
  };
  created_at: {
    left: string;
    right: string;
    same: boolean;
  };
  schema_version: {
    left: string;
    right: string;
    same: boolean;
  };
  event_counts: {
    left: number;
    right: number;
    delta: number;
  };
  events: {
    added: string[];
    removed: string[];
    changed: string[];
  };
  hashes: {
    policy_same: boolean;
    decisions_same: boolean;
    merkle_same: boolean;
  };
  signers: {
    left: string[];
    right: string[];
    same: boolean;
  };
}

function signerSet(pack: PackContents): string[] {
  if (pack.receipt.signatures && pack.receipt.signatures.length > 0) {
    return pack.receipt.signatures.map((signature) => signature.public_key).sort();
  }
  return pack.receipt.signature ? [pack.receipt.signature.public_key] : [];
}

export function diffPacks(left: PackContents, right: PackContents): PackDiffReport {
  const leftEventMap = new Map(
    left.events.map((event) => [event.event_id, canonicalizeString(event)]),
  );
  const rightEventMap = new Map(
    right.events.map((event) => [event.event_id, canonicalizeString(event)]),
  );

  const added = [...rightEventMap.keys()].filter((id) => !leftEventMap.has(id)).sort();
  const removed = [...leftEventMap.keys()].filter((id) => !rightEventMap.has(id)).sort();
  const changed = [...leftEventMap.keys()]
    .filter((id) => rightEventMap.has(id) && leftEventMap.get(id) !== rightEventMap.get(id))
    .sort();

  const leftSigners = signerSet(left);
  const rightSigners = signerSet(right);
  const sameSigners =
    leftSigners.length === rightSigners.length &&
    leftSigners.every((value, index) => value === rightSigners[index]);

  const report: PackDiffReport = {
    identical: false,
    run: {
      left_run_id: left.manifest.run_id,
      right_run_id: right.manifest.run_id,
      same_run_id: left.manifest.run_id === right.manifest.run_id,
    },
    created_at: {
      left: left.manifest.created_at,
      right: right.manifest.created_at,
      same: left.manifest.created_at === right.manifest.created_at,
    },
    schema_version: {
      left: left.manifest.schema_version,
      right: right.manifest.schema_version,
      same: left.manifest.schema_version === right.manifest.schema_version,
    },
    event_counts: {
      left: left.events.length,
      right: right.events.length,
      delta: right.events.length - left.events.length,
    },
    events: {
      added,
      removed,
      changed,
    },
    hashes: {
      policy_same: sha256Hex(left.raw.policy) === sha256Hex(right.raw.policy),
      decisions_same: sha256Hex(left.raw.decisions) === sha256Hex(right.raw.decisions),
      merkle_same:
        left.receipt.signed_block.merkle_tree.root_hash ===
        right.receipt.signed_block.merkle_tree.root_hash,
    },
    signers: {
      left: leftSigners,
      right: rightSigners,
      same: sameSigners,
    },
  };

  report.identical =
    report.run.same_run_id &&
    report.created_at.same &&
    report.schema_version.same &&
    report.event_counts.delta === 0 &&
    report.events.added.length === 0 &&
    report.events.removed.length === 0 &&
    report.events.changed.length === 0 &&
    report.hashes.policy_same &&
    report.hashes.decisions_same &&
    report.hashes.merkle_same &&
    report.signers.same;

  return report;
}
