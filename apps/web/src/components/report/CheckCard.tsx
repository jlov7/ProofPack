'use client';

import { useState } from 'react';
import type { VerificationCheck } from '@proofpack/core';

const checkLabels: Record<string, string> = {
  'manifest.schema': 'Schema Validation',
  'receipt.signature': 'Ed25519 Signature',
  'merkle.root': 'Merkle Root',
  'merkle.inclusion_all': 'Inclusion Proofs',
  'policy.hash': 'Policy Integrity',
  'disclosure.openings': 'Disclosure Openings',
};

const checkDescriptions: Record<string, string> = {
  'manifest.schema': 'Manifest and receipt match expected schema',
  'receipt.signature': 'Signed block verified against Ed25519 public key',
  'merkle.root': 'Recomputed Merkle root matches receipt',
  'merkle.inclusion_all': 'Every event has a valid inclusion proof',
  'policy.hash': 'Policy and decisions hashes match receipt',
  'disclosure.openings': 'Opened payloads match commitments',
};

export function CheckCard({
  check,
  index,
  revealed,
}: {
  check: VerificationCheck;
  index: number;
  revealed: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  if (!revealed) {
    return (
      <div
        className="p-4 rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)]"
        style={{ animationDelay: `${index * 200}ms` }}
      >
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-[var(--text-muted)] border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-[var(--text-muted)]">
            Checking {checkLabels[check.name] ?? check.name}...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      className="animate-fade-slide-in p-4 rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] cursor-pointer hover:bg-[var(--bg-tertiary)]/50 transition-colors"
      style={{ animationDelay: `${index * 200}ms` }}
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-center gap-3">
        {check.ok ? (
          <svg
            className="w-5 h-5 text-emerald-400 shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <svg
            className="w-5 h-5 text-red-400 shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{checkLabels[check.name] ?? check.name}</span>
            <code className="text-[10px] text-[var(--text-muted)] font-mono">{check.name}</code>
          </div>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            {check.error ?? checkDescriptions[check.name] ?? ''}
          </p>
        </div>
        <svg
          className={`w-4 h-4 text-[var(--text-muted)] transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {expanded && Object.keys(check.details).length > 0 && (
        <div className="mt-3 pt-3 border-t border-[var(--border)]">
          <pre className="text-xs text-[var(--text-secondary)] font-mono overflow-x-auto">
            {JSON.stringify(check.details, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
