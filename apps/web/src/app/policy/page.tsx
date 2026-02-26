'use client';

import { useRouter } from 'next/navigation';
import { usePackStore } from '@/lib/store';
import { RulesList } from '@/components/policy/RulesList';
import { DecisionsTable } from '@/components/policy/DecisionsTable';

export default function PolicyPage() {
  const router = useRouter();
  const report = usePackStore((s) => s.report);

  if (!report || !report.ok) {
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

  const policyCheck = report.checks.find((c) => c.name === 'policy.hash');

  return (
    <div className="max-w-4xl mx-auto p-8 space-y-6">
      <div>
        <h2 className="text-lg font-bold">Policy &amp; Decisions</h2>
        <p className="text-xs text-[var(--text-muted)] mt-1">
          Governance rules and per-event policy decisions
        </p>
      </div>

      <div className="p-4 rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] flex items-center gap-3">
        {policyCheck?.ok ? (
          <span className="text-xs text-emerald-400">&#10003; Policy hash verified</span>
        ) : (
          <span className="text-xs text-red-400">&#10007; Policy hash mismatch</span>
        )}
        <span className="text-xs text-[var(--text-muted)]">
          SHA-256 of policy.yml and decisions.jsonl match receipt
        </span>
      </div>

      {report.policy_rules && report.policy_rules.length > 0 && (
        <RulesList rules={report.policy_rules} />
      )}

      {report.decisions && report.decisions.length > 0 && (
        <DecisionsTable decisions={report.decisions} events={report.events_preview} />
      )}
    </div>
  );
}
