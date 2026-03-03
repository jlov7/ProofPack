import { describe, expect, it } from 'vitest';
import { canonicalize } from '../crypto/canonical.js';
import { computeRoot, inclusionProof, verifyInclusion } from '../crypto/merkle.js';
import type { Event } from '../types/event.js';

const RUN_STRESS = process.env.PROOFPACK_STRESS === '1';
const EVENT_COUNT = 100_000;
const ROOT_BUDGET_MS = 20_000;
const SAMPLE_VERIFY_BUDGET_MS = 45_000;
const MEMORY_DELTA_BUDGET_MB = 350;
const SAMPLE_PROOFS = 16;

function buildStressEvents(count: number): Event[] {
  return Array.from({ length: count }, (_, index) => {
    const sequence = String(index + 1);
    const partA = sequence.padStart(8, '0').slice(-8);
    const partB = sequence.padStart(4, '0').slice(-4);
    const partE = sequence.padStart(12, '0').slice(-12);
    return {
      event_id: `${partA}-${partB}-4000-a000-${partE}`,
      ts: `2026-01-15T10:${String(index % 60).padStart(2, '0')}:00.000Z`,
      type: index % 2 === 0 ? 'fs.read' : 'net.http',
      actor: 'stress-agent',
      payload:
        index % 2 === 0
          ? { path: `workspace/file-${index}.txt` }
          : { url: `https://example.com/${index}` },
    };
  });
}

describe.skipIf(!RUN_STRESS)('merkle stress suite (opt-in)', () => {
  it(`processes ${EVENT_COUNT.toLocaleString()} events within bounded latency and memory`, () => {
    const events = buildStressEvents(EVENT_COUNT);
    const canonicalEvents = events.map((event) => canonicalize(event));

    const before = process.memoryUsage().heapUsed;
    const rootStart = Date.now();
    const root = computeRoot(canonicalEvents);
    const rootElapsed = Date.now() - rootStart;

    const verifyStart = Date.now();
    const step = Math.max(1, Math.floor(canonicalEvents.length / SAMPLE_PROOFS));
    let checked = 0;
    for (let i = 0; i < canonicalEvents.length; i += step) {
      const proof = inclusionProof(i, canonicalEvents);
      const ok = verifyInclusion(proof, canonicalEvents[i]!, root);
      expect(ok).toBe(true);
      checked++;
      if (checked >= SAMPLE_PROOFS) break;
    }
    const verifyElapsed = Date.now() - verifyStart;
    const after = process.memoryUsage().heapUsed;
    const deltaMb = (after - before) / 1024 / 1024;

    expect(checked).toBeGreaterThanOrEqual(Math.min(SAMPLE_PROOFS, EVENT_COUNT));
    expect(rootElapsed).toBeLessThanOrEqual(ROOT_BUDGET_MS);
    expect(verifyElapsed).toBeLessThanOrEqual(SAMPLE_VERIFY_BUDGET_MS);
    expect(deltaMb).toBeLessThanOrEqual(MEMORY_DELTA_BUDGET_MB);
  });
});
