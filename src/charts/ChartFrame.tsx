/** Shared chart card: title, one-line description, and a data table toggle. */
import { useId, useState, type ReactNode } from 'react';

export function ChartFrame({ title, description, table, children, tools }: {
  title: string;
  description: string;
  table: ReactNode;
  children: ReactNode;
  tools?: ReactNode;
}) {
  const id = useId();
  const [showTable, setShowTable] = useState(false);
  return (
    <figure aria-labelledby={`${id}-t`} className="card">
      <figcaption>
        <h2 id={`${id}-t`} className="card-title">{title}</h2>
        <p className="sub">{description}</p>
      </figcaption>
      {tools && <div className="chart-tools">{tools}</div>}
      <div className="mt-3">{children}</div>
      <button type="button" className="table-toggle" aria-expanded={showTable} aria-controls={`${id}-table`} onClick={() => setShowTable((v) => !v)}>
        {showTable ? 'Hide the data table' : 'Show the data table'}
      </button>
      {showTable && (
        <div id={`${id}-table`} className="table-well">
          <div className="table-scroll">{table}</div>
        </div>
      )}
    </figure>
  );
}
