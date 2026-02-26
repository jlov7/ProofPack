'use client';

interface DisclosureToggleProps {
  isPublic: boolean;
  onToggle: () => void;
  hasPackZip: boolean;
}

export function DisclosureToggle({ isPublic, onToggle, hasPackZip }: DisclosureToggleProps) {
  return (
    <div className="p-4 rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] space-y-3">
      <h3 className="text-sm font-medium">Pack Visibility</h3>
      <p className="text-xs text-[var(--text-muted)]">
        ProofPack supports selective disclosure. A private pack contains full event payloads. A
        public pack replaces payloads with cryptographic commitments (SHA-256 hashes), proving
        events occurred without revealing their contents.
      </p>

      <div className="flex items-center gap-4">
        <button
          role="switch"
          aria-checked={isPublic}
          onClick={onToggle}
          disabled={!hasPackZip}
          style={{ width: '2.75rem', height: '1.5rem', display: 'inline-flex' }}
          className={`relative items-center rounded-full transition-colors ${
            isPublic ? 'bg-[var(--accent-green)]' : 'bg-[var(--bg-tertiary)]'
          } ${!hasPackZip ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        >
          <span
            style={{ width: '1rem', height: '1rem' }}
            className={`inline-block rounded-full bg-white transition-transform ${
              isPublic ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
        <div>
          <span
            className={`text-sm font-medium ${isPublic ? 'text-[var(--accent-green)]' : 'text-[var(--text-primary)]'}`}
          >
            {isPublic ? 'Public' : 'Private'}
          </span>
          <p className="text-xs text-[var(--text-muted)]">
            {isPublic
              ? 'Payloads replaced with commitments. Safe to share.'
              : 'Full payloads included. Contains sensitive data.'}
          </p>
        </div>
      </div>
    </div>
  );
}
