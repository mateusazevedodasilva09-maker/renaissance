/** Squelette de chargement de l'espace coach. */
export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Chargement…">
      <div className="skeleton-line" style={{ width: 220, height: 30, marginBottom: 24 }} />
      <div className="skeleton-block" style={{ height: 140, marginBottom: 16 }} />
      <div className="grid grid-2">
        <div className="skeleton-block" style={{ height: 180 }} />
        <div className="skeleton-block" style={{ height: 180 }} />
      </div>
    </div>
  );
}
