'use client';

export function StatusChip({ verified }: { verified: boolean }) {
  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full border px-5 py-2.5 text-sm font-bold tracking-[0.12em] transition-all ${
        verified
          ? 'border-[var(--accent-green)]/35 bg-[var(--accent-green)]/12 text-[var(--accent-green)]'
          : 'border-[var(--accent-red)]/35 bg-[var(--accent-red)]/12 text-red-200'
      }`}
    >
      {verified ? (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
          />
        </svg>
      ) : (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      )}
      {verified ? 'VERIFIED' : 'NOT VERIFIED'}
    </div>
  );
}
