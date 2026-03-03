import { canonicalize } from '../crypto/canonical.js';
import { sha256Hex } from '../crypto/hash.js';
import type { Event } from '../types/event.js';
import type { Opening } from './types.js';

export interface DisclosureResult {
  verified: boolean;
  results: DisclosureCheck[];
}

export interface DisclosureCheck {
  event_id: string;
  ok: boolean;
  error?: string;
}

function decodeBase64Strict(value: string): Uint8Array {
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(value) || value.length % 4 !== 0) {
    throw new Error('Opening salt is not valid base64');
  }
  const decoded = Buffer.from(value, 'base64');
  const normalizedInput = value.replace(/=+$/, '');
  const normalizedDecoded = decoded.toString('base64').replace(/=+$/, '');
  if (normalizedInput !== normalizedDecoded) {
    throw new Error('Opening salt is not valid base64');
  }
  return new Uint8Array(decoded);
}

/**
 * Verify that openings match their corresponding event commitments.
 * Each opening reveals (payload, salt) and must satisfy:
 *   SHA-256(canonical(payload) || salt) === event.payload_commitment
 */
export function verifyOpenings(events: Event[], openings: Opening[]): DisclosureResult {
  const results: DisclosureCheck[] = [];
  const seenEventIds = new Set<string>();

  for (const opening of openings) {
    if (seenEventIds.has(opening.event_id)) {
      results.push({
        event_id: opening.event_id,
        ok: false,
        error: `Duplicate opening for event ${opening.event_id}`,
      });
      continue;
    }
    seenEventIds.add(opening.event_id);

    const event = events.find((e) => e.event_id === opening.event_id);
    if (!event) {
      results.push({ event_id: opening.event_id, ok: false, error: 'Event not found' });
      continue;
    }

    if (!event.payload_commitment) {
      results.push({
        event_id: opening.event_id,
        ok: false,
        error: 'Event has no payload_commitment',
      });
      continue;
    }

    try {
      const canonicalPayload = canonicalize(opening.payload);
      const salt = decodeBase64Strict(opening.salt_b64);
      if (salt.length < 16) {
        throw new Error('Opening salt must be at least 16 bytes');
      }
      const combined = new Uint8Array(canonicalPayload.length + salt.length);
      combined.set(canonicalPayload);
      combined.set(salt, canonicalPayload.length);
      const commitment = sha256Hex(combined);

      if (commitment !== event.payload_commitment) {
        results.push({
          event_id: opening.event_id,
          ok: false,
          error: `Commitment mismatch: computed ${commitment}, expected ${event.payload_commitment}`,
        });
      } else {
        results.push({ event_id: opening.event_id, ok: true });
      }
    } catch (err) {
      results.push({
        event_id: opening.event_id,
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return {
    verified: results.every((r) => r.ok),
    results,
  };
}
