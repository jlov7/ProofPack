'use client';

interface TimelineFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  typeFilter: string | null;
  onTypeFilterChange: (value: string | null) => void;
  decisionFilter: string | null;
  onDecisionFilterChange: (value: string | null) => void;
  eventTypes: string[];
}

export function TimelineFilters({
  search,
  onSearchChange,
  typeFilter,
  onTypeFilterChange,
  decisionFilter,
  onDecisionFilterChange,
  eventTypes,
}: TimelineFiltersProps) {
  return (
    <div className="flex items-center gap-3 p-3 border-b border-[var(--border)] bg-[var(--bg-secondary)]">
      <input
        type="text"
        placeholder="Search events..."
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        className="flex-1 px-3 py-1.5 text-sm bg-[var(--bg-tertiary)] border border-[var(--border)] rounded text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none focus:border-[var(--accent-green)]/50"
      />
      <select
        value={typeFilter ?? ''}
        onChange={(e) => onTypeFilterChange(e.target.value || null)}
        className="px-2 py-1.5 text-xs bg-[var(--bg-tertiary)] border border-[var(--border)] rounded text-[var(--text-secondary)] outline-none"
      >
        <option value="">All types</option>
        {eventTypes.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>
      <select
        value={decisionFilter ?? ''}
        onChange={(e) => onDecisionFilterChange(e.target.value || null)}
        className="px-2 py-1.5 text-xs bg-[var(--bg-tertiary)] border border-[var(--border)] rounded text-[var(--text-secondary)] outline-none"
      >
        <option value="">All decisions</option>
        <option value="allow">allow</option>
        <option value="deny">deny</option>
        <option value="hold">hold</option>
      </select>
    </div>
  );
}
