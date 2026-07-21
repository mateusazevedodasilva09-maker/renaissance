"use client";

/**
 * Graphique en ligne léger (SVG pur, sans dépendance).
 * props :
 *   - points : [{ label, value, pr }] — pr: true affiche une étoile (record personnel)
 *   - color  : couleur de la courbe
 *   - unit   : suffixe affiché (ex. "kg")
 *   - target : valeur cible optionnelle (ex. poids objectif) — INCLUSE dans le
 *              calcul de l'échelle (l'axe s'adapte à l'objectif) et tracée en
 *              ligne de repère verte avec son libellé.
 *
 * Au survol, une infobulle suit le point le plus proche du curseur et affiche
 * sa valeur exacte en ordonnée, avec un repère vertical.
 */
import { useRef, useState } from "react";

export default function LineChart({ points = [], color = "var(--accent)", unit = "", height = 190, target = null, targetLabel = "Objectif" }) {
  const svgRef = useRef(null);
  const [hover, setHover] = useState(null);

  const data = points.filter((p) => p.value !== null && p.value !== undefined);
  if (data.length === 0) {
    return <p className="muted small">Pas encore de données à afficher.</p>;
  }

  const w = 560;
  const h = height;
  // Marges séparées : une gouttière gauche large réservée aux libellés de
  // l'axe Y, pour qu'ils ne chevauchent jamais la courbe.
  const padL = 46;
  const padR = 14;
  const padT = 16;
  const padB = 26;

  const values = data.map((p) => Number(p.value));
  // La cible entre dans le calcul de l'échelle : l'axe Y « s'adapte » à
  // l'objectif chiffré même s'il sort de la plage des points mesurés.
  const hasTarget = target !== null && target !== undefined && !Number.isNaN(Number(target));
  const scaleValues = hasTarget ? [...values, Number(target)] : values;
  const min = Math.min(...scaleValues);
  const max = Math.max(...scaleValues);
  const range = max - min || 1;

  const x = (i) => padL + (i * (w - padL - padR)) / Math.max(data.length - 1, 1);
  const y = (v) => h - padB - ((v - min) / range) * (h - padT - padB);

  const path = data.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(" ");
  // Aire de remplissage sous la courbe (voile léger de la couleur).
  const baseline = h - padB;
  const area =
    `M${x(0).toFixed(1)},${baseline} ` +
    data.map((p, i) => `L${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(" ") +
    ` L${x(data.length - 1).toFixed(1)},${baseline} Z`;
  const fmt = (v) => `${Math.round(v * 100) / 100}${unit}`;

  // Convertit la position du curseur en index du point le plus proche.
  function onMove(e) {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const px = ((e.clientX - rect.left) / rect.width) * w;
    let best = 0;
    let bestD = Infinity;
    for (let i = 0; i < data.length; i++) {
      const d = Math.abs(x(i) - px);
      if (d < bestD) { bestD = d; best = i; }
    }
    setHover(best);
  }

  // Positionnement de l'infobulle : au-dessus du point, recadrée dans le cadre.
  let tip = null;
  if (hover !== null && data[hover]) {
    const p = data[hover];
    const label = `${p.label} · ${fmt(p.value)}`;
    const boxW = Math.max(52, label.length * 6.2 + 14);
    const boxH = 22;
    let bx = x(hover) - boxW / 2;
    bx = Math.max(2, Math.min(bx, w - boxW - 2));
    let by = y(p.value) - boxH - 10;
    if (by < 2) by = y(p.value) + 12; // si trop haut, on passe sous le point
    tip = { p, label, boxW, boxH, bx, by };
  }

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${w} ${h}`}
      style={{ width: "100%", height: "auto" }}
      role="img"
      onMouseMove={onMove}
      onMouseLeave={() => setHover(null)}
    >
      {/* lignes de repère + libellés de l'axe Y (dans la gouttière gauche) */}
      {[min, (min + max) / 2, max].map((v, i) => (
        <g key={i}>
          <line x1={padL} x2={w - padR} y1={y(v)} y2={y(v)} stroke="var(--border)" strokeDasharray="4 4" />
          <text x={padL - 8} y={y(v) + 3.5} fill="var(--text-dim)" fontSize="10" textAnchor="end">
            {Math.round(v * 10) / 10}{unit}
          </text>
        </g>
      ))}

      {/* Ligne de repère de l'objectif chiffré (ex. poids cible). */}
      {hasTarget && (
        <g style={{ pointerEvents: "none" }}>
          <line x1={padL} x2={w - padR} y1={y(Number(target))} y2={y(Number(target))} stroke="var(--green)" strokeWidth="1.5" strokeDasharray="6 3" />
          <text x={w - padR} y={y(Number(target)) - 4} fill="var(--green)" fontSize="10" textAnchor="end">
            {targetLabel} {Math.round(Number(target) * 10) / 10}{unit}
          </text>
        </g>
      )}

      <path d={area} fill={color} fillOpacity="0.07" stroke="none" />
      <path d={path} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

      {data.map((p, i) => (
        <g key={i}>
          <circle cx={x(i)} cy={y(p.value)} r={hover === i ? 5.5 : 4} fill={color} />
          {p.pr && (
            <text x={x(i)} y={y(p.value) - 9} fontSize="13" textAnchor="middle" role="img" aria-label="Record personnel">
              ★
            </text>
          )}
          <text x={x(i)} y={h - 8} fill="var(--text-dim)" fontSize="10" textAnchor="middle">
            {p.label}
          </text>
        </g>
      ))}

      {/* Repère vertical + infobulle au survol */}
      {tip && (
        <g style={{ pointerEvents: "none" }}>
          <line x1={x(hover)} x2={x(hover)} y1={padT} y2={h - padB} stroke={color} strokeOpacity="0.35" strokeDasharray="3 3" />
          <circle cx={x(hover)} cy={y(tip.p.value)} r="6" fill="none" stroke={color} strokeWidth="2" />
          <rect x={tip.bx} y={tip.by} width={tip.boxW} height={tip.boxH} rx="6"
            fill="var(--bg)" stroke="var(--border)" />
          <text x={tip.bx + tip.boxW / 2} y={tip.by + 15} fill="var(--text)" fontSize="11" fontWeight="600" textAnchor="middle">
            {tip.label}
          </text>
        </g>
      )}
    </svg>
  );
}
