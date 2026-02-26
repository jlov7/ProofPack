'use client';

import { useState } from 'react';
import { usePackStore } from '@/lib/store';
import { redactPack as redactPackApi, verifyPack as verifyPackApi } from '@/lib/api';

export function OpeningsFlow() {
  const packZip = usePackStore((s) => s.packZip);
  const redacting = usePackStore((s) => s.redacting);
  const setRedacting = usePackStore((s) => s.setRedacting);

  const [publicZip, setPublicZip] = useState<ArrayBuffer | null>(null);
  const [publicVerified, setPublicVerified] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRedact = async () => {
    if (!packZip) return;
    setRedacting(true);
    setError(null);
    setPublicVerified(null);

    try {
      const blob = new Blob([packZip], { type: 'application/zip' });
      const publicBuffer = await redactPackApi(blob);
      setPublicZip(publicBuffer);

      // Verify the public pack
      const publicBlob = new Blob([publicBuffer], { type: 'application/zip' });
      const result = await verifyPackApi(publicBlob);
      setPublicVerified(result.ok && result.summary.verified);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setRedacting(false);
    }
  };

  const handleDownloadPublic = () => {
    if (!publicZip) return;
    const blob = new Blob([publicZip], { type: 'application/zip' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'public.proofpack.zip';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] space-y-3">
      <h3 className="text-sm font-medium">Create Public Pack</h3>
      <p className="text-xs text-[var(--text-muted)]">
        Generate a redacted public version of the current pack. Event payloads are replaced with
        SHA-256 commitments. The public pack is re-signed and independently verifiable.
      </p>

      <div className="flex items-center gap-3">
        <button
          onClick={handleRedact}
          disabled={!packZip || redacting}
          className="px-3 py-1.5 text-xs font-medium rounded bg-[var(--accent-green)] text-black hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {redacting ? 'Redacting...' : 'Generate Public Pack'}
        </button>

        {publicZip && (
          <button
            onClick={handleDownloadPublic}
            className="px-3 py-1.5 text-xs font-medium rounded border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] transition-colors"
          >
            Download Public Pack
          </button>
        )}
      </div>

      {error && (
        <div className="p-2 rounded border border-red-500/30 bg-red-500/5 text-xs text-red-400">
          {error}
        </div>
      )}

      {publicVerified !== null && (
        <div
          className={`p-3 rounded border ${publicVerified ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-red-500/30 bg-red-500/5'}`}
        >
          <div className="flex items-center gap-2">
            {publicVerified ? (
              <>
                <span className="text-emerald-400 text-sm">&#10003;</span>
                <span className="text-xs text-emerald-400 font-medium">
                  Public pack verified successfully
                </span>
              </>
            ) : (
              <>
                <span className="text-red-400 text-sm">&#10007;</span>
                <span className="text-xs text-red-400 font-medium">
                  Public pack verification failed
                </span>
              </>
            )}
          </div>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            {publicVerified
              ? 'Commitments are intact. Openings can be disclosed to reveal specific events.'
              : 'The redacted pack could not be verified. This may indicate a problem with the source pack.'}
          </p>
        </div>
      )}
    </div>
  );
}
