import { leafHash, nodeHash, sha256 } from './hash.js';

export interface MerkleTree {
  treeSize: number;
  rootHash: Uint8Array;
  leafHashes: Uint8Array[];
}

export interface InclusionProof {
  leafIndex: number;
  treeSize: number;
  hashes: Uint8Array[];
}

function largestPowerOf2LessThan(n: number): number {
  let k = 1;
  while (k * 2 < n) k *= 2;
  return k;
}

function hashSubtree(hashes: Uint8Array[]): Uint8Array {
  if (hashes.length === 0) return sha256(new Uint8Array(0));
  if (hashes.length === 1) return hashes[0]!;
  const k = largestPowerOf2LessThan(hashes.length);
  return nodeHash(hashSubtree(hashes.slice(0, k)), hashSubtree(hashes.slice(k)));
}

function generateProof(index: number, hashes: Uint8Array[]): Uint8Array[] {
  const n = hashes.length;
  if (n <= 1) return [];
  const k = largestPowerOf2LessThan(n);
  if (index < k) {
    const proof = generateProof(index, hashes.slice(0, k));
    proof.push(hashSubtree(hashes.slice(k)));
    return proof;
  } else {
    const proof = generateProof(index - k, hashes.slice(k));
    proof.push(hashSubtree(hashes.slice(0, k)));
    return proof;
  }
}

function verifyRecursive(
  hash: Uint8Array,
  proof: Uint8Array[],
  proofIdx: number,
  leafIdx: number,
  n: number,
): { hash: Uint8Array; proofIdx: number } {
  if (n <= 1) return { hash, proofIdx };
  const k = largestPowerOf2LessThan(n);
  if (leafIdx < k) {
    const left = verifyRecursive(hash, proof, proofIdx, leafIdx, k);
    const sibling = proof[left.proofIdx];
    if (!sibling) throw new Error('Invalid proof: missing hash');
    return { hash: nodeHash(left.hash, sibling), proofIdx: left.proofIdx + 1 };
  } else {
    const right = verifyRecursive(hash, proof, proofIdx, leafIdx - k, n - k);
    const sibling = proof[right.proofIdx];
    if (!sibling) throw new Error('Invalid proof: missing hash');
    return { hash: nodeHash(sibling, right.hash), proofIdx: right.proofIdx + 1 };
  }
}

/** Compute the Merkle root from leaf data (canonical event bytes). */
export function computeRoot(leaves: Uint8Array[]): Uint8Array {
  if (leaves.length === 0) return sha256(new Uint8Array(0));
  const hashes = leaves.map((d) => leafHash(d));
  return hashSubtree(hashes);
}

/** Build the full tree structure. */
export function buildTree(leafData: Uint8Array[]): MerkleTree {
  const leafHashes = leafData.map((d) => leafHash(d));
  const rootHash = leafHashes.length === 0 ? sha256(new Uint8Array(0)) : hashSubtree(leafHashes);
  return { treeSize: leafData.length, rootHash, leafHashes };
}

/** Generate an inclusion proof for a leaf at the given index. */
export function inclusionProof(leafIndex: number, leafData: Uint8Array[]): InclusionProof {
  const hashes = leafData.map((d) => leafHash(d));
  return {
    leafIndex,
    treeSize: leafData.length,
    hashes: generateProof(leafIndex, hashes),
  };
}

/** Verify an inclusion proof against a known root. */
export function verifyInclusion(
  proof: InclusionProof,
  leafDataOrHash: Uint8Array,
  rootHash: Uint8Array,
  isHash = false,
): boolean {
  const hash = isHash ? leafDataOrHash : leafHash(leafDataOrHash);
  if (proof.treeSize === 1 && proof.hashes.length === 0) {
    return hash.length === rootHash.length && hash.every((b, i) => b === rootHash[i]);
  }
  const { hash: computed } = verifyRecursive(
    hash,
    proof.hashes,
    0,
    proof.leafIndex,
    proof.treeSize,
  );
  return computed.length === rootHash.length && computed.every((b, i) => b === rootHash[i]);
}
