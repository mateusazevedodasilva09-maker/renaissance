/** Squelette de chargement de l'espace client. */
export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Chargement…">
      <div className="skeleton-line" style={{ width: 260, height: 30, marginBottom: 24 }} />
      <div className="skeleton-block" style={{ height: 110, marginBottom: 16 }} />
      <div className="skeleton-block" style={{ height: 300 }} />
    </div>
  );
}
