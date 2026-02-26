import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const canonicalizeJson = require('canonicalize') as (input: unknown) => string | undefined;

const encoder = new TextEncoder();

/** Canonicalize an object per RFC 8785 and return UTF-8 bytes. */
export function canonicalize(obj: unknown): Uint8Array {
  const str = canonicalizeJson(obj);
  if (str === undefined) {
    throw new Error('canonicalize: input is not JSON-serializable');
  }
  return encoder.encode(str);
}

/** Canonicalize an object per RFC 8785 and return the string. */
export function canonicalizeString(obj: unknown): string {
  const str = canonicalizeJson(obj);
  if (str === undefined) {
    throw new Error('canonicalize: input is not JSON-serializable');
  }
  return str;
}
