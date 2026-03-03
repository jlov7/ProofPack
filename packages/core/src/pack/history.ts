import { canonicalize } from '../crypto/canonical.js';
import { computeRoot } from '../crypto/merkle.js';
import { toHex } from '../crypto/hash.js';
import type { Event } from '../types/event.js';
import type { HistoryRef } from '../types/receipt.js';

export function createHistoryRef(previousEvents: Event[]): HistoryRef | undefined {
  if (previousEvents.length === 0) return undefined;
  const previousRoot = toHex(computeRoot(previousEvents.map((event) => canonicalize(event))));
  return {
    previous_tree_size: previousEvents.length,
    previous_root_hash: previousRoot,
  };
}

export function verifyHistoryRef(currentEvents: Event[], history: HistoryRef): boolean {
  if (history.previous_tree_size === 0) return true;
  if (history.previous_tree_size > currentEvents.length) return false;
  const prefixEvents = currentEvents.slice(0, history.previous_tree_size);
  const prefixRoot = toHex(computeRoot(prefixEvents.map((event) => canonicalize(event))));
  return prefixRoot === history.previous_root_hash;
}
