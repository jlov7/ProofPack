'use client';

import type { EventPreview } from '@proofpack/core';
import { Badge } from '@/components/ui/Badge';

const typeIcons: Record<string, string> = {
  'run.start': '▶',
  'run.end': '⏹',
  'fs.read': '📄',
  'fs.write': '✏️',
  'tool.call': '🔧',
  'shell.exec': '💻',
  'net.http': '🌐',
  'hold.request': '⏸',
  'hold.approve': '✅',
  'hold.reject': '❌',
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
  const icon = typeIcons[event.type] ?? '●';
  const time = new Date(event.ts).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-colors border-b border-[var(--border)] ${
        selected
          ? 'bg-[var(--accent-green)]/5 border-l-2 border-l-[var(--accent-green)]'
          : 'hover:bg-white/[0.02]'
      }`}
    >
      <span className="text-base shrink-0 w-6 text-center" title={event.type}>
        {icon}
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
