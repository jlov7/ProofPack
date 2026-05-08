'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DropZone } from '@/components/verify/DropZone';
import { usePackStore } from '@/lib/store';
import { verifyPack, fetchDemoPack, type VerifyRequestOptions } from '@/lib/api';

const profiles: Array<NonNullable<VerifyRequestOptions['profile']>> = [
  'standard',
  'strict',
  'permissive',
];

export default function VerifyPage() {
  const router = useRouter();
  const { verifying, error, setVerifying, setReport, setPackZip, setError, reset } = usePackStore();
  const [profile, setProfile] = useState<NonNullable<VerifyRequestOptions['profile']>>('standard');
  const [trustStore, setTrustStore] = useState('');
  const [requireTrustedKey, setRequireTrustedKey] = useState(false);
  const [requireTimestampAnchor, setRequireTimestampAnchor] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    const key = 'proofpack_onboarding_v2';
    const seen = window.localStorage.getItem(key);
    if (!seen) setShowOnboarding(true);
  }, []);

  const options = useMemo<VerifyRequestOptions>(
    () => ({ profile, trustStore, requireTrustedKey, requireTimestampAnchor }),
    [profile, trustStore, requireTrustedKey, requireTimestampAnchor],
  );

  const handleFile = useCallback(
    async (file: File | Blob) => {
      reset();
      setVerifying(true);
      try {
        const result = await verifyPack(file, options);
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
    [reset, setVerifying, setReport, setPackZip, setError, router, options],
  );

  const handleDemo = useCallback(async () => {
    reset();
    setVerifying(true);
    try {
      const buffer = await fetchDemoPack();
      const blob = new Blob([buffer], { type: 'application/zip' });
      const result = await verifyPack(blob, options);
      setPackZip(buffer);
      setReport(result);
      router.push('/report');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load demo pack');
    } finally {
      setVerifying(false);
    }
  }, [reset, setVerifying, setReport, setPackZip, setError, router, options]);

  const dismissOnboarding = useCallback(() => {
    window.localStorage.setItem('proofpack_onboarding_v2', '1');
    setShowOnboarding(false);
  }, []);

  return (
    <div className="grid min-h-[100dvh] grid-cols-1 gap-6 px-4 py-5 sm:px-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:px-8 lg:py-8">
      <section className="flex min-h-[calc(100dvh-2.5rem)] flex-col justify-between rounded-2xl border border-[var(--border-soft)] bg-[var(--bg-secondary)]/72 p-5 shadow-[var(--shadow-soft)] md:p-7">
        <div>
          <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-3xl">
              <p className="mb-3 text-[11px] uppercase tracking-[0.18em] text-[var(--text-muted)]">
                Portable receipts for AI agent runs
              </p>
              <h2 className="max-w-4xl text-4xl font-semibold leading-[0.98] tracking-tight text-[var(--text-primary)] md:text-6xl">
                Verify the run before you trust the result.
              </h2>
              <p className="mt-5 max-w-2xl text-sm leading-6 text-[var(--text-secondary)] md:text-base">
                Load a `.proofpack.zip` to verify signatures, Merkle roots, policy hashes,
                disclosure openings, trust metadata, and append-only history with the same core
                engine used by the CLI.
              </p>
            </div>
            <button
              onClick={handleDemo}
              disabled={verifying}
              className="focus-ring rounded-full bg-[var(--accent-green)] px-4 py-2 text-sm font-semibold text-[var(--bg-primary)] transition-transform duration-200 hover:-translate-y-0.5 disabled:opacity-50"
            >
              Try demo pack
            </button>
          </div>

          {showOnboarding && (
            <div className="mb-5 rounded-xl border border-[var(--accent-blue)]/30 bg-[var(--accent-blue)]/10 p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                    Workbench flow
                  </h3>
                  <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">
                    Load a pack, triage checks, inspect events, trace proofs, build a public
                    disclosure, then export evidence.
                  </p>
                </div>
                <button
                  onClick={dismissOnboarding}
                  className="focus-ring rounded-full border border-[var(--border)] px-3 py-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}

          <DropZone onFile={handleFile} loading={verifying} />

          {error && (
            <div className="mt-5 rounded-xl border border-[var(--accent-red)]/35 bg-[var(--accent-red)]/10 p-4 text-sm text-red-200">
              {error}
            </div>
          )}
        </div>

        <div className="mt-8 grid grid-cols-1 gap-3 border-t border-[var(--border-soft)] pt-5 text-xs text-[var(--text-muted)] sm:grid-cols-3">
          <p>
            <span className="block font-mono text-lg text-[var(--text-primary)]">RFC8785</span>
            canonical receipt block
          </p>
          <p>
            <span className="block font-mono text-lg text-[var(--text-primary)]">RFC6962</span>
            Merkle inclusion proofs
          </p>
          <p>
            <span className="block font-mono text-lg text-[var(--text-primary)]">Ed25519</span>
            signatures or unsigned projections
          </p>
        </div>
      </section>

      <aside className="rounded-2xl border border-[var(--border-soft)] bg-[var(--panel)]/88 p-5 shadow-[var(--shadow-soft)]">
        <div>
          <h3 className="text-sm font-semibold">Verification controls</h3>
          <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">
            Choose the policy profile before loading a pack. Strict mode requires trust, timestamp,
            and history evidence.
          </p>
        </div>

        <div
          className="mt-5 grid grid-cols-3 rounded-xl border border-[var(--border-soft)] bg-[var(--bg-primary)] p-1"
          role="group"
          aria-label="Verification profile"
        >
          {profiles.map((item) => (
            <button
              key={item}
              onClick={() => setProfile(item)}
              aria-pressed={profile === item}
              className={`focus-ring rounded-lg px-2 py-2 text-xs font-medium capitalize transition-colors ${
                profile === item
                  ? 'bg-[var(--accent-green)] text-[var(--bg-primary)]'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--panel)]'
              }`}
            >
              {item}
            </button>
          ))}
        </div>

        <label className="mt-5 block">
          <span className="text-xs font-medium text-[var(--text-secondary)]">Trust store JSON</span>
          <textarea
            value={trustStore}
            onChange={(event) => setTrustStore(event.target.value)}
            rows={7}
            spellCheck={false}
            placeholder='{"keys":[{"key_id":"...","public_key":"...","status":"active"}]}'
            className="focus-ring mt-2 w-full resize-none rounded-xl border border-[var(--border-soft)] bg-[var(--bg-primary)] p-3 font-mono text-xs leading-5 text-[var(--text-secondary)] placeholder:text-[var(--text-muted)]"
          />
        </label>

        <div className="mt-4 space-y-3">
          <label className="flex items-start gap-3 rounded-xl border border-[var(--border-soft)] bg-[var(--bg-primary)] p-3 text-xs text-[var(--text-secondary)]">
            <input
              type="checkbox"
              checked={requireTrustedKey}
              onChange={(event) => setRequireTrustedKey(event.target.checked)}
              className="mt-0.5 accent-[var(--accent-green)]"
            />
            Require signer key to be trusted
          </label>
          <label className="flex items-start gap-3 rounded-xl border border-[var(--border-soft)] bg-[var(--bg-primary)] p-3 text-xs text-[var(--text-secondary)]">
            <input
              type="checkbox"
              checked={requireTimestampAnchor}
              onChange={(event) => setRequireTimestampAnchor(event.target.checked)}
              className="mt-0.5 accent-[var(--accent-green)]"
            />
            Require timestamp anchor
          </label>
        </div>
      </aside>
    </div>
  );
}
