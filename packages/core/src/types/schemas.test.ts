import { describe, expect, it } from 'vitest';
import { DecisionSchema } from './policy.js';
import { PolicySchema } from './policy.js';
import { MerkleFileSchema } from './merkle.js';
import { EventSchema } from './event.js';
import { ReceiptSchema } from './receipt.js';
import { ManifestSchema } from './manifest.js';

// ---------------------------------------------------------------------------
// Shared fixture helpers
// ---------------------------------------------------------------------------

const VALID_UUID = '123e4567-e89b-12d3-a456-426614174000';
const VALID_DATETIME = '2024-01-15T10:30:00.000Z';

function validManifest() {
  return {
    schema_version: '1.0.0',
    run_id: VALID_UUID,
    created_at: VALID_DATETIME,
    producer: { name: 'proofpack-agent', version: '0.1.0' },
    hashes: {
      receipt_sha256: 'a'.repeat(64),
      events_sha256: 'b'.repeat(64),
      policy_sha256: 'c'.repeat(64),
      decisions_sha256: 'd'.repeat(64),
      merkle_sha256: 'e'.repeat(64),
    },
  };
}

function validReceipt() {
  return {
    signed_block: {
      schema_version: '1.0.0',
      run_id: VALID_UUID,
      created_at: VALID_DATETIME,
      producer: { name: 'proofpack-agent', version: '0.1.0' },
      merkle_tree: { tree_size: 5, root_hash: 'abc123' },
      policy: { policy_sha256: 'p'.repeat(64), decisions_sha256: 'q'.repeat(64) },
      artifact: { manifest_sha256: 'm'.repeat(64) },
    },
    signature: {
      alg: 'Ed25519' as const,
      public_key: 'base64pubkey==',
      sig: 'base64sig==',
      canonicalization: 'RFC8785' as const,
      hash: 'SHA-256' as const,
    },
  };
}

function validEvent() {
  return {
    event_id: VALID_UUID,
    ts: VALID_DATETIME,
    type: 'tool.call' as const,
    actor: 'agent-0',
  };
}

function validMerkleFile() {
  return {
    hash_alg: 'SHA-256' as const,
    tree_alg: 'RFC6962' as const,
    tree_size: 8,
    root_hash_hex: 'f'.repeat(64),
    leaf_hashes_present: true,
  };
}

function validPolicy() {
  return {
    version: '1.0',
    defaults: { decision: 'allow' as const },
    rules: [
      {
        id: 'rule-1',
        when: { event_type: 'shell.exec' },
        decision: 'deny' as const,
        severity: 'high' as const,
        reason: 'shell execution is not permitted',
      },
    ],
  };
}

function validDecision() {
  return {
    event_id: VALID_UUID,
    ts: VALID_DATETIME,
    rule_id: 'rule-1',
    decision: 'allow' as const,
    severity: 'low' as const,
    reason: 'matched default allow rule',
  };
}

// ---------------------------------------------------------------------------
// ManifestSchema
// ---------------------------------------------------------------------------

describe('ManifestSchema', () => {
  it('accepts a valid manifest', () => {
    expect(ManifestSchema.safeParse(validManifest()).success).toBe(true);
  });

  it('rejects manifest missing run_id', () => {
    const { run_id: _, ...rest } = validManifest();
    expect(ManifestSchema.safeParse(rest).success).toBe(false);
  });

  it('rejects manifest with non-UUID run_id', () => {
    const input = { ...validManifest(), run_id: 'not-a-uuid' };
    expect(ManifestSchema.safeParse(input).success).toBe(false);
  });

  it('rejects manifest with invalid datetime for created_at', () => {
    const input = { ...validManifest(), created_at: '2024-01-15' };
    expect(ManifestSchema.safeParse(input).success).toBe(false);
  });

  it('rejects manifest missing hashes', () => {
    const { hashes: _, ...rest } = validManifest();
    expect(ManifestSchema.safeParse(rest).success).toBe(false);
  });

  it('rejects manifest with missing producer', () => {
    const { producer: _, ...rest } = validManifest();
    expect(ManifestSchema.safeParse(rest).success).toBe(false);
  });

  it('rejects manifest missing a hash field', () => {
    const input = validManifest();
    const { receipt_sha256: _, ...hashes } = input.hashes;
    expect(ManifestSchema.safeParse({ ...input, hashes }).success).toBe(false);
  });

  it('accepts legacy schema version 0.1.0 for compatibility', () => {
    const input = { ...validManifest(), schema_version: '0.1.0' };
    expect(ManifestSchema.safeParse(input).success).toBe(true);
  });

  it('rejects unknown schema version', () => {
    const input = { ...validManifest(), schema_version: '2.0.0' };
    expect(ManifestSchema.safeParse(input).success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// ReceiptSchema
// ---------------------------------------------------------------------------

describe('ReceiptSchema', () => {
  it('accepts a valid receipt', () => {
    expect(ReceiptSchema.safeParse(validReceipt()).success).toBe(true);
  });

  it('rejects receipt with wrong alg literal', () => {
    const input = validReceipt();
    // @ts-expect-error deliberate invalid literal
    input.signature.alg = 'RSA-PSS';
    expect(ReceiptSchema.safeParse(input).success).toBe(false);
  });

  it('rejects receipt with wrong canonicalization literal', () => {
    const input = validReceipt();
    // @ts-expect-error deliberate invalid literal
    input.signature.canonicalization = 'JCS';
    expect(ReceiptSchema.safeParse(input).success).toBe(false);
  });

  it('rejects receipt with wrong hash literal', () => {
    const input = validReceipt();
    // @ts-expect-error deliberate invalid literal
    input.signature.hash = 'SHA-512';
    expect(ReceiptSchema.safeParse(input).success).toBe(false);
  });

  it('rejects receipt with non-UUID run_id in signed_block', () => {
    const input = validReceipt();
    input.signed_block.run_id = 'bad-id';
    expect(ReceiptSchema.safeParse(input).success).toBe(false);
  });

  it('rejects receipt with negative tree_size', () => {
    const input = validReceipt();
    input.signed_block.merkle_tree.tree_size = -1;
    expect(ReceiptSchema.safeParse(input).success).toBe(false);
  });

  it('rejects receipt missing signature', () => {
    const { signature: _, ...rest } = validReceipt();
    expect(ReceiptSchema.safeParse(rest).success).toBe(false);
  });

  it('accepts receipt using signatures array + threshold', () => {
    const input = validReceipt();
    input.signature = {
      ...input.signature,
      key_id: 'key-primary',
    };
    const secondary = {
      ...input.signature,
      key_id: 'key-secondary',
      public_key: 'base64pubkey-2==',
      sig: 'base64sig-2==',
    };
    const value = {
      ...input,
      signatures: [input.signature, secondary],
      threshold: 2,
    };
    expect(ReceiptSchema.safeParse(value).success).toBe(true);
  });

  it('rejects threshold without signatures array', () => {
    const input = { ...validReceipt(), threshold: 2 };
    expect(ReceiptSchema.safeParse(input).success).toBe(false);
  });

  it('accepts receipt with optional timestamp anchor and history references', () => {
    const input = validReceipt();
    input.signed_block.timestamp_anchor = {
      type: 'rfc3161',
      timestamp: VALID_DATETIME,
      token_sha256: 'f'.repeat(64),
    };
    input.signed_block.history = {
      previous_tree_size: 3,
      previous_root_hash: 'e'.repeat(64),
    };
    expect(ReceiptSchema.safeParse(input).success).toBe(true);
  });

  it('accepts legacy schema version 0.1.0 for compatibility', () => {
    const input = validReceipt();
    input.signed_block.schema_version = '0.1.0';
    expect(ReceiptSchema.safeParse(input).success).toBe(true);
  });

  it('rejects unknown schema version', () => {
    const input = validReceipt();
    input.signed_block.schema_version = '2.0.0';
    expect(ReceiptSchema.safeParse(input).success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// EventSchema
// ---------------------------------------------------------------------------

describe('EventSchema', () => {
  it('accepts a valid event', () => {
    expect(EventSchema.safeParse(validEvent()).success).toBe(true);
  });

  it('accepts all valid event types', () => {
    const types = [
      'run.start',
      'run.end',
      'fs.read',
      'fs.write',
      'tool.call',
      'shell.exec',
      'net.http',
      'hold.request',
      'hold.approve',
      'hold.reject',
    ] as const;
    for (const type of types) {
      expect(EventSchema.safeParse({ ...validEvent(), type }).success).toBe(true);
    }
  });

  it('rejects event with invalid type enum value', () => {
    const input = { ...validEvent(), type: 'unknown.action' };
    expect(EventSchema.safeParse(input).success).toBe(false);
  });

  it('rejects event with non-UUID event_id', () => {
    const input = { ...validEvent(), event_id: 'bad-uuid' };
    expect(EventSchema.safeParse(input).success).toBe(false);
  });

  it('rejects event with invalid datetime for ts', () => {
    const input = { ...validEvent(), ts: 'not-a-datetime' };
    expect(EventSchema.safeParse(input).success).toBe(false);
  });

  it('rejects event missing actor', () => {
    const { actor: _, ...rest } = validEvent();
    expect(EventSchema.safeParse(rest).success).toBe(false);
  });

  it('accepts event with optional payload field', () => {
    const input = { ...validEvent(), payload: { key: 'value', count: 3 } };
    expect(EventSchema.safeParse(input).success).toBe(true);
  });

  it('accepts event with optional payload_commitment field', () => {
    const input = { ...validEvent(), payload_commitment: 'sha256:' + 'a'.repeat(64) };
    expect(EventSchema.safeParse(input).success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// MerkleFileSchema
// ---------------------------------------------------------------------------

describe('MerkleFileSchema', () => {
  it('accepts a valid merkle file', () => {
    expect(MerkleFileSchema.safeParse(validMerkleFile()).success).toBe(true);
  });

  it('rejects merkle file with wrong hash_alg', () => {
    const input = { ...validMerkleFile(), hash_alg: 'SHA-512' };
    expect(MerkleFileSchema.safeParse(input).success).toBe(false);
  });

  it('rejects merkle file with wrong tree_alg', () => {
    const input = { ...validMerkleFile(), tree_alg: 'RFC6960' };
    expect(MerkleFileSchema.safeParse(input).success).toBe(false);
  });

  it('accepts tree_size of 0 (empty tree)', () => {
    const input = { ...validMerkleFile(), tree_size: 0 };
    expect(MerkleFileSchema.safeParse(input).success).toBe(true);
  });

  it('rejects negative tree_size', () => {
    const input = { ...validMerkleFile(), tree_size: -1 };
    expect(MerkleFileSchema.safeParse(input).success).toBe(false);
  });

  it('rejects non-integer tree_size', () => {
    const input = { ...validMerkleFile(), tree_size: 1.5 };
    expect(MerkleFileSchema.safeParse(input).success).toBe(false);
  });

  it('rejects merkle file missing leaf_hashes_present', () => {
    const { leaf_hashes_present: _, ...rest } = validMerkleFile();
    expect(MerkleFileSchema.safeParse(rest).success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// PolicySchema
// ---------------------------------------------------------------------------

describe('PolicySchema', () => {
  it('accepts a valid policy', () => {
    expect(PolicySchema.safeParse(validPolicy()).success).toBe(true);
  });

  it('rejects policy missing rules', () => {
    const { rules: _, ...rest } = validPolicy();
    expect(PolicySchema.safeParse(rest).success).toBe(false);
  });

  it('accepts policy with empty rules array', () => {
    const input = { ...validPolicy(), rules: [] };
    expect(PolicySchema.safeParse(input).success).toBe(true);
  });

  it('rejects policy with invalid default decision value', () => {
    const input = {
      ...validPolicy(),
      defaults: { decision: 'maybe' },
    };
    expect(PolicySchema.safeParse(input).success).toBe(false);
  });

  it('rejects policy rule with invalid decision value', () => {
    const input = validPolicy();
    // @ts-expect-error deliberate invalid value
    input.rules[0].decision = 'skip';
    expect(PolicySchema.safeParse(input).success).toBe(false);
  });

  it('rejects policy rule with invalid severity value', () => {
    const input = validPolicy();
    // @ts-expect-error deliberate invalid value
    input.rules[0].severity = 'extreme';
    expect(PolicySchema.safeParse(input).success).toBe(false);
  });

  it('accepts a rule with optional hold field', () => {
    const input = validPolicy();
    input.rules[0].hold = { prompt: 'Confirm this action?' };
    expect(PolicySchema.safeParse(input).success).toBe(true);
  });

  it('accepts a rule with optional path_glob in when', () => {
    const input = validPolicy();
    input.rules[0].when.path_glob = '/etc/**';
    expect(PolicySchema.safeParse(input).success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// DecisionSchema
// ---------------------------------------------------------------------------

describe('DecisionSchema', () => {
  it('accepts a valid decision', () => {
    expect(DecisionSchema.safeParse(validDecision()).success).toBe(true);
  });

  it('accepts all valid decision values', () => {
    for (const decision of ['allow', 'deny', 'hold'] as const) {
      expect(DecisionSchema.safeParse({ ...validDecision(), decision }).success).toBe(true);
    }
  });

  it('rejects decision with invalid decision value', () => {
    const input = { ...validDecision(), decision: 'skip' };
    expect(DecisionSchema.safeParse(input).success).toBe(false);
  });

  it('rejects decision with invalid severity value', () => {
    const input = { ...validDecision(), severity: 'catastrophic' };
    expect(DecisionSchema.safeParse(input).success).toBe(false);
  });

  it('rejects decision with non-UUID event_id', () => {
    const input = { ...validDecision(), event_id: 'bad-id' };
    expect(DecisionSchema.safeParse(input).success).toBe(false);
  });

  it('rejects decision with invalid datetime for ts', () => {
    const input = { ...validDecision(), ts: '2024-01-15' };
    expect(DecisionSchema.safeParse(input).success).toBe(false);
  });

  it('rejects decision missing rule_id', () => {
    const { rule_id: _, ...rest } = validDecision();
    expect(DecisionSchema.safeParse(rest).success).toBe(false);
  });

  it('accepts decision with optional explain field', () => {
    const input = { ...validDecision(), explain: { matched: 'rule-1', confidence: 0.99 } };
    expect(DecisionSchema.safeParse(input).success).toBe(true);
  });
});
