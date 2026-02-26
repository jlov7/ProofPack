'use client';

import { useState, useMemo } from 'react';
import { Badge } from '@/components/ui/Badge';
import { HashDisplay } from '@/components/ui/HashDisplay';
import type { DecisionPreview } from '@/lib/store';
import type { EventPreview } from '@proofpack/core';

export function DecisionsTable({
  decisions,
  events,
}: {
  decisions: DecisionPreview[];
  events: EventPreview[];
}) {
  const [filterDecision, setFilterDecision] = useState<string | null>(null);

  const eventMap = useMemo(() => {
    const map = new Map<string, EventPreview>();
    for (const e of events) map.set(e.event_id, e);
    return map;
  }, [events]);

  const filtered = useMemo(() => {
    if (!filterDecision) return decisions;
    return decisions.filter((d) => d.decision === filterDecision);
  }, [decisions, filterDecision]);

  const counts = useMemo(() => {
    const c = { allow: 0, deny: 0, hold: 0 };
    for (const d of decisions) {
      if (d.decision in c) c[d.decision as keyof typeof c]++;
    }
    return c;
  }, [decisions]);

  return (
    <div className="p-4 rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Policy Decisions</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilterDecision(null)}
            className={`text-xs px-2 py-0.5 rounded ${!filterDecision ? 'bg-[var(--bg-tertiary)] text-[var(--text-primary)]' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'}`}
          >
            All ({decisions.length})
          </button>
          <button
            onClick={() => setFilterDecision('allow')}
            className={`text-xs px-2 py-0.5 rounded ${filterDecision === 'allow' ? 'bg-emerald-500/15 text-emerald-400' : 'text-[var(--text-muted)] hover:text-emerald-400'}`}
          >
            Allow ({counts.allow})
          </button>
          <button
            onClick={() => setFilterDecision('deny')}
            className={`text-xs px-2 py-0.5 rounded ${filterDecision === 'deny' ? 'bg-red-500/15 text-red-400' : 'text-[var(--text-muted)] hover:text-red-400'}`}
          >
            Deny ({counts.deny})
          </button>
          <button
            onClick={() => setFilterDecision('hold')}
            className={`text-xs px-2 py-0.5 rounded ${filterDecision === 'hold' ? 'bg-amber-500/15 text-amber-400' : 'text-[var(--text-muted)] hover:text-amber-400'}`}
          >
            Hold ({counts.hold})
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-[var(--text-muted)] border-b border-[var(--border)]">
              <th className="pb-2 pr-3 font-medium">Event</th>
              <th className="pb-2 pr-3 font-medium">Type</th>
              <th className="pb-2 pr-3 font-medium">Rule</th>
              <th className="pb-2 pr-3 font-medium">Decision</th>
              <th className="pb-2 font-medium">Reason</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {filtered.map((d) => {
              const event = eventMap.get(d.event_id);
              return (
                <tr key={d.event_id} className="hover:bg-[var(--bg-tertiary)] transition-colors">
                  <td className="py-2 pr-3">
                    <HashDisplay value={d.event_id} truncate={8} />
                  </td>
                  <td className="py-2 pr-3">
                    <code className="text-[var(--text-secondary)] font-mono">
                      {event?.type ?? '—'}
                    </code>
                  </td>
                  <td className="py-2 pr-3">
                    <code className="text-[var(--text-muted)] font-mono">{d.rule_id}</code>
                  </td>
                  <td className="py-2 pr-3">
                    <Badge label={d.decision} variant={d.decision} />
                  </td>
                  <td className="py-2 text-[var(--text-muted)]">{d.reason}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
