/** Shared chart wrapper: title, one-line description, and a data table toggle. */
import { useId, useState, type ReactNode } from 'react';

export function ChartFrame({ title, description, table, children }: {
  title: string;
  description: string;
  table: ReactNode;
  children: ReactNode;
}) {
  const id = useId();
  const [showTable, setShowTable] = useState(false);
  return (
    <figure aria-labelledby={`${id}-t`} className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-4">
      <figcaption>
        <h2 id={`${id}-t`} className="text-base font-semibold">{title}</h2>
        <p className="text-sm text-[var(--text-muted)]">{description}</p>
      </figcaption>
      <div className="mt-3">{children}</div>
      <button
        type="button" aria-expanded={showTable} aria-controls={`${id}-table`}
        onClick={() => setShowTable((v) => !v)}
        className="mt-3 text-sm underline"
      >
        {showTable ? 'Hide the data table' : 'Show the data table'}
      </button>
      {showTable && (
        <div id={`${id}-table`} className="mt-2 overflow-x-auto rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface-2)] p-2">
          {table}
        </div>
      )}
    </figure>
  );
}
