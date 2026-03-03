'use client';

import { HashDisplay } from '@/components/ui/HashDisplay';
import type { VerifyApiResponse } from '@/lib/store';

export function SignatureDetail({ report }: { report: VerifyApiResponse }) {
  const sigCheck = report.checks.find((c) => c.name === 'receipt.signature');
  const publicKeys = (sigCheck?.details?.public_keys as string[] | undefined) ?? [];
  const publicKey = (sigCheck?.details?.public_key as string | undefined) ?? publicKeys[0];

  return (
    <div className="p-4 rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] space-y-4">
      <h3 className="text-sm font-medium">Ed25519 Signature</h3>

      <div className="space-y-3">
        <div>
          <span className="text-xs text-[var(--text-muted)]">Algorithm</span>
          <p className="text-sm font-mono">Ed25519 over RFC 8785 canonical JSON</p>
        </div>

        {publicKey && (
          <div>
            <span className="text-xs text-[var(--text-muted)]">Public Key (base64)</span>
            <HashDisplay value={publicKey} truncate={32} />
            {publicKeys.length > 1 && (
              <p className="text-[10px] text-[var(--text-muted)] mt-1">
                {publicKeys.length} signatures present in receipt
              </p>
            )}
          </div>
        )}

        <div>
          <span className="text-xs text-[var(--text-muted)]">Canonicalization</span>
          <p className="text-sm font-mono">RFC 8785 (JSON Canonicalization Scheme)</p>
        </div>

        <div>
          <span className="text-xs text-[var(--text-muted)]">Hash Function</span>
          <p className="text-sm font-mono">SHA-256</p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-[var(--text-muted)]">Status</span>
          {sigCheck?.ok ? (
            <span className="inline-flex items-center gap-1 text-xs text-emerald-400">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              Verified
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs text-red-400">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
              Failed
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
