import { keypairFromSeed } from '@proofpack/core';

// Deterministic demo keypair — always produces the same keys
const seed = new Uint8Array(32);
seed[0] = 0xde;
seed[1] = 0xad;
seed[2] = 0xbe;
seed[3] = 0xef;

export const demoKeypair = keypairFromSeed(seed);
