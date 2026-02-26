'use client';

import { useState, useCallback } from 'react';

export function HashDisplay({
  value,
  label,
  truncate = 16,
}: {
  value: string;
  label?: string;
  truncate?: number;
}) {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [value]);

  const display =
    truncate && value.length > truncate
      ? `${value.slice(0, truncate / 2)}...${value.slice(-truncate / 2)}`
      : value;

  return (
    <div className="flex items-center gap-2">
      {label && <span className="text-xs text-[var(--text-muted)]">{label}</span>}
      <code className="font-mono text-xs text-[var(--text-secondary)] bg-[var(--bg-tertiary)] px-1.5 py-0.5 rounded">
        {display}
      </code>
      <button
        onClick={copy}
        className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
        title="Copy to clipboard"
      >
        {copied ? 'Copied' : 'Copy'}
      </button>
    </div>
  );
}
