'use client';

import { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { usePackStore } from '@/lib/store';
import { EventList } from '@/components/timeline/EventList';
import { EventDrawer } from '@/components/timeline/EventDrawer';
import { TimelineFilters } from '@/components/timeline/TimelineFilters';

export default function TimelinePage() {
  const router = useRouter();
  const report = usePackStore((s) => s.report);
  const selectedEventId = usePackStore((s) => s.selectedEventId);
  const setSelectedEventId = usePackStore((s) => s.setSelectedEventId);

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [decisionFilter, setDecisionFilter] = useState<string | null>(null);

  const events = report?.events_preview ?? [];

  const eventTypes = useMemo(() => {
    const types = new Set(events.map((e) => e.type));
    return Array.from(types).sort();
  }, [events]);

  const filtered = useMemo(() => {
    return events.filter((e) => {
      if (typeFilter && e.type !== typeFilter) return false;
      if (decisionFilter && e.decision !== decisionFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          e.type.toLowerCase().includes(q) ||
          e.summary.toLowerCase().includes(q) ||
          e.event_id.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [events, typeFilter, decisionFilter, search]);

  const selectedEvent = useMemo(
    () => events.find((e) => e.event_id === selectedEventId) ?? null,
    [events, selectedEventId],
  );

  const handleClose = useCallback(() => setSelectedEventId(null), [setSelectedEventId]);

  if (!report) {
    return (
      <div className="flex flex-col items-center justify-center min-h-full p-8">
        <p className="text-[var(--text-muted)] mb-4">No pack loaded yet.</p>
        <button
          onClick={() => router.push('/verify')}
          className="text-sm text-[var(--accent-green)] hover:underline"
        >
          Go to Verify
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      <div className="flex-1 flex flex-col min-w-0">
        <div className="px-4 py-3 border-b border-[var(--border)]">
          <h2 className="text-lg font-bold">Event Timeline</h2>
          <p className="text-xs text-[var(--text-muted)]">
            {filtered.length} of {events.length} events
          </p>
        </div>
        <TimelineFilters
          search={search}
          onSearchChange={setSearch}
          typeFilter={typeFilter}
          onTypeFilterChange={setTypeFilter}
          decisionFilter={decisionFilter}
          onDecisionFilterChange={setDecisionFilter}
          eventTypes={eventTypes}
        />
        <EventList events={filtered} selectedId={selectedEventId} onSelect={setSelectedEventId} />
      </div>
      <EventDrawer event={selectedEvent} onClose={handleClose} />
    </div>
  );
}
