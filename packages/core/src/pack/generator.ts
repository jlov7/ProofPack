import { canonicalize, canonicalizeString } from '../crypto/canonical.js';
import { sign, toBase64 } from '../crypto/ed25519.js';
import { sha256Hex, toHex } from '../crypto/hash.js';
import { buildTree, inclusionProof } from '../crypto/merkle.js';
import type { Keypair } from '../crypto/ed25519.js';
import type { Manifest } from '../types/manifest.js';
import type { Receipt, SignedBlock } from '../types/receipt.js';
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
  const signedBlock: SignedBlock = {
    schema_version: '0.1.0',
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
  };

  // Sign: canonical = RFC8785(signed_block), sig = Ed25519(privkey, canonical)
  const canonical = canonicalize(signedBlock);
  const sig = sign(opts.keypair.privateKey, canonical);

  const receipt: Receipt = {
    signed_block: signedBlock,
    signature: {
      alg: 'Ed25519',
      public_key: toBase64(opts.keypair.publicKey),
      sig: toBase64(sig),
      canonicalization: 'RFC8785',
      hash: 'SHA-256',
    },
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
