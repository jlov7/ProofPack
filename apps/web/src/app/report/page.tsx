'use client';

import { useRouter } from 'next/navigation';
import { usePackStore } from '@/lib/store';
import { StatusChip } from '@/components/report/StatusChip';
import { AnimatedChecks } from '@/components/report/AnimatedChecks';
import { TamperSimulator } from '@/components/report/TamperSimulator';

function EmptyState() {
  const router = useRouter();
  return (
    <div className="grid min-h-[100dvh] place-items-center p-6">
      <div className="rounded-2xl border border-[var(--border-soft)] bg-[var(--panel)] p-6 text-center">
        <p className="text-sm text-[var(--text-muted)]">No pack loaded yet.</p>
        <button
          onClick={() => router.push('/verify')}
          className="focus-ring mt-4 rounded-full bg-[var(--accent-green)] px-4 py-2 text-sm font-semibold text-[var(--bg-primary)]"
        >
          Load a pack
        </button>
      </div>
    </div>
  );
}

export default function ReportPage() {
  const report = usePackStore((s) => s.report);

  if (!report?.ok) return <EmptyState />;

  const failedChecks = report.checks.filter((check) => !check.ok);
  const signatureCheck = report.checks.find((check) => check.name === 'receipt.signature');
  const trustCheck = report.checks.find((check) => check.name === 'receipt.trust');
  const derivation = report.receipt?.signed_block.derivation;
  const signatures =
    (signatureCheck?.details.signature_count as number | undefined) ??
    report.receipt?.signatures?.length ??
    (report.receipt?.signature ? 1 : 0);

  return (
    <div className="px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="rounded-2xl border border-[var(--border-soft)] bg-[var(--bg-secondary)]/80 p-5 shadow-[var(--shadow-soft)] md:p-7">
          <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
            <div>
              <StatusChip verified={report.summary.verified} />
              <h2 className="mt-5 text-3xl font-semibold tracking-tight md:text-5xl">
                {report.summary.verified ? 'Evidence chain intact.' : 'Evidence chain failed.'}
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
                Run {report.summary.run_id} from {report.summary.producer.name}{' '}
                {report.summary.producer.version}. Profile: {report.summary.profile ?? 'standard'}.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center md:min-w-80">
              <div className="rounded-xl border border-[var(--border-soft)] bg-[var(--bg-primary)] p-3">
                <p className="font-mono text-2xl">{report.checks.length - failedChecks.length}</p>
                <p className="text-[11px] text-[var(--text-muted)]">passed</p>
              </div>
              <div className="rounded-xl border border-[var(--border-soft)] bg-[var(--bg-primary)] p-3">
                <p className="font-mono text-2xl">{failedChecks.length}</p>
                <p className="text-[11px] text-[var(--text-muted)]">failed</p>
              </div>
              <div className="rounded-xl border border-[var(--border-soft)] bg-[var(--bg-primary)] p-3">
                <p className="font-mono text-2xl">{report.events_preview.length}</p>
                <p className="text-[11px] text-[var(--text-muted)]">events</p>
              </div>
            </div>
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <section className="rounded-2xl border border-[var(--border-soft)] bg-[var(--panel)]/86 p-5">
            <AnimatedChecks checks={report.checks} />
          </section>

          <aside className="space-y-4">
            <div className="rounded-2xl border border-[var(--border-soft)] bg-[var(--panel)] p-5">
              <h3 className="text-sm font-semibold">Trust posture</h3>
              <dl className="mt-4 space-y-3 text-xs">
                <div className="flex justify-between gap-4">
                  <dt className="text-[var(--text-muted)]">Signatures</dt>
                  <dd className="font-mono text-[var(--text-primary)]">{signatures}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-[var(--text-muted)]">Threshold</dt>
                  <dd className="font-mono text-[var(--text-primary)]">
                    {(signatureCheck?.details.threshold as number | undefined) ??
                      report.receipt?.threshold ??
                      (signatures > 0 ? 1 : 0)}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-[var(--text-muted)]">Trust store</dt>
                  <dd
                    className={
                      trustCheck?.ok ? 'text-[var(--accent-green)]' : 'text-[var(--text-secondary)]'
                    }
                  >
                    {trustCheck ? (trustCheck.ok ? 'trusted' : 'failed') : 'not required'}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-[var(--text-muted)]">Derivation</dt>
                  <dd className="text-right text-[var(--text-secondary)]">
                    {derivation ? derivation.signer_policy.replaceAll('_', ' ') : 'source pack'}
                  </dd>
                </div>
              </dl>
            </div>

            {failedChecks.length > 0 && (
              <div className="rounded-2xl border border-[var(--accent-red)]/30 bg-[var(--accent-red)]/10 p-5">
                <h3 className="text-sm font-semibold text-red-200">Failed checks</h3>
                <div className="mt-3 space-y-3">
                  {failedChecks.map((check) => (
                    <div key={check.name} className="text-xs">
                      <p className="font-mono text-red-100">{check.name}</p>
                      <p className="mt-1 text-red-200/80">{check.error}</p>
                      {check.hint && (
                        <p className="mt-1 text-[var(--text-secondary)]">{check.hint}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </aside>
        </div>

        <section className="rounded-2xl border border-[var(--border-soft)] bg-[var(--panel)]/86 p-5">
          <TamperSimulator />
        </section>
      </div>
    </div>
  );
}
