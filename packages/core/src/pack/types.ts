import type { Manifest } from '../types/manifest.js';
import type { Receipt } from '../types/receipt.js';
import type { Event } from '../types/event.js';
import type { Policy, Decision } from '../types/policy.js';
import type { MerkleFile, InclusionProofFile } from '../types/merkle.js';
import type { TrustStore } from './trust.js';

/** In-memory representation of a loaded ProofPack. */
export interface PackContents {
  /** Raw file buffers for hash verification */
  raw: {
    manifest: Uint8Array;
    receipt: Uint8Array;
    events: Uint8Array; // full events.jsonl bytes
    policy: Uint8Array; // policy.yml bytes
    decisions: Uint8Array; // decisions.jsonl bytes
    merkle: Uint8Array; // merkle.json bytes
  };

  /** Parsed structures */
  manifest: Manifest;
  receipt: Receipt;
  events: Event[];
  policy: Policy;
  decisions: Decision[];
  merkleFile: MerkleFile;
  inclusionProofs: InclusionProofFile[];

  /** Optional disclosure openings */
  openings?: Opening[];
}

export interface Opening {
  event_id: string;
  salt_b64: string;
  payload: Record<string, unknown>;
}

export interface VerificationCheck {
  name: string;
  ok: boolean;
  details: Record<string, unknown>;
  error?: string;
  hint?: string;
}

export type VerificationProfile = 'standard' | 'strict' | 'permissive';

export interface VerifyPackOptions {
  profile?: VerificationProfile;
  trustStore?: TrustStore;
  requireTrustedKey?: boolean;
  requireTimestampAnchor?: boolean;
}

export interface VerificationReport {
  verified: boolean;
  profile: VerificationProfile;
  run_id: string;
  created_at: string;
  producer: { name: string; version: string };
  checks: VerificationCheck[];
  events_preview: EventPreview[];
}

export interface EventPreview {
  event_id: string;
  ts: string;
  type: string;
  summary: string;
  decision?: string;
}
