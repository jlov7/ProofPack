'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DropZone } from '@/components/verify/DropZone';
import { usePackStore } from '@/lib/store';
import { verifyPack, fetchDemoPack } from '@/lib/api';

export default function VerifyPage() {
  const router = useRouter();
  const { verifying, error, setVerifying, setReport, setPackZip, setError, reset } = usePackStore();
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    const key = 'proofpack_onboarding_v1';
    const seen = window.localStorage.getItem(key);
    if (!seen) {
      setShowOnboarding(true);
    }
  }, []);

  const handleFile = useCallback(
    async (file: File) => {
      reset();
      setVerifying(true);
      try {
        const result = await verifyPack(file);
        const buffer = await file.arrayBuffer();
        setPackZip(buffer);
        setReport(result);
        router.push('/report');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Verification failed');
      } finally {
        setVerifying(false);
      }
    },
    [reset, setVerifying, setReport, setPackZip, setError, router],
  );

  const handleDemo = useCallback(async () => {
    reset();
    setVerifying(true);
    try {
      const buffer = await fetchDemoPack();
      const blob = new Blob([buffer], { type: 'application/zip' });
      const result = await verifyPack(blob);
      setPackZip(buffer);
      setReport(result);
      router.push('/report');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load demo pack');
    } finally {
      setVerifying(false);
    }
  }, [reset, setVerifying, setReport, setPackZip, setError, router]);

  const dismissOnboarding = useCallback(() => {
    window.localStorage.setItem('proofpack_onboarding_v1', '1');
    setShowOnboarding(false);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-full p-8 grid-bg">
      <div className="w-full max-w-lg space-y-6">
        {showOnboarding && (
          <div className="rounded-lg border border-[var(--accent-green)]/30 bg-[var(--accent-green)]/5 p-4 space-y-3">
            <div>
              <h3 className="text-sm font-semibold text-[var(--accent-green)]">
                Quick Start Wizard
              </h3>
              <p className="text-xs text-[var(--text-secondary)] mt-1">
                1) Load a demo pack or upload your own zip 2) Review checks 3) Export evidence.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={async () => {
                  dismissOnboarding();
                  await handleDemo();
                }}
                disabled={verifying}
                className="px-3 py-1.5 text-xs font-medium rounded bg-[var(--accent-green)] text-black hover:brightness-110 transition-all disabled:opacity-50"
              >
                Launch Example Pack
              </button>
              <button
                onClick={dismissOnboarding}
                className="px-3 py-1.5 text-xs rounded border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] transition-colors"
              >
                Skip
              </button>
            </div>
          </div>
        )}

        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold">Verify a ProofPack</h2>
          <p className="text-sm text-[var(--text-secondary)]">
            Upload a signed agent receipt to verify its integrity, authenticity, and policy
            compliance.
          </p>
        </div>

        <DropZone onFile={handleFile} loading={verifying} />

        {error && (
          <div className="p-3 rounded border border-[var(--accent-red)]/30 bg-red-900/20 text-sm text-red-300">
            {error}
          </div>
        )}

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[var(--border)]" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-[var(--bg-primary)] px-3 text-[var(--text-muted)]">or</span>
          </div>
        </div>

        <button
          onClick={handleDemo}
          disabled={verifying}
          className="w-full py-3 px-4 rounded-lg border border-[var(--accent-green)]/30 bg-[var(--accent-green)]/5 text-[var(--accent-green)] text-sm font-medium hover:bg-[var(--accent-green)]/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Try the demo pack
        </button>

        <p className="text-center text-xs text-[var(--text-muted)]">
          13 events including denies, holds, and approvals — fully signed and verifiable.
        </p>
      </div>
    </div>
  );
}
