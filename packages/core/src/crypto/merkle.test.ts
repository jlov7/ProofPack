import { describe, expect, it } from 'vitest';
import { leafHash, toBytes, toHex } from './hash.js';
import { buildTree, computeRoot, inclusionProof, verifyInclusion } from './merkle.js';

/** Build a leaf data array of n entries using the canonical test pattern. */
function makeLeaves(n: number): Uint8Array[] {
  return Array.from({ length: n }, (_, i) => toBytes(`event-${i}`));
}

describe('computeRoot', () => {
  it('returns a 32-byte Uint8Array for a single leaf', () => {
    const root = computeRoot(makeLeaves(1));
    expect(root).toBeInstanceOf(Uint8Array);
    expect(root.length).toBe(32);
  });

  it('returns a 32-byte result for all test sizes', () => {
    for (const n of [1, 2, 3, 7, 8, 13]) {
      const root = computeRoot(makeLeaves(n));
      expect(root.length).toBe(32);
    }
  });

  it('returns the SHA-256 of empty bytes for empty input', () => {
    // SHA256(new Uint8Array(0)) — verified against noble/hashes
    const root = computeRoot([]);
    expect(toHex(root)).toBe(
      'e3b0c44298fc1c149afbf4c8996fb924' + '27ae41e4649b934ca495991b7852b855',
    );
  });

  it('is deterministic — same leaves produce same root', () => {
    const leaves = makeLeaves(7);
    expect(toHex(computeRoot(leaves))).toBe(toHex(computeRoot(leaves)));
  });

  it('different leaf counts produce different roots', () => {
    const roots = [1, 2, 3, 7, 8, 13].map((n) => toHex(computeRoot(makeLeaves(n))));
    const unique = new Set(roots);
    expect(unique.size).toBe(roots.length);
  });

  it('mutating a leaf changes the root', () => {
    const leaves = makeLeaves(4);
    const root1 = toHex(computeRoot(leaves));
    leaves[2] = toBytes('tampered');
    const root2 = toHex(computeRoot(leaves));
    expect(root1).not.toBe(root2);
  });
});

describe('buildTree', () => {
  it('returns correct treeSize', () => {
    for (const n of [1, 2, 3, 7, 8, 13]) {
      const tree = buildTree(makeLeaves(n));
      expect(tree.treeSize).toBe(n);
    }
  });

  it('returns leafHashes array of length matching input', () => {
    for (const n of [1, 2, 3, 7, 8, 13]) {
      const tree = buildTree(makeLeaves(n));
      expect(tree.leafHashes).toHaveLength(n);
    }
  });

  it('each leafHash is a 32-byte Uint8Array', () => {
    const tree = buildTree(makeLeaves(5));
    for (const h of tree.leafHashes) {
      expect(h).toBeInstanceOf(Uint8Array);
      expect(h.length).toBe(32);
    }
  });

  it('rootHash matches computeRoot for same input', () => {
    const leaves = makeLeaves(7);
    const tree = buildTree(leaves);
    expect(toHex(tree.rootHash)).toBe(toHex(computeRoot(leaves)));
  });

  it('returns treeSize 0 and empty leafHashes for empty input', () => {
    const tree = buildTree([]);
    expect(tree.treeSize).toBe(0);
    expect(tree.leafHashes).toHaveLength(0);
  });
});

describe('inclusionProof', () => {
  it('generates a proof for every leaf index across all tree sizes', () => {
    for (const n of [1, 2, 3, 7, 8, 13]) {
      const leaves = makeLeaves(n);
      for (let i = 0; i < n; i++) {
        const proof = inclusionProof(i, leaves);
        expect(proof.leafIndex).toBe(i);
        expect(proof.treeSize).toBe(n);
        expect(Array.isArray(proof.hashes)).toBe(true);
      }
    }
  });

  it('single-leaf tree produces empty hashes array', () => {
    const proof = inclusionProof(0, makeLeaves(1));
    expect(proof.hashes).toHaveLength(0);
  });

  it('2-leaf tree: each leaf proof has exactly 1 sibling hash', () => {
    const leaves = makeLeaves(2);
    expect(inclusionProof(0, leaves).hashes).toHaveLength(1);
    expect(inclusionProof(1, leaves).hashes).toHaveLength(1);
  });

  it('each hash in the proof is a 32-byte Uint8Array', () => {
    const leaves = makeLeaves(8);
    for (let i = 0; i < 8; i++) {
      for (const h of inclusionProof(i, leaves).hashes) {
        expect(h).toBeInstanceOf(Uint8Array);
        expect(h.length).toBe(32);
      }
    }
  });
});

describe('verifyInclusion', () => {
  it('succeeds for every leaf in a 1-leaf tree', () => {
    const leaves = makeLeaves(1);
    const root = computeRoot(leaves);
    const proof = inclusionProof(0, leaves);
    expect(verifyInclusion(proof, leaves[0]!, root)).toBe(true);
  });

  it('succeeds for every leaf across all tree sizes', () => {
    for (const n of [1, 2, 3, 7, 8, 13]) {
      const leaves = makeLeaves(n);
      const root = computeRoot(leaves);
      for (let i = 0; i < n; i++) {
        const proof = inclusionProof(i, leaves);
        expect(verifyInclusion(proof, leaves[i]!, root)).toBe(true);
      }
    }
  });

  it('fails for a mutated leaf', () => {
    const leaves = makeLeaves(7);
    const root = computeRoot(leaves);
    const proof = inclusionProof(3, leaves);
    const tampered = toBytes('mutated-leaf');
    expect(verifyInclusion(proof, tampered, root)).toBe(false);
  });

  it('fails for a wrong root', () => {
    const leaves = makeLeaves(7);
    const root = computeRoot(makeLeaves(8)); // deliberately wrong root
    const proof = inclusionProof(0, leaves);
    expect(verifyInclusion(proof, leaves[0]!, root)).toBe(false);
  });

  it('fails when proof hashes belong to a different tree', () => {
    const leavesA = makeLeaves(7);
    const leavesB = makeLeaves(7).map((_, i) => toBytes(`other-${i}`));
    const rootA = computeRoot(leavesA);
    const proofB = inclusionProof(0, leavesB);
    expect(verifyInclusion(proofB, leavesA[0]!, rootA)).toBe(false);
  });

  it('accepts a pre-computed leaf hash when isHash=true', () => {
    const leaves = makeLeaves(4);
    const root = computeRoot(leaves);
    const proof = inclusionProof(2, leaves);
    const hash = leafHash(leaves[2]!);
    expect(verifyInclusion(proof, hash, root, true)).toBe(true);
  });

  it('isHash=true with raw leaf data returns false (hash mismatch)', () => {
    const leaves = makeLeaves(4);
    const root = computeRoot(leaves);
    const proof = inclusionProof(2, leaves);
    // passing raw data as if it were a hash → will produce wrong result
    expect(verifyInclusion(proof, leaves[2]!, root, true)).toBe(false);
  });
});
