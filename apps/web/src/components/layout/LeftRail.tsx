'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { usePackStore } from '@/lib/store';

const navItems = [
  { href: '/verify', label: 'Load', key: 'v', icon: 'shield' },
  { href: '/report', label: 'Report', key: 'r', icon: 'check' },
  { href: '/timeline', label: 'Timeline', key: 't', icon: 'clock' },
  { href: '/proofs', label: 'Proofs', key: 'p', icon: 'lock' },
  { href: '/policy', label: 'Policy', key: 'o', icon: 'scroll' },
  { href: '/disclosure', label: 'Disclosure', key: 'd', icon: 'eye' },
  { href: '/export', label: 'Export', key: 'e', icon: 'download' },
];

const icons: Record<string, React.ReactNode> = {
  shield: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.7}
        d="M12 3.5 19 6v5.4c0 4.1-2.8 7.9-7 9.1-4.2-1.2-7-5-7-9.1V6l7-2.5Z"
      />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="m9 12 2 2 4-4" />
    </svg>
  ),
  check: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.7}
        d="M8 6h8M8 12h8M8 18h5"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.7}
        d="m16 17 1.5 1.5L21 15"
      />
    </svg>
  ),
  clock: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M12 8v4l3 2" />
      <circle cx="12" cy="12" r="8.5" strokeWidth={1.7} />
    </svg>
  ),
  lock: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.7}
        d="M7 10V8a5 5 0 0 1 10 0v2"
      />
      <rect width="14" height="10" x="5" y="10" rx="2" strokeWidth={1.7} />
    </svg>
  ),
  scroll: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M7 4h8l3 3v13H7z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M10 11h5M10 15h5" />
    </svg>
  ),
  eye: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.7}
        d="M3 12s3.3-5.5 9-5.5S21 12 21 12s-3.3 5.5-9 5.5S3 12 3 12Z"
      />
      <circle cx="12" cy="12" r="2.5" strokeWidth={1.7} />
    </svg>
  ),
  download: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.7}
        d="M12 4v10m0 0 4-4m-4 4-4-4M5 20h14"
      />
    </svg>
  ),
};

export function LeftRail() {
  const pathname = usePathname();
  const report = usePackStore((s) => s.report);
  const hasReport = !!report?.ok;
  const failedChecks = report?.checks.filter((check) => !check.ok).length ?? 0;
  const verified = !!report?.summary.verified;

  const nav = navItems.map((item) => {
    const active = pathname === item.href;
    const disabled = item.href !== '/verify' && !hasReport;
    return { ...item, active, disabled };
  });

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 border-r border-[var(--border-soft)] bg-[var(--bg-secondary)]/95 md:flex md:flex-col">
        <div className="border-b border-[var(--border-soft)] p-4">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-lg border border-[var(--border)] bg-[var(--panel-strong)] text-[var(--accent-green)] shadow-[inset_0_1px_0_oklch(0.94_0.012_96_/_0.08)]">
              {icons.shield}
            </div>
            <div>
              <h1 className="text-sm font-semibold tracking-tight">ProofPack</h1>
              <p className="text-[11px] text-[var(--text-muted)]">Evidence workbench</p>
            </div>
          </div>
        </div>

        <div className="border-b border-[var(--border-soft)] p-3">
          <div className="rounded-lg border border-[var(--border-soft)] bg-[var(--bg-primary)]/70 p-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] uppercase tracking-[0.16em] text-[var(--text-muted)]">
                Current pack
              </span>
              <span
                className={`h-2 w-2 rounded-full ${
                  verified
                    ? 'bg-[var(--accent-green)]'
                    : hasReport
                      ? 'bg-[var(--accent-red)]'
                      : 'bg-[var(--text-muted)]'
                }`}
              />
            </div>
            <p className="mt-2 truncate font-mono text-[11px] text-[var(--text-secondary)]">
              {report?.summary.run_id ?? 'No pack loaded'}
            </p>
            <div className="mt-3 flex items-center justify-between text-[11px] text-[var(--text-muted)]">
              <span>{report?.summary.profile ?? 'standard'} profile</span>
              <span>{hasReport ? `${failedChecks} failed` : 'idle'}</span>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-2">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.disabled ? '#' : item.href}
              onClick={(event) => item.disabled && event.preventDefault()}
              aria-current={item.active ? 'page' : undefined}
              data-current={item.active ? 'true' : undefined}
              data-disabled={item.disabled ? 'true' : undefined}
              className="workbench-nav-link focus-ring group mb-1 flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all duration-200"
            >
              {icons[item.icon]}
              <span>{item.label}</span>
              <kbd className="ml-auto rounded border border-[var(--border-soft)] bg-[var(--bg-primary)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--text-muted)]">
                {item.key}
              </kbd>
            </Link>
          ))}
        </nav>

        <div className="border-t border-[var(--border-soft)] p-3">
          <button
            className="focus-ring flex w-full items-center justify-between rounded-lg border border-[var(--border-soft)] bg-[var(--bg-primary)] px-3 py-2 text-left text-xs text-[var(--text-secondary)] transition-colors hover:border-[var(--border)]"
            onClick={() =>
              document.dispatchEvent(new KeyboardEvent('keydown', { key: '/', bubbles: true }))
            }
          >
            Command palette
            <kbd className="rounded bg-[var(--panel)] px-1.5 py-0.5 font-mono text-[10px]">/</kbd>
          </button>
        </div>
      </aside>

      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-7 border-t border-[var(--border-soft)] bg-[var(--bg-secondary)]/95 px-1 py-1 md:hidden">
        {nav.map((item) => (
          <Link
            key={item.href}
            href={item.disabled ? '#' : item.href}
            onClick={(event) => item.disabled && event.preventDefault()}
            aria-current={item.active ? 'page' : undefined}
            data-current={item.active ? 'true' : undefined}
            data-disabled={item.disabled ? 'true' : undefined}
            className="workbench-mobile-nav-link focus-ring flex flex-col items-center gap-1 rounded-md px-1 py-2 text-[10px]"
          >
            {icons[item.icon]}
            <span className="truncate">{item.label}</span>
          </Link>
        ))}
      </nav>
    </>
  );
}
