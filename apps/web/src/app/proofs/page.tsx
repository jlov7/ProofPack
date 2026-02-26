'use client';

import { useRouter } from 'next/navigation';
import { usePackStore } from '@/lib/store';
import { SignatureDetail } from '@/components/proofs/SignatureDetail';
import { MerkleViz } from '@/components/proofs/MerkleViz';

export default function ProofsPage() {
  const router = useRouter();
  const report = usePackStore((s) => s.report);

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

  const merkleCheck = report.checks.find((c) => c.name === 'merkle.root');
  const inclusionCheck = report.checks.find((c) => c.name === 'merkle.inclusion_all');

  return (
    <div className="max-w-3xl mx-auto p-8 space-y-6">
      <div>
        <h2 className="text-lg font-bold">Cryptographic Proofs</h2>
        <p className="text-xs text-[var(--text-muted)] mt-1">
          Signature verification and Merkle tree inclusion proofs
        </p>
      </div>

      <SignatureDetail report={report} />

      <div className="p-4 rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] space-y-2">
        <h3 className="text-sm font-medium">Merkle Root</h3>
        <div className="flex items-center gap-2">
          {merkleCheck?.ok ? (
            <span className="text-xs text-emerald-400">&#10003; Root matches</span>
          ) : (
            <span className="text-xs text-red-400">&#10007; Root mismatch</span>
          )}
          <span className="text-xs text-[var(--text-muted)]">
            {(merkleCheck?.details?.tree_size as number | undefined) ??
              report.events_preview.length}{' '}
            events
          </span>
        </div>
        <div className="flex items-center gap-2">
          {inclusionCheck?.ok ? (
            <span className="text-xs text-emerald-400">
              &#10003; All {(inclusionCheck.details?.verified_events as number | undefined) ?? ''}{' '}
              inclusion proofs valid
            </span>
          ) : (
            <span className="text-xs text-red-400">&#10007; Inclusion proof failure</span>
          )}
        </div>
      </div>

      <MerkleViz events={report.events_preview} />
    </div>
  );
}
