/** Squelette de chargement (affiché instantanément pendant la navigation). */
export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Chargement…">
      <div className="skeleton-line" style={{ width: 240, height: 30, marginBottom: 24 }} />
      <div className="grid grid-4" style={{ marginBottom: 16 }}>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="skeleton-block" style={{ height: 92 }} />
        ))}
      </div>
      <div className="grid grid-2">
        <div className="skeleton-block" style={{ height: 260 }} />
        <div className="skeleton-block" style={{ height: 260 }} />
      </div>
    </div>
  );
}
