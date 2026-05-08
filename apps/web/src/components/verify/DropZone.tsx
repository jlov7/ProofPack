'use client';

import { useCallback, useState, useRef } from 'react';

interface DropZoneProps {
  onFile: (file: File) => void;
  loading?: boolean;
}

export function DropZone({ onFile, loading }: DropZoneProps) {
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);
      const file = e.dataTransfer.files[0];
      if (file) onFile(file);
    },
    [onFile],
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) onFile(file);
    },
    [onFile],
  );

  return (
    <div
      className={`focus-ring relative cursor-pointer rounded-2xl border border-dashed p-8 text-center transition-all duration-200 md:p-12 ${
        dragActive
          ? 'border-[var(--accent-green)] bg-[var(--accent-green)]/10'
          : 'border-[var(--border)] bg-[var(--bg-primary)]/78 hover:border-[var(--accent-blue)] hover:bg-[var(--bg-primary)]'
      } ${loading ? 'pointer-events-none opacity-60' : ''}`}
      tabIndex={0}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
    >
      <input ref={inputRef} type="file" accept=".zip" onChange={handleChange} className="hidden" />

      {loading ? (
        <div className="flex flex-col items-center gap-3">
          <div className="h-9 w-9 rounded-full border-2 border-[var(--accent-green)] border-t-transparent animate-spin" />
          <p className="text-sm text-[var(--text-secondary)]">Verifying pack...</p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3">
          <svg
            className="h-12 w-12 text-[var(--accent-green)]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
          <div>
            <p className="text-base font-medium text-[var(--text-primary)]">
              Drop a <code className="text-[var(--accent-green)]">.proofpack.zip</code>
            </p>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              or click to browse. Upload stays local to this server process.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
