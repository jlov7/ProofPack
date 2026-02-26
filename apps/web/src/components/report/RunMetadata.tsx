'use client';

import { HashDisplay } from '@/components/ui/HashDisplay';
import type { VerifyApiResponse } from '@/lib/store';

export function RunMetadata({ summary }: { summary: VerifyApiResponse['summary'] }) {
  return (
    <div className="grid grid-cols-2 gap-4 p-4 rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)]">
      <div>
        <span className="text-xs text-[var(--text-muted)]">Run ID</span>
        <HashDisplay value={summary.run_id} truncate={24} />
      </div>
      <div>
        <span className="text-xs text-[var(--text-muted)]">Created</span>
        <p className="text-sm font-mono">{new Date(summary.created_at).toLocaleString()}</p>
      </div>
      <div>
        <span className="text-xs text-[var(--text-muted)]">Producer</span>
        <p className="text-sm">{summary.producer.name}</p>
      </div>
      <div>
        <span className="text-xs text-[var(--text-muted)]">Version</span>
        <p className="text-sm font-mono">{summary.producer.version}</p>
      </div>
    </div>
  );
}
