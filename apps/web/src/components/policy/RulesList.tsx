'use client';

import { Badge } from '@/components/ui/Badge';
import type { PolicyRulePreview } from '@/lib/store';

const severityColors: Record<string, string> = {
  low: 'text-slate-400',
  medium: 'text-amber-400',
  high: 'text-orange-400',
  critical: 'text-red-400',
};

export function RulesList({ rules }: { rules: PolicyRulePreview[] }) {
  return (
    <div className="p-4 rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Policy Rules</h3>
        <span className="text-xs text-[var(--text-muted)]">
          {rules.length} rules + default-deny
        </span>
      </div>

      <div className="space-y-2">
        {rules.map((rule) => (
          <div
            key={rule.id}
            className="p-3 rounded border border-[var(--border)] bg-[var(--bg-tertiary)] space-y-2"
          >
            <div className="flex items-center justify-between">
              <code className="text-xs font-mono text-[var(--text-primary)]">{rule.id}</code>
              <div className="flex items-center gap-2">
                <span className={`text-xs ${severityColors[rule.severity] ?? 'text-slate-400'}`}>
                  {rule.severity}
                </span>
                <Badge label={rule.decision} variant={rule.decision} />
              </div>
            </div>

            <p className="text-xs text-[var(--text-muted)]">{rule.reason}</p>

            <div className="flex flex-wrap gap-2">
              {Object.entries(rule.when).map(([key, value]) => (
                <span
                  key={key}
                  className="inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--bg-primary)] text-[var(--text-muted)]"
                >
                  <span className="text-[var(--text-secondary)]">{key}:</span> {value}
                </span>
              ))}
            </div>
          </div>
        ))}

        {/* Default-deny fallback */}
        <div className="p-3 rounded border border-dashed border-red-500/30 bg-red-500/5 flex items-center justify-between">
          <div>
            <code className="text-xs font-mono text-[var(--text-muted)]">default</code>
            <p className="text-xs text-red-400/70 mt-0.5">
              Events not matching any rule are denied
            </p>
          </div>
          <Badge label="deny" variant="deny" />
        </div>
      </div>
    </div>
  );
}
