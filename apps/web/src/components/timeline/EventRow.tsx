'use client';

import type { EventPreview } from '@proofpack/core';
import { Badge } from '@/components/ui/Badge';

const typeLabels: Record<string, string> = {
  'run.start': 'RS',
  'run.end': 'RE',
  'fs.read': 'FR',
  'fs.write': 'FW',
  'tool.call': 'TC',
  'shell.exec': 'SH',
  'net.http': 'NW',
  'hold.request': 'HR',
  'hold.approve': 'HA',
  'hold.reject': 'HJ',
};

export function EventRow({
  event,
  selected,
  onClick,
}: {
  event: EventPreview;
  selected: boolean;
  onClick: () => void;
}) {
  const typeLabel = typeLabels[event.type] ?? 'EV';
  const time = new Date(event.ts).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  return (
    <button
      onClick={onClick}
      className={`focus-ring flex w-full items-center gap-3 border-b border-[var(--border)] px-4 py-3 text-left transition-colors ${
        selected
          ? 'bg-[var(--accent-green)]/5 border-l-2 border-l-[var(--accent-green)]'
          : 'hover:bg-white/[0.02]'
      }`}
    >
      <span
        className="grid h-7 w-7 shrink-0 place-items-center rounded-md border border-[var(--border-soft)] bg-[var(--bg-primary)] font-mono text-[10px] text-[var(--text-secondary)]"
        title={event.type}
      >
        {typeLabel}
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <code className="text-xs font-mono text-[var(--text-primary)]">{event.type}</code>
          {event.decision && <Badge label={event.decision} variant={event.decision} />}
        </div>
        <p className="text-xs text-[var(--text-muted)] truncate mt-0.5">{event.summary}</p>
      </div>
      <span className="text-[10px] font-mono text-[var(--text-muted)] shrink-0">{time}</span>
    </button>
  );
}
