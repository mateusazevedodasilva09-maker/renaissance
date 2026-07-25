"use client";

/**
 * Sélecteur d'exercices visuel (pour construire un programme à la main).
 *
 * - Silhouette avant / arrière : on clique un muscle → la liste se filtre sur
 *   ce muscle (re-clic = on retire le filtre). Le mapping est par mots-clés,
 *   donc insensible à la langue des données (chest / pectoraux…).
 * - Résultats en cartes-images, regroupés par groupe musculaire.
 * - Recherche simple + filtre du genre du modèle (déduit du suffixe " (male)"
 *   / " (female)" présent dans les noms du jeu de données).
 *
 * Aucune donnée sensible ; purement une aide au choix. Rendu en fenêtre modale.
 */
import { useMemo, useState } from "react";
import Icon from "@/components/Icon";
import ExerciseThumb from "@/components/ExerciseThumb";

// Zones cliquables → mots-clés cherchés dans muscleGroup / target / bodyPart.
// Bilingue (fr/en) pour coller au jeu de données importé comme aux exercices
// saisis à la main.
const ZONES = {
  epaules: { label: "Épaules", kw: ["shoulder", "delt", "épaul", "epaul"] },
  pectoraux: { label: "Pectoraux", kw: ["chest", "pector", "pec"] },
  biceps: { label: "Biceps", kw: ["bicep"] },
  avantbras: { label: "Avant-bras", kw: ["forearm", "lower arm", "avant-bras"] },
  abdos: { label: "Abdos", kw: ["abs", "waist", "core", "abdo", "oblique"] },
  quadriceps: { label: "Quadriceps", kw: ["quad", "upper leg", "cuisse", "thigh"] },
  dos: { label: "Dos", kw: ["back", "lat", "dos", "trapez", "trap", "spine"] },
  triceps: { label: "Triceps", kw: ["tricep"] },
  fessiers: { label: "Fessiers", kw: ["glute", "fessier", "buttock"] },
  ischios: { label: "Ischios", kw: ["hamstring", "ischio"] },
  mollets: { label: "Mollets", kw: ["calf", "calve", "lower leg", "mollet"] },
};

// Un exercice appartient à une zone si l'un de ses champs muscle contient un
// des mots-clés de la zone.
function matchesZone(ex, zoneKey) {
  const kws = ZONES[zoneKey]?.kw || [];
  const hay = `${ex.muscleGroup || ""} ${ex.target || ""} ${ex.bodyPart || ""}`.toLowerCase();
  return kws.some((k) => hay.includes(k));
}

const GENDER = { all: "Tous", male: "Homme", female: "Femme" };

export default function ExercisePicker({ exercises = [], onPick, onClose, title = "Choisir un exercice" }) {
  const [zone, setZone] = useState(null);
  const [search, setSearch] = useState("");
  const [gender, setGender] = useState("all");

  const results = useMemo(() => {
    const q = search.trim().toLowerCase();
    return exercises.filter((ex) => {
      if (zone && !matchesZone(ex, zone)) return false;
      const name = (ex.name || "").toLowerCase();
      if (gender === "male" && name.includes("(female)")) return false;
      if (gender === "female" && name.includes("(male)")) return false;
      if (q && !name.includes(q) && !(ex.target || "").toLowerCase().includes(q) && !(ex.muscleGroup || "").toLowerCase().includes(q)) return false;
      return true;
    });
  }, [exercises, zone, search, gender]);

  // Regroupement par groupe musculaire pour un affichage clair.
  const grouped = useMemo(() => {
    const map = new Map();
    for (const ex of results) {
      const g = ex.muscleGroup || ex.bodyPart || "Autres";
      if (!map.has(g)) map.set(g, []);
      map.get(g).push(ex);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [results]);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 900, width: "94vw", maxHeight: "92vh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
        <div className="flex-between mb">
          <h3 style={{ margin: 0 }}>{title}</h3>
          <button className="btn btn-sm" onClick={onClose}><Icon name="x" /></button>
        </div>

        <div className="grid grid-2" style={{ gap: 16, alignItems: "start" }}>
          {/* Colonne gauche : silhouette + genre. */}
          <div>
            <div className="section-label" style={{ marginTop: 0 }}>Genre du modèle</div>
            <div className="flex mb" style={{ gap: 6 }}>
              {Object.entries(GENDER).map(([k, l]) => (
                <button key={k} type="button" className={`btn btn-sm${gender === k ? " btn-primary" : ""}`} onClick={() => setGender(k)}>{l}</button>
              ))}
            </div>
            <div className="section-label">Muscles ciblés — cliquez pour filtrer</div>
            <BodyMap selected={zone} onSelect={(z) => setZone(zone === z ? null : z)} />
            <div className="muted small" style={{ textAlign: "center", marginTop: 6 }}>
              {zone ? <>Filtre : <strong>{ZONES[zone].label}</strong> · re-cliquez pour retirer</> : "Aucun muscle sélectionné — tout est affiché"}
            </div>
          </div>

          {/* Colonne droite : recherche + résultats groupés. */}
          <div>
            <input
              className="input mb"
              placeholder="Rechercher un exercice…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: "100%" }}
            />
            <div className="muted small mb">{results.length} exercice(s)</div>
            <div style={{ maxHeight: "62vh", overflowY: "auto", paddingRight: 4 }}>
              {grouped.length === 0 && <p className="muted">Aucun exercice pour ce filtre.</p>}
              {grouped.map(([group, list]) => (
                <div key={group} className="mb">
                  <div className="section-label" style={{ marginTop: 0 }}>{group} · {list.length}</div>
                  <div className="grid grid-3" style={{ gap: 8 }}>
                    {list.slice(0, 60).map((ex) => (
                      <button
                        key={ex.id}
                        type="button"
                        className="card"
                        style={{ padding: 8, textAlign: "left", cursor: "pointer" }}
                        onClick={() => onPick(ex.id)}
                        title={`Ajouter : ${ex.name}`}
                      >
                        <ExerciseThumb exercise={ex} size={72} />
                        <div style={{ fontWeight: 600, fontSize: 12.5, marginTop: 6, lineHeight: 1.2 }}>{ex.name}</div>
                        <div className="muted small">{[ex.muscleGroup, ex.equipment].filter(Boolean).join(" · ")}</div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* --- Silhouette avant / arrière avec zones cliquables ------------------------------- */

/**
 * Silhouette stylisée (avant + arrière). Chaque muscle est une forme cliquable
 * surlignée à la sélection. Volontairement simple et lisible plutôt que
 * hyper-anatomique : l'objectif est de cliquer vite le bon groupe.
 */
function BodyMap({ selected, onSelect }) {
  const fill = (z) => (selected === z ? "var(--accent)" : "var(--text-dim)");
  const op = (z) => (selected === z ? 0.9 : 0.35);
  const zoneProps = (z) => ({
    fill: fill(z),
    fillOpacity: op(z),
    stroke: "var(--bg)",
    strokeWidth: 0.6,
    style: { cursor: "pointer" },
    onClick: () => onSelect(z),
  });

  return (
    <div className="flex" style={{ gap: 8, justifyContent: "center" }}>
      {/* FACE AVANT */}
      <svg viewBox="0 0 100 220" width="48%" style={{ maxWidth: 170 }} role="img" aria-label="Face avant">
        <text x="50" y="10" textAnchor="middle" fontSize="7" fill="var(--text-dim)">FACE AVANT</text>
        {/* tête + contour neutre */}
        <circle cx="50" cy="24" r="9" fill="var(--text-dim)" fillOpacity="0.25" />
        {/* épaules */}
        <ellipse cx="34" cy="42" rx="9" ry="6" {...zoneProps("epaules")} />
        <ellipse cx="66" cy="42" rx="9" ry="6" {...zoneProps("epaules")} />
        {/* pectoraux */}
        <rect x="38" y="44" width="24" height="16" rx="6" {...zoneProps("pectoraux")} />
        {/* abdos */}
        <rect x="41" y="62" width="18" height="24" rx="4" {...zoneProps("abdos")} />
        {/* biceps */}
        <rect x="24" y="48" width="8" height="22" rx="4" {...zoneProps("biceps")} />
        <rect x="68" y="48" width="8" height="22" rx="4" {...zoneProps("biceps")} />
        {/* avant-bras */}
        <rect x="22" y="72" width="7" height="22" rx="3.5" {...zoneProps("avantbras")} />
        <rect x="71" y="72" width="7" height="22" rx="3.5" {...zoneProps("avantbras")} />
        {/* quadriceps */}
        <rect x="38" y="92" width="10" height="46" rx="5" {...zoneProps("quadriceps")} />
        <rect x="52" y="92" width="10" height="46" rx="5" {...zoneProps("quadriceps")} />
        {/* mollets (avant = tibia, on garde la zone mollets) */}
        <rect x="39" y="142" width="8" height="40" rx="4" {...zoneProps("mollets")} />
        <rect x="53" y="142" width="8" height="40" rx="4" {...zoneProps("mollets")} />
      </svg>

      {/* FACE ARRIÈRE */}
      <svg viewBox="0 0 100 220" width="48%" style={{ maxWidth: 170 }} role="img" aria-label="Face arrière">
        <text x="50" y="10" textAnchor="middle" fontSize="7" fill="var(--text-dim)">FACE ARRIÈRE</text>
        <circle cx="50" cy="24" r="9" fill="var(--text-dim)" fillOpacity="0.25" />
        {/* épaules arrière */}
        <ellipse cx="34" cy="42" rx="9" ry="6" {...zoneProps("epaules")} />
        <ellipse cx="66" cy="42" rx="9" ry="6" {...zoneProps("epaules")} />
        {/* dos (trapèzes + grand dorsal) */}
        <rect x="38" y="44" width="24" height="30" rx="6" {...zoneProps("dos")} />
        {/* triceps */}
        <rect x="24" y="48" width="8" height="22" rx="4" {...zoneProps("triceps")} />
        <rect x="68" y="48" width="8" height="22" rx="4" {...zoneProps("triceps")} />
        {/* avant-bras arrière */}
        <rect x="22" y="72" width="7" height="22" rx="3.5" {...zoneProps("avantbras")} />
        <rect x="71" y="72" width="7" height="22" rx="3.5" {...zoneProps("avantbras")} />
        {/* fessiers */}
        <rect x="40" y="76" width="20" height="14" rx="6" {...zoneProps("fessiers")} />
        {/* ischios */}
        <rect x="38" y="92" width="10" height="46" rx="5" {...zoneProps("ischios")} />
        <rect x="52" y="92" width="10" height="46" rx="5" {...zoneProps("ischios")} />
        {/* mollets */}
        <rect x="39" y="142" width="8" height="40" rx="4" {...zoneProps("mollets")} />
        <rect x="53" y="142" width="8" height="40" rx="4" {...zoneProps("mollets")} />
      </svg>
    </div>
  );
}
