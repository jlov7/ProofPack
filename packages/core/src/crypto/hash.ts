import { sha256 as noble_sha256 } from '@noble/hashes/sha256';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils';

/** SHA-256 hash of data. */
export function sha256(data: Uint8Array): Uint8Array {
  return noble_sha256(data);
}

/** SHA-256 hash returned as a hex string. */
export function sha256Hex(data: Uint8Array): string {
  return bytesToHex(noble_sha256(data));
}

/** RFC 6962 leaf hash: SHA-256(0x00 || data). */
export function leafHash(data: Uint8Array): Uint8Array {
  const input = new Uint8Array(1 + data.length);
  input[0] = 0x00;
  input.set(data, 1);
  return noble_sha256(input);
}

/** RFC 6962 node hash: SHA-256(0x01 || left || right). */
export function nodeHash(left: Uint8Array, right: Uint8Array): Uint8Array {
  const input = new Uint8Array(1 + left.length + right.length);
  input[0] = 0x01;
  input.set(left, 1);
  input.set(right, 1 + left.length);
  return noble_sha256(input);
}

/** Encode bytes to a hex string. */
export function toHex(bytes: Uint8Array): string {
  return bytesToHex(bytes);
}

/** Decode a hex string to bytes. */
export function fromHex(hex: string): Uint8Array {
  return hexToBytes(hex);
}

/** Encode a UTF-8 string to bytes. */
export function toBytes(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}
