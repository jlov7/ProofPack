import { describe, expect, it } from 'vitest';
import { canonicalize, canonicalizeString } from './canonical.js';

describe('canonicalizeString', () => {
  it('sorts keys alphabetically per RFC 8785', () => {
    expect(canonicalizeString({ b: 2, a: 1 })).toBe('{"a":1,"b":2}');
  });

  it('sorts deeply nested keys', () => {
    expect(canonicalizeString({ z: { b: 2, a: 1 }, a: 0 })).toBe('{"a":0,"z":{"a":1,"b":2}}');
  });

  it('strips trailing .0 from integer-valued floats', () => {
    expect(canonicalizeString({ n: 1.0 })).toBe('{"n":1}');
  });

  it('preserves actual float values', () => {
    const result = canonicalizeString({ x: 1.5 });
    expect(result).toContain('1.5');
  });

  it('preserves Unicode strings without escaping printable chars', () => {
    const result = canonicalizeString({ msg: 'héllo' });
    expect(result).toBe('{"msg":"héllo"}');
  });

  it('handles arrays in insertion order', () => {
    expect(canonicalizeString({ arr: [3, 1, 2] })).toBe('{"arr":[3,1,2]}');
  });

  it('handles null values', () => {
    expect(canonicalizeString({ x: null })).toBe('{"x":null}');
  });

  it('handles boolean values', () => {
    expect(canonicalizeString({ t: true, f: false })).toBe('{"f":false,"t":true}');
  });

  it('handles empty object', () => {
    expect(canonicalizeString({})).toBe('{}');
  });

  it('handles empty array', () => {
    expect(canonicalizeString([])).toBe('[]');
  });

  it('returns the same output for the same input on repeated calls', () => {
    const obj = { z: 3, a: 1, m: 2 };
    expect(canonicalizeString(obj)).toBe(canonicalizeString(obj));
  });

  it('throws for non-serializable input (undefined)', () => {
    expect(() => canonicalizeString(undefined)).toThrow();
  });

  it('serializes function values as undefined (canonicalize library behavior)', () => {
    // Unlike JSON.stringify, the canonicalize library emits the literal string
    // "undefined" for function-valued properties rather than dropping the key.
    const result = canonicalizeString({ fn: () => void 0, a: 1 });
    expect(result).toContain('"fn":undefined');
    expect(result).toContain('"a":1');
  });
});

describe('canonicalize', () => {
  it('returns a Uint8Array', () => {
    const result = canonicalize({ a: 1 });
    expect(result).toBeInstanceOf(Uint8Array);
  });

  it('encodes the canonical JSON string as UTF-8 bytes', () => {
    const obj = { b: 2, a: 1 };
    const result = canonicalize(obj);
    const decoded = new TextDecoder().decode(result);
    expect(decoded).toBe('{"a":1,"b":2}');
  });

  it('produces the same bytes as TextEncoder of canonicalizeString', () => {
    const obj = { z: 'world', a: 'hello' };
    const expected = new TextEncoder().encode(canonicalizeString(obj));
    expect(canonicalize(obj)).toEqual(expected);
  });

  it('throws for non-serializable input', () => {
    expect(() => canonicalize(undefined)).toThrow();
  });

  it('handles nested objects and produces deterministic bytes', () => {
    const a = canonicalize({ b: { d: 4, c: 3 }, a: 1 });
    const b = canonicalize({ a: 1, b: { c: 3, d: 4 } });
    expect(a).toEqual(b);
  });
});
