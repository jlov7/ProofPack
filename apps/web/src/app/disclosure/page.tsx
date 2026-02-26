'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { usePackStore } from '@/lib/store';
import { DisclosureToggle } from '@/components/disclosure/DisclosureToggle';
import { OpeningsFlow } from '@/components/disclosure/OpeningsFlow';

export default function DisclosurePage() {
  const router = useRouter();
  const report = usePackStore((s) => s.report);
  const packZip = usePackStore((s) => s.packZip);

  const [isPublic, setIsPublic] = useState(false);

  if (!report || !report.ok) {
    return (
      <div className="flex flex-col items-center justify-center min-h-full p-8">
        <p className="text-[var(--text-muted)] mb-4">No pack loaded yet.</p>
        <button
          onClick={() => router.push('/verify')}
          className="text-sm text-[var(--accent-green)] hover:underline"
        >
          Go to Verify
        </button>
      </div>
    );
  }

  const disclosureCheck = report.checks.find((c) => c.name === 'disclosure.openings');

  return (
    <div className="max-w-3xl mx-auto p-8 space-y-6">
      <div>
        <h2 className="text-lg font-bold">Selective Disclosure</h2>
        <p className="text-xs text-[var(--text-muted)] mt-1">
          Create redacted packs and manage disclosure of event payloads
        </p>
      </div>

      <div className="p-4 rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] flex items-center gap-3">
        {disclosureCheck?.ok ? (
          <span className="text-xs text-emerald-400">&#10003; Disclosure openings valid</span>
        ) : disclosureCheck?.error ? (
          <span className="text-xs text-red-400">&#10007; {disclosureCheck.error}</span>
        ) : (
          <span className="text-xs text-[var(--text-muted)]">
            &#8212; No openings in this pack (private pack)
          </span>
        )}
      </div>

      <DisclosureToggle
        isPublic={isPublic}
        onToggle={() => setIsPublic(!isPublic)}
        hasPackZip={!!packZip}
      />

      {isPublic && <OpeningsFlow />}

      <div className="p-4 rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] space-y-2">
        <h3 className="text-sm font-medium">How Disclosure Works</h3>
        <div className="space-y-2 text-xs text-[var(--text-muted)]">
          <p>
            <strong className="text-[var(--text-secondary)]">1. Commitment:</strong> Each event
            payload is hashed with a random salt:{' '}
            <code className="font-mono text-[var(--accent-green)]">
              SHA-256(canonical(payload) || salt)
            </code>
          </p>
          <p>
            <strong className="text-[var(--text-secondary)]">2. Redaction:</strong> The public pack
            replaces payloads with their commitment hashes. The Merkle tree remains valid.
          </p>
          <p>
            <strong className="text-[var(--text-secondary)]">3. Opening:</strong> To reveal a
            specific event, share its payload and salt. Anyone can verify:{' '}
            <code className="font-mono text-[var(--accent-green)]">
              hash(payload || salt) === commitment
            </code>
          </p>
        </div>
      </div>
    </div>
  );
}
