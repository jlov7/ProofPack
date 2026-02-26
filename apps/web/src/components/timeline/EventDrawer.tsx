'use client';

import { useEffect } from 'react';
import type { EventPreview } from '@proofpack/core';
import { HashDisplay } from '@/components/ui/HashDisplay';
import { Badge } from '@/components/ui/Badge';

export function EventDrawer({
  event,
  onClose,
}: {
  event: EventPreview | null;
  onClose: () => void;
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  if (!event) return null;

  return (
    <div className="w-80 border-l border-[var(--border)] bg-[var(--bg-secondary)] h-full overflow-y-auto shrink-0">
      <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
        <h3 className="text-sm font-medium">Event Detail</h3>
        <button
          onClick={onClose}
          className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      <div className="p-4 space-y-4">
        <div>
          <span className="text-xs text-[var(--text-muted)]">Type</span>
          <p className="text-sm font-mono mt-0.5">{event.type}</p>
        </div>

        <div>
          <span className="text-xs text-[var(--text-muted)]">Event ID</span>
          <HashDisplay value={event.event_id} truncate={20} />
        </div>

        <div>
          <span className="text-xs text-[var(--text-muted)]">Timestamp</span>
          <p className="text-sm font-mono mt-0.5">{new Date(event.ts).toISOString()}</p>
        </div>

        {event.decision && (
          <div>
            <span className="text-xs text-[var(--text-muted)]">Decision</span>
            <div className="mt-1">
              <Badge label={event.decision} variant={event.decision} />
            </div>
          </div>
        )}

        <div>
          <span className="text-xs text-[var(--text-muted)]">Summary</span>
          <pre className="text-xs text-[var(--text-secondary)] font-mono mt-1 whitespace-pre-wrap break-all bg-[var(--bg-tertiary)] p-2 rounded">
            {event.summary}
          </pre>
        </div>
      </div>
    </div>
  );
}
