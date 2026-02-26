'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { usePackStore } from '@/lib/store';

const navItems = [
  { href: '/verify', label: 'Verify', key: 'v', icon: 'shield' },
  { href: '/report', label: 'Report', key: 'r', icon: 'check' },
  { href: '/timeline', label: 'Timeline', key: 't', icon: 'clock' },
  { href: '/proofs', label: 'Proofs', key: 'p', icon: 'lock' },
  { href: '/policy', label: 'Policy', key: 'o', icon: 'scroll' },
  { href: '/disclosure', label: 'Disclosure', key: 'd', icon: 'eye' },
  { href: '/export', label: 'Export', key: 'e', icon: 'download' },
];

const icons: Record<string, React.ReactNode> = {
  shield: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
      />
    </svg>
  ),
  check: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
      />
    </svg>
  ),
  clock: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  ),
  lock: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
      />
    </svg>
  ),
  scroll: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    </svg>
  ),
  eye: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
      />
    </svg>
  ),
  download: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    </svg>
  ),
};

export function LeftRail() {
  const pathname = usePathname();
  const report = usePackStore((s) => s.report);
  const hasReport = !!report;

  return (
    <nav className="w-56 border-r border-[var(--border)] bg-[var(--bg-secondary)] flex flex-col h-full">
      <div className="p-4 border-b border-[var(--border)]">
        <h1 className="text-lg font-bold tracking-tight">
          <span className="text-[var(--accent-green)]">Proof</span>Pack
        </h1>
        <p className="text-[10px] text-[var(--text-muted)] mt-0.5">Verifiable agent receipts</p>
      </div>

      <div className="flex-1 py-2">
        {navItems.map((item) => {
          const active = pathname === item.href;
          const disabled = item.href !== '/verify' && !hasReport;

          return (
            <Link
              key={item.href}
              href={disabled ? '#' : item.href}
              className={`flex items-center gap-3 px-4 py-2 text-sm transition-colors ${
                active
                  ? 'bg-[var(--accent-green)]/10 text-[var(--accent-green)] border-r-2 border-[var(--accent-green)]'
                  : disabled
                    ? 'text-[var(--text-muted)]/40 cursor-not-allowed'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/5'
              }`}
              onClick={(e) => disabled && e.preventDefault()}
            >
              {icons[item.icon]}
              <span>{item.label}</span>
              <kbd className="ml-auto text-[10px] font-mono text-[var(--text-muted)] bg-[var(--bg-tertiary)] px-1 rounded">
                {item.key}
              </kbd>
            </Link>
          );
        })}
      </div>

      <div className="p-3 border-t border-[var(--border)]">
        <button
          className="w-full text-left text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors flex items-center gap-2"
          onClick={() => {
            const event = new KeyboardEvent('keydown', { key: '/', bubbles: true });
            document.dispatchEvent(event);
          }}
        >
          <kbd className="font-mono bg-[var(--bg-tertiary)] px-1 rounded">/</kbd>
          Command palette
        </button>
      </div>
    </nav>
  );
}
