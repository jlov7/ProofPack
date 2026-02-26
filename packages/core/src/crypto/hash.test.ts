import { describe, expect, it } from 'vitest';
import { fromHex, leafHash, nodeHash, sha256, sha256Hex, toBytes, toHex } from './hash.js';

describe('sha256', () => {
  it('returns correct hash for empty input', () => {
    const result = sha256(new Uint8Array(0));
    expect(toHex(result)).toBe(
      'e3b0c44298fc1c149afbf4c8996fb924' + '27ae41e4649b934ca495991b7852b855',
    );
  });

  it('returns correct hash for "hello"', () => {
    const result = sha256(toBytes('hello'));
    expect(toHex(result)).toBe(
      '2cf24dba5fb0a30e26e83b2ac5b9e29e' + '1b161e5c1fa7425e73043362938b9824',
    );
  });

  it('returns a Uint8Array of length 32', () => {
    const result = sha256(toBytes('test'));
    expect(result).toBeInstanceOf(Uint8Array);
    expect(result.length).toBe(32);
  });

  it('produces different hashes for different inputs', () => {
    const a = toHex(sha256(toBytes('foo')));
    const b = toHex(sha256(toBytes('bar')));
    expect(a).not.toBe(b);
  });
});

describe('sha256Hex', () => {
  it('returns a lowercase hex string', () => {
    const result = sha256Hex(toBytes('hello'));
    expect(result).toBe('2cf24dba5fb0a30e26e83b2ac5b9e29e' + '1b161e5c1fa7425e73043362938b9824');
  });

  it('returns exactly 64 hex characters', () => {
    const result = sha256Hex(new Uint8Array(0));
    expect(result).toHaveLength(64);
    expect(result).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe('leafHash', () => {
  it('prepends 0x00 before hashing — differs from raw sha256 of same data', () => {
    const data = toBytes('hello');
    const leaf = leafHash(data);
    const raw = sha256(data);
    expect(leaf).toBeInstanceOf(Uint8Array);
    expect(leaf.length).toBe(32);
    expect(toHex(leaf)).not.toBe(toHex(raw));
  });

  it('is equivalent to SHA256(0x00 || data)', () => {
    const data = toBytes('hello');
    const manual = new Uint8Array(1 + data.length);
    manual[0] = 0x00;
    manual.set(data, 1);
    expect(toHex(leafHash(data))).toBe(toHex(sha256(manual)));
  });

  it('returns deterministic output for same input', () => {
    const data = toBytes('event-0');
    expect(toHex(leafHash(data))).toBe(toHex(leafHash(data)));
  });

  it('returns different hashes for different inputs', () => {
    expect(toHex(leafHash(toBytes('a')))).not.toBe(toHex(leafHash(toBytes('b'))));
  });
});

describe('nodeHash', () => {
  it('prepends 0x01 before hashing left || right', () => {
    const left = sha256(toBytes('left'));
    const right = sha256(toBytes('right'));
    const node = nodeHash(left, right);

    const manual = new Uint8Array(1 + left.length + right.length);
    manual[0] = 0x01;
    manual.set(left, 1);
    manual.set(right, 1 + left.length);

    expect(toHex(node)).toBe(toHex(sha256(manual)));
  });

  it('returns a 32-byte Uint8Array', () => {
    const left = sha256(toBytes('a'));
    const right = sha256(toBytes('b'));
    const result = nodeHash(left, right);
    expect(result).toBeInstanceOf(Uint8Array);
    expect(result.length).toBe(32);
  });

  it('is not commutative — nodeHash(a,b) != nodeHash(b,a)', () => {
    const a = sha256(toBytes('aaa'));
    const b = sha256(toBytes('bbb'));
    expect(toHex(nodeHash(a, b))).not.toBe(toHex(nodeHash(b, a)));
  });

  it('is distinct from leafHash of concatenated input', () => {
    const left = sha256(toBytes('left'));
    const right = sha256(toBytes('right'));
    const combined = new Uint8Array(left.length + right.length);
    combined.set(left, 0);
    combined.set(right, left.length);
    expect(toHex(nodeHash(left, right))).not.toBe(toHex(leafHash(combined)));
  });
});

describe('toHex / fromHex', () => {
  it('round-trips arbitrary bytes', () => {
    const original = new Uint8Array([0x00, 0xde, 0xad, 0xbe, 0xef, 0xff]);
    expect(fromHex(toHex(original))).toEqual(original);
  });

  it('round-trips a 32-byte hash', () => {
    const hash = sha256(toBytes('round-trip'));
    expect(fromHex(toHex(hash))).toEqual(hash);
  });

  it('toHex produces only lowercase hex characters', () => {
    const bytes = new Uint8Array(Array.from({ length: 256 }, (_, i) => i));
    expect(toHex(bytes)).toMatch(/^[0-9a-f]+$/);
  });

  it('fromHex(toHex(x)) equals x for all byte values', () => {
    const bytes = new Uint8Array(Array.from({ length: 256 }, (_, i) => i));
    expect(fromHex(toHex(bytes))).toEqual(bytes);
  });
});

describe('toBytes', () => {
  it('encodes ASCII string to UTF-8 bytes', () => {
    const result = toBytes('hello');
    expect(result).toEqual(new Uint8Array([104, 101, 108, 108, 111]));
  });

  it('encodes empty string to empty Uint8Array', () => {
    expect(toBytes('')).toEqual(new Uint8Array(0));
  });

  it('encodes multi-byte Unicode correctly', () => {
    // U+00E9 (é) encodes to 0xC3 0xA9 in UTF-8
    const result = toBytes('café');
    expect(result[3]).toBe(0xc3);
    expect(result[4]).toBe(0xa9);
  });

  it('produces a Uint8Array instance', () => {
    expect(toBytes('x')).toBeInstanceOf(Uint8Array);
  });
});
