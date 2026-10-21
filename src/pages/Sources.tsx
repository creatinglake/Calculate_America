/** /sources: rendered from public/data/manifest.json (plan 3.6). */
import { useFile } from '../app/useFile';

export function Sources() {
  const { data, error } = useFile('manifest');
  return (
    <>
      <div className="intro">
        <p className="eyebrow">Sources</p>
        <h1>Where every number comes from</h1>
        <p className="dek">
          Every figure on this site is computed from the files below. The data pipeline downloads them, checks them, and
          records exactly which version was used. Its code and a log of every check are in the project's repository.
        </p>
      </div>
      {error && <p role="alert" className="alert">Couldn't load the source list: {error}</p>}
      <div className="stack">
        {data?.sources.map((s) => (
          <section key={s.id} className="card" aria-labelledby={`src-${s.id}`}>
            <h2 id={`src-${s.id}`} className="card-title"><a href={s.url}>{s.title}</a></h2>
            <p className="sub"><strong>Used for:</strong> {s.used_for}</p>
            <p className="sub"><strong>Cite as:</strong> {s.citation}</p>
            <p className="sub"><strong>License:</strong> {s.license}</p>
            {s.files.length > 0 && (
              <details style={{ marginTop: '0.75rem' }}>
                <summary className="table-toggle" style={{ display: 'inline' }}>Files used ({s.files.length})</summary>
                <div className="table-scroll" style={{ marginTop: '0.5rem' }}>
                  <table className="data-table">
                    <thead><tr><th scope="col">File</th><th scope="col">Retrieved</th><th scope="col">Published</th><th scope="col">SHA-256</th></tr></thead>
                    <tbody>
                      {s.files.map((f) => (
                        <tr key={f.file}>
                          <th scope="row"><a href={f.url}>{f.file}</a></th>
                          <td>{f.retrieved}</td>
                          <td>{f.last_modified && !f.last_modified.startsWith('Thu, 01 Jan 1970') ? new Date(f.last_modified).toISOString().slice(0, 10) : '–'}</td>
                          <td><code title={f.sha256}>{f.sha256.slice(0, 12)}…</code></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            )}
          </section>
        ))}
        <section className="card">
          <h2 className="card-title">Reusing this site's data</h2>
          <p className="sub">
            The World Inequality Database marks its data CC BY-NC-SA 4.0 (attribution, non-commercial, share-alike).
            The data files this site builds from it carry the same license. The site's code is GPL-3.0.
          </p>
        </section>
      </div>
    </>
  );
}
