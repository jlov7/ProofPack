'use client';

const styles: Record<string, string> = {
  allow: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  deny: 'bg-red-500/15 text-red-400 border-red-500/30',
  hold: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  default: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
};

export function Badge({ label, variant }: { label: string; variant?: string }) {
  const cls = styles[variant ?? 'default'] ?? styles.default;
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-xs font-medium border rounded ${cls}`}
    >
      {label}
    </span>
  );
}
