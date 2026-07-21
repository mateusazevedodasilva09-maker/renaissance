"use client";

/**
 * Configuration du mapping « jour → thématique de séance » et des objectifs.
 * Tout est modifiable sans toucher au code : types, créneaux, objectifs.
 *
 * Chaque thématique porte aussi son CONTENU TYPE : les exercices choisis dans
 * la bibliothèque (avec séries/répétitions/repos). Ce contenu est édité dans
 * la fenêtre TypeExercisesModal ci-dessous, qui s'ouvre automatiquement à la
 * création d'une thématique, et reste accessible via le bouton « Exercices »
 * de chaque ligne. Il est ensuite visible au clic sur une séance, côté coach
 * (agenda) comme côté client (espace), via le composant SessionSlotCard.
 */
import { useEffect, useState } from "react";
import Icon from "@/components/Icon";
import SessionSlotCard from "@/components/SessionSlotCard";

const WEEKDAYS = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];
const DAY_LABELS = {
  MONDAY: "Lundi", TUESDAY: "Mardi", WEDNESDAY: "Mercredi", THURSDAY: "Jeudi",
  FRIDAY: "Vendredi", SATURDAY: "Samedi", SUNDAY: "Dimanche",
};

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

export default function ScheduleConfig({ initialTypes, initialSlots, initialGoals, groups = [] }) {
  const [types, setTypes] = useState(initialTypes);
  const [slots, setSlots] = useState(initialSlots);
  const [goals, setGoals] = useState(initialGoals);
  const [error, setError] = useState(null);

  // Groupe(s) qui s'entraînent sur un créneau : ceux dont l'objectif figure
  // parmi les objectifs de la séance (une séance sans objectif est ouverte à
  // tous). Permet de savoir, au coup d'œil, quel groupe s'entraîne quand.
  function groupsForSlot(slot) {
    const goalIds = new Set((slot.sessionType?.goalLinks || []).map((l) => l.goalId));
    if (goalIds.size === 0) return groups;
    return groups.filter((g) => g.goalId && goalIds.has(g.goalId));
  }

  async function removeGoal(g) {
    if (!window.confirm(`Supprimer l'objectif « ${g.label} » ?`)) return;
    try {
      await api(`/api/goals/${g.id}`, "DELETE");
      setGoals(goals.filter((x) => x.id !== g.id));
    } catch (err) { setError(err.message); }
  }

  // Thématique dont on est en train d'éditer le contenu type (exercices).
  const [editingExercises, setEditingExercises] = useState(null);

  // Formulaires
  const [typeForm, setTypeForm] = useState({ name: "", color: "#e05d38", description: "" });
  const [slotForm, setSlotForm] = useState({ weekday: "MONDAY", startTime: "18:30", endTime: "19:30", sessionTypeId: "" });
  const [goalLabel, setGoalLabel] = useState("");

  async function addType(e) {
    e.preventDefault();
    try {
      const t = await api("/api/session-types", "POST", typeForm);
      setTypes([...types, t]);
      setTypeForm({ name: "", color: "#e05d38", description: "" });
      // On enchaîne directement sur le choix des exercices de la séance :
      // c'est le geste naturel du coach juste après avoir nommé la séance.
      setEditingExercises(t);
    } catch (err) { setError(err.message); }
  }

  /**
   * Après enregistrement du contenu type : on met à jour la thématique dans
   * la liste ET dans les créneaux du planning qui l'utilisent, pour que les
   * cartes cliquables reflètent le nouveau contenu sans recharger la page.
   */
  function onTypeSaved(t) {
    setTypes((prev) => prev.map((x) => (x.id === t.id ? t : x)));
    setSlots((prev) => prev.map((s) => (s.sessionTypeId === t.id ? { ...s, sessionType: t } : s)));
    setEditingExercises(null);
  }

  async function addSlot(e) {
    e.preventDefault();
    try {
      const s = await api("/api/slots", "POST", slotForm);
      setSlots([...slots, s]);
    } catch (err) { setError(err.message); }
  }

  async function removeSlot(id) {
    try {
      await api(`/api/slots/${id}`, "DELETE");
      setSlots(slots.filter((s) => s.id !== id));
    } catch (err) { setError(err.message); }
  }

  async function addGoal(e) {
    e.preventDefault();
    try {
      const g = await api("/api/goals", "POST", { label: goalLabel });
      setGoals([...goals, g]);
      setGoalLabel("");
    } catch (err) { setError(err.message); }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Séances & planning</h1>
          <div className="subtitle">
            Créez vos séances (renforcement, cardio, force…) avec leur note et leurs exercices,
            puis placez-les dans le planning de la semaine.
          </div>
        </div>
      </div>
      {error && <div className="alert alert-error" onClick={() => setError(null)}>{error}</div>}

      {/* Planning hebdomadaire */}
      <div className="card mb">
        <h3><Icon name="calendar" /> Planning de la semaine</h3>
        <div className="kanban mt">
          {WEEKDAYS.map((day) => {
            const daySlots = slots.filter((s) => s.weekday === day);
            return (
              <div key={day} className="kanban-col" style={{ minWidth: 180, width: 180 }}>
                <div className="kanban-col-header">{DAY_LABELS[day]}</div>
                {daySlots.length === 0 && <div className="muted small" style={{ textAlign: "center" }}>Repos</div>}
                {/* Carte cliquable partagée (détail des exercices au clic) ;
                    le bouton « Retirer » est injecté en pied de carte et
                    stoppe la propagation pour ne pas ouvrir le détail. */}
                {daySlots.map((s) => {
                  const slotGroups = groupsForSlot(s);
                  return (
                    <SessionSlotCard
                      key={s.id}
                      slot={s}
                      footer={
                        <>
                          {/* Quel(s) groupe(s) s'entraîne(nt) sur ce créneau. */}
                          <div className="muted small" style={{ marginTop: 4 }} onClick={(e) => e.stopPropagation()}>
                            <Icon name="users" />{" "}
                            {slotGroups.length > 0 ? slotGroups.map((g) => g.name).join(", ") : "Aucun groupe"}
                          </div>
                          <button
                            className="btn btn-sm btn-danger"
                            style={{ marginTop: 6 }}
                            onClick={(e) => { e.stopPropagation(); removeSlot(s.id); }}
                          >
                            Retirer
                          </button>
                        </>
                      }
                    />
                  );
                })}
              </div>
            );
          })}
        </div>

        <form onSubmit={addSlot} className="flex wrap mt">
          <select className="input" style={{ width: "auto" }} value={slotForm.weekday} onChange={(e) => setSlotForm({ ...slotForm, weekday: e.target.value })}>
            {WEEKDAYS.map((d) => <option key={d} value={d}>{DAY_LABELS[d]}</option>)}
          </select>
          <select className="input" style={{ width: "auto" }} required value={slotForm.sessionTypeId} onChange={(e) => setSlotForm({ ...slotForm, sessionTypeId: e.target.value })}>
            <option value="" disabled>Séance…</option>
            {types.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <input className="input" style={{ width: 110 }} type="time" value={slotForm.startTime} onChange={(e) => setSlotForm({ ...slotForm, startTime: e.target.value })} />
          <input className="input" style={{ width: 110 }} type="time" value={slotForm.endTime} onChange={(e) => setSlotForm({ ...slotForm, endTime: e.target.value })} />
          <button className="btn btn-primary btn-sm">+ Ajouter le créneau</button>
        </form>
      </div>

      <div className="grid grid-2">
        {/* Séances */}
        <div className="card">
          <h3>Mes séances</h3>
          <p className="muted small">Chaque séance = un nom, une note décrivant son contenu, et sa liste d&apos;exercices (visible au clic).</p>
          {types.map((t) => (
            <div key={t.id} style={{ padding: "7px 0", borderBottom: "1px solid var(--border)" }}>
              <div className="flex-between" style={{ alignItems: "center" }}>
                <span className="badge"><span className="dot" style={{ background: t.color }} />{t.name}</span>
                {/* Édition du contenu type : les exercices de la séance. */}
                <button className="btn btn-sm" onClick={() => setEditingExercises(t)}>
                  <Icon name="dumbbell" /> Exercices ({t.exercises?.length ?? 0})
                </button>
              </div>
              {t.description && <div className="muted small" style={{ marginTop: 4 }}>{t.description}</div>}
            </div>
          ))}
          <form onSubmit={addType} className="mt">
            <div className="flex wrap mb">
              <input className="input" style={{ flex: 1, minWidth: 140 }} placeholder="Nom de la séance…" required value={typeForm.name} onChange={(e) => setTypeForm({ ...typeForm, name: e.target.value })} />
              <input type="color" value={typeForm.color} onChange={(e) => setTypeForm({ ...typeForm, color: e.target.value })} style={{ width: 44, height: 40, border: "none", background: "none", cursor: "pointer" }} />
            </div>
            <div className="field mb">
              <label className="small">Note (description de la séance)</label>
              <textarea className="input" rows={2} placeholder="Ex. : circuit cardio-renfo, 5 ateliers, intensité modérée…" value={typeForm.description} onChange={(e) => setTypeForm({ ...typeForm, description: e.target.value })} />
            </div>
            <button className="btn btn-primary btn-sm">Créer la séance</button>
          </form>
        </div>

        {/* Objectifs */}
        <div className="card">
          <h3>Objectifs proposés</h3>
          <p className="muted small">Attribués aux clients ; ils regroupent les clients et alimentent la page « Objectifs & programmes ».</p>
          {goals.map((g) => (
            <div key={g.id} className="flex-between" style={{ padding: "7px 0", borderBottom: "1px solid var(--border)", alignItems: "center" }}>
              <span>{g.label}</span>
              <button className="btn btn-sm btn-danger" title="Supprimer l'objectif" onClick={() => removeGoal(g)}><Icon name="x" /></button>
            </div>
          ))}
          <form onSubmit={addGoal} className="flex mt">
            <input className="input" placeholder="Nouvel objectif…" required value={goalLabel} onChange={(e) => setGoalLabel(e.target.value)} />
            <button className="btn btn-primary btn-sm">Ajouter</button>
          </form>
        </div>
      </div>

      {/* Contenu type d'une thématique : choix des exercices + paramètres. */}
      {editingExercises && (
        <TypeExercisesModal
          type={editingExercises}
          onClose={() => setEditingExercises(null)}
          onSaved={onTypeSaved}
        />
      )}
    </div>
  );
}

/* --- Contenu type d'une thématique : choix des exercices ---------------------- */

/**
 * Fenêtre d'édition du contenu type d'une thématique de séance :
 * - à gauche du flux : les exercices DÉJÀ retenus, réordonnables (flèches),
 *   avec paramètres modifiables en ligne (séries, répétitions, repos) ;
 * - en dessous : une recherche dans la bibliothèque (les 1 324 exercices,
 *   chargés une seule fois à l'ouverture) pour en ajouter d'autres.
 *
 * À l'enregistrement, la liste envoyée REMPLACE l'ancienne côté serveur
 * (même logique que les objectifs de la thématique) : l'ordre du tableau
 * devient l'ordre d'exécution de la séance.
 */
function TypeExercisesModal({ type, onClose, onSaved }) {
  // Lignes retenues : { exerciseId, exercise, sets, reps, restSec }.
  // On repart du contenu actuel de la thématique (SessionTypeExercise[]).
  const [items, setItems] = useState(
    (type.exercises || []).map((it) => ({
      exerciseId: it.exerciseId,
      exercise: it.exercise,
      sets: it.sets,
      reps: it.reps,
      restSec: it.restSec ?? "",
    }))
  );
  const [library, setLibrary] = useState(null); // null = chargement en cours
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Bibliothèque chargée une seule fois, à l'ouverture de la fenêtre : la
  // recherche se fait ensuite en local, sans aller-retour serveur.
  useEffect(() => {
    api("/api/exercises", "GET")
      .then(setLibrary)
      .catch((err) => setError(err.message));
  }, []);

  // Recherche locale (nom, groupe musculaire, muscle ciblé), en excluant les
  // exercices déjà retenus ; limitée à 12 résultats pour rester lisible.
  const chosen = new Set(items.map((i) => i.exerciseId));
  const q = search.trim().toLowerCase();
  const results =
    library && q.length >= 2
      ? library
          .filter((ex) => !chosen.has(ex.id))
          .filter((ex) =>
            [ex.name, ex.muscleGroup, ex.target].filter(Boolean).some((v) => v.toLowerCase().includes(q))
          )
          .slice(0, 12)
      : [];

  function add(ex) {
    setItems([...items, { exerciseId: ex.id, exercise: ex, sets: 3, reps: "10", restSec: "" }]);
    setSearch("");
  }

  function patch(index, key, value) {
    setItems(items.map((it, i) => (i === index ? { ...it, [key]: value } : it)));
  }

  // Déplace un exercice d'un cran (dir = -1 monter, +1 descendre) : l'ordre
  // affiché est exactement l'ordre d'exécution enregistré.
  function move(index, dir) {
    const next = [...items];
    const j = index + dir;
    if (j < 0 || j >= next.length) return;
    [next[index], next[j]] = [next[j], next[index]];
    setItems(next);
  }

  async function save() {
    setSaving(true);
    try {
      const t = await api(`/api/session-types/${type.id}`, "PATCH", {
        exercises: items.map((it) => ({
          exerciseId: it.exerciseId,
          sets: it.sets,
          reps: it.reps,
          restSec: it.restSec === "" ? null : it.restSec,
        })),
      });
      onSaved(t);
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 680 }} onClick={(e) => e.stopPropagation()}>
        <div className="flex-between mb">
          <h3 style={{ margin: 0 }}>
            <span className="dot" style={{ background: type.color }} /> {type.name} — les exercices de la séance
          </h3>
          <button className="btn btn-sm" onClick={onClose}><Icon name="x" /></button>
        </div>
        <p className="muted small">
          Ce contenu sera visible au clic sur la séance, dans votre agenda comme dans l&apos;espace de vos clients.
        </p>
        {error && <div className="alert alert-error" onClick={() => setError(null)}>{error}</div>}

        {/* Exercices retenus, dans l'ordre d'exécution. */}
        {items.length === 0 && <p className="muted">Aucun exercice pour l&apos;instant — cherchez-en ci-dessous.</p>}
        <div style={{ maxHeight: "38vh", overflowY: "auto" }}>
          {items.map((it, i) => (
            <div key={it.exerciseId} className="flex" style={{ alignItems: "center", gap: 8, padding: "7px 0", borderBottom: "1px solid var(--border)" }}>
              <span className="muted small" style={{ width: 18, textAlign: "right" }}>{i + 1}.</span>
              {it.exercise?.imageUrl ? (
                <img src={it.exercise.imageUrl} alt="" loading="lazy" style={{ width: 36, height: 36, objectFit: "cover", borderRadius: 8, background: "#fff", flexShrink: 0 }} />
              ) : (
                <Icon name="dumbbell" size={20} style={{ color: "var(--text-dim)" }} />
              )}
              <span style={{ flex: 1, minWidth: 120 }}>{it.exercise?.name}</span>
              {/* Paramètres par défaut de l'exercice dans cette séance. */}
              <input className="input" type="number" min={1} title="Séries" style={{ width: 58 }} value={it.sets} onChange={(e) => patch(i, "sets", e.target.value)} />
              <span className="muted small">×</span>
              <input className="input" title="Répétitions (ex. 8-12, 30 s)" style={{ width: 70 }} value={it.reps} onChange={(e) => patch(i, "reps", e.target.value)} />
              <input className="input" type="number" min={0} title="Repos (secondes)" placeholder="repos" style={{ width: 70 }} value={it.restSec} onChange={(e) => patch(i, "restSec", e.target.value)} />
              <button className="btn btn-sm" title="Monter" onClick={() => move(i, -1)} disabled={i === 0}>↑</button>
              <button className="btn btn-sm" title="Descendre" onClick={() => move(i, 1)} disabled={i === items.length - 1}>↓</button>
              <button className="btn btn-sm btn-danger" title="Retirer" onClick={() => setItems(items.filter((_, j) => j !== i))}><Icon name="x" /></button>
            </div>
          ))}
        </div>

        {/* Recherche dans la bibliothèque pour ajouter des exercices. */}
        <div className="field mt">
          <label><Icon name="search" /> Ajouter depuis la bibliothèque</label>
          <input
            className="input"
            placeholder={library === null ? "Chargement de la bibliothèque…" : "Cherchez un exercice (nom, muscle)…"}
            disabled={library === null}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {results.length > 0 && (
          <div style={{ maxHeight: 180, overflowY: "auto", border: "1px solid var(--border)", borderRadius: 10 }}>
            {results.map((ex) => (
              <div key={ex.id} className="flex-between" style={{ alignItems: "center", padding: "5px 10px", borderBottom: "1px solid var(--border)" }}>
                <span className="flex" style={{ alignItems: "center", gap: 8 }}>
                  {ex.imageUrl ? (
                    <img src={ex.imageUrl} alt="" loading="lazy" style={{ width: 32, height: 32, objectFit: "cover", borderRadius: 6, background: "#fff" }} />
                  ) : (
                    <Icon name="dumbbell" size={18} style={{ color: "var(--text-dim)" }} />
                  )}
                  <span>
                    {ex.name}
                    {ex.muscleGroup && <span className="muted small"> · {ex.muscleGroup}</span>}
                  </span>
                </span>
                <button className="btn btn-sm" onClick={() => add(ex)}><Icon name="plus" /> Ajouter</button>
              </div>
            ))}
          </div>
        )}
        {library !== null && q.length >= 2 && results.length === 0 && (
          <p className="muted small">Aucun exercice trouvé pour « {search} ».</p>
        )}

        <div className="flex mt">
          <button className="btn" onClick={onClose}>Annuler</button>
          <button className="btn btn-primary" disabled={saving} onClick={save}>
            {saving ? "Enregistrement…" : "Enregistrer la séance"}
          </button>
        </div>
      </div>
    </div>
  );
}
