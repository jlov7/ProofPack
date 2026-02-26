'use client';

import { useState, useCallback } from 'react';
import { usePackStore } from '@/lib/store';
import type { TamperResult, VerifyApiResponse } from '@/lib/store';
import { StatusChip } from './StatusChip';

export function TamperSimulator() {
  const { report, packZip, tamperResult, setTamperResult } = usePackStore();
  const [loading, setLoading] = useState(false);

  const simulate = useCallback(async () => {
    if (!packZip || !report) return;
    setLoading(true);
    try {
      // Send the original pack to get a fresh verified result
      const originalBlob = new Blob([packZip], { type: 'application/zip' });

      // Tamper: flip a byte in the zip to corrupt it
      const tampered = new Uint8Array(packZip.slice(0));
      // Find and modify a JSON-like byte deep in the file to corrupt content
      const searchTarget = new TextEncoder().encode('"run_id"');
      let offset = -1;
      for (let i = 0; i < tampered.length - searchTarget.length; i++) {
        let match = true;
        for (let j = 0; j < searchTarget.length; j++) {
          if (tampered[i + j] !== searchTarget[j]) {
            match = false;
            break;
          }
        }
        if (match) {
          // Corrupt the value after the key (skip ahead past the key + some chars)
          offset = i + searchTarget.length + 5;
          break;
        }
      }

      if (offset > 0 && offset < tampered.length) {
        // Flip a byte
        tampered[offset] = tampered[offset]! ^ 0xff;
      }

      const tamperedBlob = new Blob([tampered], { type: 'application/zip' });

      // Verify both
      const [originalRes, tamperedRes] = await Promise.all([
        fetch('/api/verify', {
          method: 'POST',
          body: (() => {
            const f = new FormData();
            f.append('file', originalBlob);
            return f;
          })(),
        }).then((r) => r.json() as Promise<VerifyApiResponse>),
        fetch('/api/verify', {
          method: 'POST',
          body: (() => {
            const f = new FormData();
            f.append('file', tamperedBlob);
            return f;
          })(),
        }).then((r) => r.json() as Promise<VerifyApiResponse>),
      ]);

      setTamperResult({
        original: originalRes,
        tampered: tamperedRes,
      });
    } catch {
      // If tamper simulation fails, show best-effort
    } finally {
      setLoading(false);
    }
  }, [packZip, report, setTamperResult]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-[var(--text-secondary)]">Tamper Detection</h3>
        <button
          onClick={simulate}
          disabled={loading || !packZip}
          className="px-3 py-1.5 text-xs rounded border border-[var(--accent-amber)]/30 bg-[var(--accent-amber)]/5 text-amber-400 hover:bg-[var(--accent-amber)]/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Simulating...' : 'Test tamper detection'}
        </button>
      </div>

      {tamperResult && <TamperComparison result={tamperResult} />}
    </div>
  );
}

function TamperComparison({ result }: { result: TamperResult }) {
  const failedCheck = result.tampered.checks?.find((c) => !c.ok);

  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="p-4 rounded-lg border border-emerald-500/20 bg-emerald-900/10">
        <p className="text-xs text-[var(--text-muted)] mb-2">Original Pack</p>
        <StatusChip verified={result.original.summary?.verified ?? false} />
        <div className="mt-3 space-y-1">
          {result.original.checks?.map((c) => (
            <div key={c.name} className="flex items-center gap-2 text-xs">
              {c.ok ? (
                <span className="text-emerald-400">&#10003;</span>
              ) : (
                <span className="text-red-400">&#10007;</span>
              )}
              <span className="text-[var(--text-secondary)]">{c.name}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="p-4 rounded-lg border border-red-500/20 bg-red-900/10">
        <p className="text-xs text-[var(--text-muted)] mb-2">Tampered Pack</p>
        <StatusChip verified={result.tampered.summary?.verified ?? false} />
        <div className="mt-3 space-y-1">
          {result.tampered.checks?.map((c) => (
            <div key={c.name} className="flex items-center gap-2 text-xs">
              {c.ok ? (
                <span className="text-emerald-400">&#10003;</span>
              ) : (
                <span className="text-red-400">&#10007;</span>
              )}
              <span className="text-[var(--text-secondary)]">{c.name}</span>
            </div>
          ))}
        </div>
        {failedCheck && (
          <div className="mt-3 p-2 rounded bg-red-900/30 text-xs text-red-300">
            <strong>Failed:</strong> {failedCheck.name}
            {failedCheck.error && <span> — {failedCheck.error}</span>}
          </div>
        )}
      </div>
    </div>
  );
}
