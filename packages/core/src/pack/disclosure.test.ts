import { describe, it, expect } from 'vitest';
import { verifyOpenings } from './disclosure.js';
import { computeCommitment } from './redactor.js';
import type { Event } from '../types/event.js';
import type { Opening } from './types.js';

function makeCommittedEvent(
  eventId: string,
  payload: Record<string, unknown>,
  salt: string,
): { event: Event; opening: Opening } {
  const commitment = computeCommitment(payload, salt);
  return {
    event: {
      event_id: eventId,
      ts: '2026-01-15T10:00:00.000Z',
      type: 'fs.read',
      actor: 'test-agent',
      payload_commitment: commitment,
    },
    opening: {
      event_id: eventId,
      salt_b64: salt,
      payload,
    },
  };
}

describe('verifyOpenings', () => {
  it('verifies valid openings', () => {
    const salt = Buffer.from('test-salt-32-bytes-long-exactly!').toString('base64');
    const { event, opening } = makeCommittedEvent(
      '00000000-0000-4000-a000-000000000001',
      { path: 'workspace/file.ts', content: 'hello' },
      salt,
    );

    const result = verifyOpenings([event], [opening]);
    expect(result.verified).toBe(true);
    expect(result.results).toHaveLength(1);
    expect(result.results[0]!.ok).toBe(true);
  });

  it('detects wrong salt', () => {
    const salt = Buffer.from('test-salt-32-bytes-long-exactly!').toString('base64');
    const wrongSalt = Buffer.from('wrong-salt-32-bytes-long-exact!!').toString('base64');
    const { event } = makeCommittedEvent(
      '00000000-0000-4000-a000-000000000001',
      { path: 'file.ts' },
      salt,
    );

    const badOpening: Opening = {
      event_id: '00000000-0000-4000-a000-000000000001',
      salt_b64: wrongSalt,
      payload: { path: 'file.ts' },
    };

    const result = verifyOpenings([event], [badOpening]);
    expect(result.verified).toBe(false);
    expect(result.results[0]!.ok).toBe(false);
  });

  it('detects wrong payload', () => {
    const salt = Buffer.from('test-salt-32-bytes-long-exactly!').toString('base64');
    const { event } = makeCommittedEvent(
      '00000000-0000-4000-a000-000000000001',
      { path: 'file.ts' },
      salt,
    );

    const badOpening: Opening = {
      event_id: '00000000-0000-4000-a000-000000000001',
      salt_b64: salt,
      payload: { path: 'TAMPERED.ts' },
    };

    const result = verifyOpenings([event], [badOpening]);
    expect(result.verified).toBe(false);
  });

  it('handles missing event', () => {
    const opening: Opening = {
      event_id: '00000000-0000-4000-a000-999999999999',
      salt_b64: Buffer.from('salt').toString('base64'),
      payload: {},
    };

    const result = verifyOpenings([], [opening]);
    expect(result.verified).toBe(false);
    expect(result.results[0]!.error).toContain('not found');
  });

  it('handles event without commitment', () => {
    const event: Event = {
      event_id: '00000000-0000-4000-a000-000000000001',
      ts: '2026-01-15T10:00:00.000Z',
      type: 'fs.read',
      actor: 'test-agent',
      // no payload_commitment
    };

    const opening: Opening = {
      event_id: '00000000-0000-4000-a000-000000000001',
      salt_b64: Buffer.from('salt').toString('base64'),
      payload: {},
    };

    const result = verifyOpenings([event], [opening]);
    expect(result.verified).toBe(false);
    expect(result.results[0]!.error).toContain('no payload_commitment');
  });

  it('verifies multiple openings', () => {
    const salt1 = Buffer.from('salt-one-32-bytes-long-exactly!!').toString('base64');
    const salt2 = Buffer.from('salt-two-32-bytes-long-exactly!!').toString('base64');
    const { event: e1, opening: o1 } = makeCommittedEvent(
      '00000000-0000-4000-a000-000000000001',
      { a: 1 },
      salt1,
    );
    const { event: e2, opening: o2 } = makeCommittedEvent(
      '00000000-0000-4000-a000-000000000002',
      { b: 2 },
      salt2,
    );

    const result = verifyOpenings([e1, e2], [o1, o2]);
    expect(result.verified).toBe(true);
    expect(result.results).toHaveLength(2);
  });

  it('rejects duplicate openings for the same event', () => {
    const salt = Buffer.from('test-salt-32-bytes-long-exactly!').toString('base64');
    const { event, opening } = makeCommittedEvent(
      '00000000-0000-4000-a000-000000000001',
      { path: 'workspace/file.ts' },
      salt,
    );

    const result = verifyOpenings([event], [opening, opening]);
    expect(result.verified).toBe(false);
    expect(result.results.some((r) => r.error?.includes('Duplicate opening'))).toBe(true);
  });

  it('rejects openings with very short salts', () => {
    const shortSalt = Buffer.from('short').toString('base64');
    const { event } = makeCommittedEvent(
      '00000000-0000-4000-a000-000000000001',
      { path: 'workspace/file.ts' },
      shortSalt,
    );

    const result = verifyOpenings(
      [event],
      [
        {
          event_id: '00000000-0000-4000-a000-000000000001',
          salt_b64: shortSalt,
          payload: { path: 'workspace/file.ts' },
        },
      ],
    );
    expect(result.verified).toBe(false);
    expect(result.results[0]?.error).toContain('salt');
  });
});
