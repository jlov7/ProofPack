import { describe, expect, it } from 'vitest';
import { fromBase64, generateKeypair, keypairFromSeed, sign, toBase64, verify } from './ed25519.js';

/** Fixed 32-byte seed for deterministic tests. */
const FIXED_SEED = new Uint8Array(32).fill(0x42);

/** Short helper: UTF-8 encode a string. */
function msg(s: string): Uint8Array {
  return new TextEncoder().encode(s);
}

describe('generateKeypair', () => {
  it('returns privateKey and publicKey each of exactly 32 bytes', () => {
    const kp = generateKeypair();
    expect(kp.privateKey).toBeInstanceOf(Uint8Array);
    expect(kp.publicKey).toBeInstanceOf(Uint8Array);
    expect(kp.privateKey.length).toBe(32);
    expect(kp.publicKey.length).toBe(32);
  });

  it('generates different keypairs on successive calls', () => {
    const a = generateKeypair();
    const b = generateKeypair();
    expect(toBase64(a.privateKey)).not.toBe(toBase64(b.privateKey));
    expect(toBase64(a.publicKey)).not.toBe(toBase64(b.publicKey));
  });
});

describe('keypairFromSeed', () => {
  it('returns 32-byte keys', () => {
    const kp = keypairFromSeed(FIXED_SEED);
    expect(kp.privateKey.length).toBe(32);
    expect(kp.publicKey.length).toBe(32);
  });

  it('is deterministic — same seed produces same keys', () => {
    const kp1 = keypairFromSeed(FIXED_SEED);
    const kp2 = keypairFromSeed(FIXED_SEED);
    expect(toBase64(kp1.publicKey)).toBe(toBase64(kp2.publicKey));
    expect(toBase64(kp1.privateKey)).toBe(toBase64(kp2.privateKey));
  });

  it('different seeds produce different public keys', () => {
    const seedA = new Uint8Array(32).fill(0x01);
    const seedB = new Uint8Array(32).fill(0x02);
    const a = keypairFromSeed(seedA);
    const b = keypairFromSeed(seedB);
    expect(toBase64(a.publicKey)).not.toBe(toBase64(b.publicKey));
  });

  it('privateKey equals the seed bytes', () => {
    const seed = new Uint8Array(32).fill(0xab);
    const kp = keypairFromSeed(seed);
    expect(kp.privateKey).toEqual(seed);
  });
});

describe('sign / verify round-trip', () => {
  it('verify returns true for a valid signature', () => {
    const kp = keypairFromSeed(FIXED_SEED);
    const message = msg('hello proofpack');
    const signature = sign(kp.privateKey, message);
    expect(verify(kp.publicKey, signature, message)).toBe(true);
  });

  it('signature is a 64-byte Uint8Array', () => {
    const kp = keypairFromSeed(FIXED_SEED);
    const signature = sign(kp.privateKey, msg('test'));
    expect(signature).toBeInstanceOf(Uint8Array);
    expect(signature.length).toBe(64);
  });

  it('verify returns false for a bad signature', () => {
    const kp = keypairFromSeed(FIXED_SEED);
    const message = msg('hello');
    const badSig = new Uint8Array(64).fill(0xff);
    expect(verify(kp.publicKey, badSig, message)).toBe(false);
  });

  it('verify returns false when message is mutated after signing', () => {
    const kp = keypairFromSeed(FIXED_SEED);
    const message = msg('original message');
    const signature = sign(kp.privateKey, message);
    const tampered = msg('tampered message');
    expect(verify(kp.publicKey, signature, tampered)).toBe(false);
  });

  it('verify returns false when a single byte of the signature is flipped', () => {
    const kp = keypairFromSeed(FIXED_SEED);
    const message = msg('flip one byte');
    const signature = sign(kp.privateKey, message);
    const corrupted = new Uint8Array(signature);
    corrupted[0] ^= 0x01;
    expect(verify(kp.publicKey, corrupted, message)).toBe(false);
  });

  it('a different keypair cannot verify a signature from another keypair', () => {
    const kpA = keypairFromSeed(new Uint8Array(32).fill(0x01));
    const kpB = keypairFromSeed(new Uint8Array(32).fill(0x02));
    const message = msg('cross-keypair test');
    const signature = sign(kpA.privateKey, message);
    expect(verify(kpB.publicKey, signature, message)).toBe(false);
  });

  it('works with empty message', () => {
    const kp = keypairFromSeed(FIXED_SEED);
    const message = new Uint8Array(0);
    const signature = sign(kp.privateKey, message);
    expect(verify(kp.publicKey, signature, message)).toBe(true);
  });

  it('works with a large message', () => {
    const kp = keypairFromSeed(FIXED_SEED);
    const message = new Uint8Array(4096).fill(0xaa);
    const signature = sign(kp.privateKey, message);
    expect(verify(kp.publicKey, signature, message)).toBe(true);
  });
});

describe('toBase64 / fromBase64', () => {
  it('round-trips a 32-byte key', () => {
    const kp = keypairFromSeed(FIXED_SEED);
    expect(fromBase64(toBase64(kp.publicKey))).toEqual(kp.publicKey);
  });

  it('round-trips a 64-byte signature', () => {
    const kp = keypairFromSeed(FIXED_SEED);
    const signature = sign(kp.privateKey, msg('round-trip'));
    expect(fromBase64(toBase64(signature))).toEqual(signature);
  });

  it('produces a non-empty string for non-empty input', () => {
    expect(toBase64(new Uint8Array([1, 2, 3]))).toBe('AQID');
  });

  it('fromBase64 of known value decodes correctly', () => {
    // base64("AQID") === [1, 2, 3]
    expect(fromBase64('AQID')).toEqual(new Uint8Array([1, 2, 3]));
  });

  it('round-trips arbitrary bytes including all byte values', () => {
    const bytes = new Uint8Array(256);
    for (let i = 0; i < 256; i++) bytes[i] = i;
    expect(fromBase64(toBase64(bytes))).toEqual(bytes);
  });
});
