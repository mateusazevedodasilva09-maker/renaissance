/**
 * Logo Essência — symbole « arbre » (soleil terracotta + canopée + tronc).
 *
 * La canopée et le tronc utilisent `currentColor` : le symbole s'adapte donc
 * à la couleur du texte de son conteneur (crème sur badge sombre, encre sur
 * fond clair…). Le soleil suit l'accent terracotta du thème.
 *
 * - <Logo />            symbole seul, dimension `size` (défaut 22px).
 * - variant="badge"     symbole cadré pour la pastille `.brand-badge`.
 */
export default function Logo({ size = 27, className, style }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      role="img"
      aria-label="Essência"
      style={style}
    >
      {/* Soleil (derrière la canopée) */}
      <circle cx="41" cy="18" r="9" fill="var(--accent)" />
      {/* Canopée — nuage composé de lobes, bord bas à 3 bosses */}
      <g fill="currentColor">
        <circle cx="32" cy="24" r="12" />
        <circle cx="20" cy="34" r="12" />
        <circle cx="44" cy="34" r="12" />
        <circle cx="32" cy="37" r="11" />
        {/* Tronc */}
        <rect x="28.6" y="44" width="6.8" height="16" rx="3.4" />
      </g>
    </svg>
  );
}
