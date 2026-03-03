import { canonicalize, canonicalizeString } from '../crypto/canonical.js';
import { sign, toBase64 } from '../crypto/ed25519.js';
import { sha256Hex, toHex } from '../crypto/hash.js';
import { buildTree, inclusionProof } from '../crypto/merkle.js';
import { createHistoryRef } from './history.js';
import { fingerprintPublicKeyB64 } from './trust.js';
import type { Keypair } from '../crypto/ed25519.js';
import type { Manifest } from '../types/manifest.js';
import type { Receipt, SignedBlock, Signature, TimestampAnchor } from '../types/receipt.js';
import type { Event } from '../types/event.js';
import type { Policy, Decision } from '../types/policy.js';
import type { MerkleFile, InclusionProofFile } from '../types/merkle.js';
import type { PackContents, Opening } from './types.js';

export interface GeneratePackOptions {
  runId: string;
  createdAt: string;
  producerName: string;
  producerVersion: string;
  events: Event[];
  policy: Policy;
  policyYaml: string;
  decisions: Decision[];
  keypair: Keypair;
  additionalSigners?: Keypair[];
  signatureThreshold?: number;
  timestampAnchor?: TimestampAnchor;
  previousEvents?: Event[];
  schemaVersion?: '0.1.0' | '1.0.0';
  openings?: Opening[];
}

export function generatePack(opts: GeneratePackOptions): PackContents {
  const encoder = new TextEncoder();

  // Serialize events to JSONL (canonical JSON per line)
  const eventsJsonl = opts.events.map((e) => canonicalizeString(e)).join('\n') + '\n';
  const eventsBytes = encoder.encode(eventsJsonl);

  // Serialize decisions to JSONL
  const decisionsJsonl = opts.decisions.map((d) => canonicalizeString(d)).join('\n') + '\n';
  const decisionsBytes = encoder.encode(decisionsJsonl);

  // Policy YAML bytes
  const policyBytes = encoder.encode(opts.policyYaml);

  // Build Merkle tree from canonical event bytes
  const eventCanonicalBytes = opts.events.map((e) => canonicalize(e));
  const tree = buildTree(eventCanonicalBytes);

  // Build merkle.json
  const merkleFile: MerkleFile = {
    hash_alg: 'SHA-256',
    tree_alg: 'RFC6962',
    tree_size: tree.treeSize,
    root_hash_hex: toHex(tree.rootHash),
    leaf_hashes_present: true,
  };
  const merkleBytes = encoder.encode(canonicalizeString(merkleFile));

  // Build inclusion proofs for each event
  const inclusionProofs: InclusionProofFile[] = opts.events.map((event, i) => {
    const proof = inclusionProof(i, eventCanonicalBytes);
    return {
      event_id: event.event_id,
      leaf_index: i,
      tree_size: tree.treeSize,
      hashes_hex: proof.hashes.map((h) => toHex(h)),
    };
  });

  // Build signed_block
  // Note: artifact.manifest_sha256 is left empty to break the circular dependency
  // (manifest hashes receipt, receipt can't hash manifest without circularity)
  const historyRef = createHistoryRef(opts.previousEvents ?? []);

  const signedBlock: SignedBlock = {
    schema_version: opts.schemaVersion ?? '0.1.0',
    run_id: opts.runId,
    created_at: opts.createdAt,
    producer: { name: opts.producerName, version: opts.producerVersion },
    merkle_tree: {
      tree_size: tree.treeSize,
      root_hash: toHex(tree.rootHash),
    },
    policy: {
      policy_sha256: sha256Hex(policyBytes),
      decisions_sha256: sha256Hex(decisionsBytes),
    },
    artifact: { manifest_sha256: '' },
    ...(opts.timestampAnchor ? { timestamp_anchor: opts.timestampAnchor } : {}),
    ...(historyRef ? { history: historyRef } : {}),
  };

  // Sign: canonical = RFC8785(signed_block), sig = Ed25519(privkey, canonical)
  const canonical = canonicalize(signedBlock);
  const signers = [opts.keypair, ...(opts.additionalSigners ?? [])];
  const signatures: Signature[] = signers.map((signer) => {
    const publicKey = toBase64(signer.publicKey);
    const sig = sign(signer.privateKey, canonical);
    return {
      alg: 'Ed25519',
      key_id: fingerprintPublicKeyB64(publicKey),
      public_key: publicKey,
      sig: toBase64(sig),
      canonicalization: 'RFC8785',
      hash: 'SHA-256',
    };
  });

  const receipt: Receipt = {
    signed_block: signedBlock,
    signature: signatures[0],
    ...(signatures.length > 1
      ? {
          signatures,
          threshold: opts.signatureThreshold ?? signatures.length,
        }
      : {}),
  };
  const receiptBytes = encoder.encode(canonicalizeString(receipt));

  // Build manifest (hashes receipt unidirectionally)
  const manifest: Manifest = {
    schema_version: '0.1.0',
    run_id: opts.runId,
    created_at: opts.createdAt,
    producer: { name: opts.producerName, version: opts.producerVersion },
    hashes: {
      receipt_sha256: sha256Hex(receiptBytes),
      events_sha256: sha256Hex(eventsBytes),
      policy_sha256: sha256Hex(policyBytes),
      decisions_sha256: sha256Hex(decisionsBytes),
      merkle_sha256: sha256Hex(merkleBytes),
    },
  };
  const manifestBytes = encoder.encode(canonicalizeString(manifest));

  return {
    raw: {
      manifest: manifestBytes,
      receipt: receiptBytes,
      events: eventsBytes,
      policy: policyBytes,
      decisions: decisionsBytes,
      merkle: merkleBytes,
    },
    manifest,
    receipt,
    events: opts.events,
    policy: opts.policy,
    decisions: opts.decisions,
    merkleFile,
    inclusionProofs,
    openings: opts.openings,
  };
}
