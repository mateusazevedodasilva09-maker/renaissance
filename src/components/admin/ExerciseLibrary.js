"use client";

/**
 * Bibliothèque d'exercices :
 * - galerie visuelle (vignettes) avec recherche et filtres (groupe musculaire, matériel) ;
 * - clic sur un exercice → fiche avec GIF animé et instructions ;
 * - ajout manuel toujours possible.
 */
import { useMemo, useState } from "react";
import Icon from "@/components/Icon";

const PAGE_SIZE = 24;

async function api(path, method, body) {
  const res = await fetch(path, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json();
  if (!json.ok) throw new Error(json.error || "Erreur");
  return json.data;
}

export default function ExerciseLibrary({ initialExercises, readOnly = false }) {
  const [exercises, setExercises] = useState(initialExercises);
  const [form, setForm] = useState({ name: "", muscleGroup: "", equipment: "", level: 1 });
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [muscle, setMuscle] = useState("");
  const [equip, setEquip] = useState("");
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [selected, setSelected] = useState(null);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const muscles = useMemo(
    () => [...new Set(exercises.map((e) => e.muscleGroup).filter(Boolean))].sort(),
    [exercises]
  );
  const equipments = useMemo(
    () => [...new Set(exercises.map((e) => e.equipment).filter(Boolean))].sort(),
    [exercises]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return exercises.filter(
      (e) =>
        (!q || e.name.toLowerCase().includes(q) || e.target?.toLowerCase().includes(q)) &&
        (!muscle || e.muscleGroup === muscle) &&
        (!equip || e.equipment === equip)
    );
  }, [exercises, search, muscle, equip]);

  const visible = filtered.slice(0, limit);

  async function add(e) {
    e.preventDefault();
    try {
      const ex = await api("/api/exercises", "POST", form);
      setExercises([...exercises, ex].sort((a, b) => a.name.localeCompare(b.name)));
      setForm({ name: "", muscleGroup: "", equipment: "", level: 1 });
    } catch (err) { console.error(err);
      setError(err.message);
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Bibliothèque d&apos;exercices</h1>
          <div className="subtitle">
            {readOnly
              ? `${exercises.length} exercices en vidéo — cherchez un mouvement pour revoir sa technique.`
              : `${exercises.length} exercices — ils alimentent le moteur de génération de programmes.`}
          </div>
        </div>
      </div>
      {error && <div className="alert alert-error" onClick={() => setError(null)}>{error}</div>}

      {!readOnly && exercises.length < 100 && (
        <div className="alert alert-error">
          La base animée ne semble pas encore importée. Lancez <code>npm run db:exercises</code> dans
          le Terminal pour récupérer les 1 324 exercices avec GIFs.
        </div>
      )}

      {/* Recherche + filtres */}
      <div className="card mb">
        <div className="flex wrap">
          <input
            className="input"
            style={{ flex: 2, minWidth: 180 }}
            placeholder="Rechercher un exercice…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setLimit(PAGE_SIZE); }}
          />
          <select className="input" style={{ flex: 1, minWidth: 150 }} value={muscle} onChange={(e) => { setMuscle(e.target.value); setLimit(PAGE_SIZE); }}>
            <option value="">Tous les groupes musculaires</option>
            {muscles.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
          <select className="input" style={{ flex: 1, minWidth: 150 }} value={equip} onChange={(e) => { setEquip(e.target.value); setLimit(PAGE_SIZE); }}>
            <option value="">Tout le matériel</option>
            {equipments.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div className="muted small mt">{filtered.length} exercice(s) trouvé(s)</div>
      </div>

      {/* Galerie */}
      <div className="grid grid-4 mb">
        {visible.map((e) => (
          <div
            key={e.id}
            className="card"
            style={{ cursor: "pointer", padding: 10 }}
            onClick={() => setSelected(e)}
          >
            {e.imageUrl ? (
              <img
                src={e.imageUrl}
                alt={e.name}
                loading="lazy"
                style={{ width: "100%", aspectRatio: "1", objectFit: "cover", borderRadius: 8, background: "#fff" }}
              />
            ) : (
              <div style={{ width: "100%", aspectRatio: "1", borderRadius: 8, background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Icon name="dumbbell" size={28} style={{ color: "var(--text-dim)" }} />
              </div>
            )}
            <div style={{ fontWeight: 600, marginTop: 8, fontSize: 13 }}>{e.name}</div>
            <div className="muted small">{[e.muscleGroup, e.equipment].filter(Boolean).join(" · ")}</div>
          </div>
        ))}
      </div>
      {visible.length < filtered.length && (
        <div style={{ textAlign: "center" }} className="mb">
          <button className="btn" onClick={() => setLimit(limit + PAGE_SIZE * 2)}>
            Afficher plus ({filtered.length - visible.length} restants)
          </button>
        </div>
      )}

      {/* Ajout manuel */}
      {!readOnly && (
      <div className="card">
        <h3>+ Ajouter un exercice manuellement</h3>
        <form onSubmit={add} className="flex wrap">
          <input className="input" style={{ flex: 2, minWidth: 150 }} placeholder="Nom de l'exercice *" required value={form.name} onChange={set("name")} />
          <input className="input" style={{ flex: 1, minWidth: 120 }} placeholder="Groupe musculaire" value={form.muscleGroup} onChange={set("muscleGroup")} />
          <input className="input" style={{ flex: 1, minWidth: 120 }} placeholder="Matériel" value={form.equipment} onChange={set("equipment")} />
          <select className="input" style={{ width: "auto" }} value={form.level} onChange={set("level")}>
            {[1, 2, 3, 4, 5].map((l) => <option key={l} value={l}>Niveau {l}</option>)}
          </select>
          <button className="btn btn-primary btn-sm">+ Ajouter</button>
        </form>
      </div>
      )}

      {/* Fiche exercice (modal) */}
      {selected && (
        <div className="modal-backdrop" onClick={() => setSelected(null)}>
          <div className="modal" style={{ maxWidth: 520 }} onClick={(e) => e.stopPropagation()}>
            <div className="flex-between mb">
              <h3 style={{ margin: 0 }}>{selected.name}</h3>
              <button className="btn btn-sm" onClick={() => setSelected(null)}><Icon name="x" /></button>
            </div>
            {selected.gifUrl && (
              <img
                src={selected.gifUrl}
                alt={`Animation : ${selected.name}`}
                style={{ width: "100%", borderRadius: 10, background: "#fff" }}
              />
            )}
            <div className="flex wrap mt mb">
              {selected.muscleGroup && <span className="badge"><Icon name="dumbbell" /> {selected.muscleGroup}</span>}
              {selected.target && <span className="badge"><Icon name="target" /> {selected.target}</span>}
              {selected.equipment && <span className="badge"><Icon name="briefcase" /> {selected.equipment}</span>}
            </div>
            {selected.description && (
              <div>
                <div className="stat-label mb">Instructions (en anglais)</div>
                <p className="muted small" style={{ whiteSpace: "pre-wrap", marginBottom: 0 }}>
                  {selected.description}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
