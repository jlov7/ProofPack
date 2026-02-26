'use client';

import { useRouter } from 'next/navigation';
import { usePackStore } from '@/lib/store';
import { StatusChip } from '@/components/report/StatusChip';
import { RunMetadata } from '@/components/report/RunMetadata';
import { AnimatedChecks } from '@/components/report/AnimatedChecks';
import { TamperSimulator } from '@/components/report/TamperSimulator';

export default function ReportPage() {
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

  return (
    <div className="max-w-2xl mx-auto p-8 space-y-6">
      <div className="text-center">
        <StatusChip verified={report.summary.verified} />
      </div>

      <RunMetadata summary={report.summary} />

      <AnimatedChecks checks={report.checks} />

      <div className="border-t border-[var(--border)] pt-6">
        <TamperSimulator />
      </div>
    </div>
  );
}
