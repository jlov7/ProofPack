'use client';

import { useState, useEffect } from 'react';
import type { VerificationCheck } from '@proofpack/core';
import { CheckCard } from './CheckCard';

export function AnimatedChecks({ checks }: { checks: VerificationCheck[] }) {
  const [revealedCount, setRevealedCount] = useState(0);

  useEffect(() => {
    if (revealedCount >= checks.length) return;
    const timer = setTimeout(() => {
      setRevealedCount((c) => c + 1);
    }, 250);
    return () => clearTimeout(timer);
  }, [revealedCount, checks.length]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-[var(--text-secondary)]">Verification Checks</h3>
        <span className="text-xs text-[var(--text-muted)]">
          {revealedCount}/{checks.length}
        </span>
      </div>
      {checks.map((check, i) => (
        <CheckCard key={check.name} check={check} index={i} revealed={i < revealedCount} />
      ))}
    </div>
  );
}
