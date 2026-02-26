'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Command } from 'cmdk';
import { usePackStore } from '@/lib/store';

const pages = [
  { value: 'verify', label: 'Go to Verify', shortcut: 'v' },
  { value: 'report', label: 'Go to Report', shortcut: 'r' },
  { value: 'timeline', label: 'Go to Timeline', shortcut: 't' },
  { value: 'proofs', label: 'Go to Proofs', shortcut: 'p' },
  { value: 'policy', label: 'Go to Policy', shortcut: 'o' },
  { value: 'disclosure', label: 'Go to Disclosure', shortcut: 'd' },
  { value: 'export', label: 'Go to Export', shortcut: 'e' },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const report = usePackStore((s) => s.report);

  const handleSelect = useCallback(
    (value: string) => {
      setOpen(false);
      router.push(`/${value}`);
    },
    [router],
  );

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === '/' && !e.metaKey && !e.ctrlKey) {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA') return;
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === 'Escape') {
        setOpen(false);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  // Navigation keyboard shortcuts (single key)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (open) return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      const page = pages.find((p) => p.shortcut === e.key);
      if (page) {
        if (page.value !== 'verify' && !report) return;
        router.push(`/${page.value}`);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, report, router]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]">
      <div className="fixed inset-0 bg-black/60" onClick={() => setOpen(false)} />
      <Command
        className="relative w-full max-w-lg bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg shadow-2xl overflow-hidden"
        label="Command palette"
      >
        <Command.Input
          placeholder="Type a command..."
          className="w-full px-4 py-3 bg-transparent text-[var(--text-primary)] text-sm border-b border-[var(--border)] outline-none placeholder:text-[var(--text-muted)]"
          autoFocus
        />
        <Command.List className="max-h-64 overflow-y-auto p-2">
          <Command.Empty className="py-4 text-center text-sm text-[var(--text-muted)]">
            No results found.
          </Command.Empty>
          <Command.Group
            heading="Navigation"
            className="text-xs text-[var(--text-muted)] px-2 py-1"
          >
            {pages.map((page) => {
              const disabled = page.value !== 'verify' && !report;
              return (
                <Command.Item
                  key={page.value}
                  value={page.label}
                  onSelect={() => !disabled && handleSelect(page.value)}
                  disabled={disabled}
                  className="flex items-center justify-between px-3 py-2 text-sm rounded cursor-pointer data-[selected=true]:bg-[var(--accent-green)]/10 data-[selected=true]:text-[var(--accent-green)] text-[var(--text-secondary)] data-[disabled=true]:opacity-40 data-[disabled=true]:cursor-not-allowed"
                >
                  <span>{page.label}</span>
                  <kbd className="font-mono text-[10px] bg-[var(--bg-tertiary)] px-1.5 py-0.5 rounded">
                    {page.shortcut}
                  </kbd>
                </Command.Item>
              );
            })}
          </Command.Group>
        </Command.List>
      </Command>
    </div>
  );
}
