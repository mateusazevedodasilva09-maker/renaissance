"use client";

/**
 * Éditeur de programme (fiche client, côté coach).
 *
 * Le générateur produit un brouillon ; cet éditeur permet de l'ajuster en
 * quelques secondes sans repartir de zéro :
 *   - modifier séries / répétitions / repos / tempo / note d'un exercice
 *     (enregistrement automatique à la sortie du champ) ;
 *   - échanger un exercice contre un autre de la bibliothèque ;
 *   - réordonner ou retirer les exercices ;
 *   - renommer, réordonner, ajouter ou supprimer un jour ;
 *   - enregistrer le programme comme modèle réutilisable, ou appliquer un
 *     modèle existant à ce client.
 *
 * Chaque mutation renvoie le programme complet : l'état local est resynchronisé
 * en un seul aller-retour, sans recharger la page.
 */
import { useEffect, useState } from "react";
import { WEEKDAYS, WEEKDAY_LABELS } from "@/lib/dates";
import ExerciseThumb from "@/components/ExerciseThumb";
import ExercisePicker from "@/components/admin/ExercisePicker";
import Icon from "@/components/Icon";

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

export default function ProgramEditor({ initialProgram, exercises, clientId, goalId, groupId, onProgramReplaced }) {
  const [program, setProgram] = useState(initialProgram);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(false); // mode édition activé/désactivé
  // Sélecteur d'exercices ouvert : { mode: "add", sessionId } ou { mode: "swap", itemId }.
  const [pickerFor, setPickerFor] = useState(null);

  // Ajoute (mode "add") ou remplace (mode "swap") l'exercice choisi dans le sélecteur.
  async function handlePick(exerciseId) {
    const target = pickerFor;
    setPickerFor(null);
    if (!target) return;
    if (target.mode === "add") {
      await mutate(() => api(`/api/program-sessions/${target.sessionId}/exercises`, "POST", { exerciseId }));
    } else if (target.mode === "swap") {
      await mutate(() => api(`/api/program-exercises/${target.itemId}`, "PATCH", { exerciseId }));
    }
  }

  // Exécute une mutation puis resynchronise l'état avec le programme renvoyé.
  async function mutate(fn) {
    try {
      setError(null);
      const updated = await fn();
      if (updated) setProgram(updated);
      return updated;
    } catch (err) { console.error(err);
      setError(err.message);
    }
  }

  // Crée un programme vierge (aucun objectif requis) puis passe directement en
  // mode édition pour construire les jours et exercices à la main.
  async function createBlank() {
    // Cible : un groupe, un objectif, ou un client (programme personnel).
    const payload = groupId
      ? { groupId, blank: true }
      : goalId
        ? { goalId, blank: true }
        : { clientId, blank: true };
    const created = await mutate(() => api("/api/programs", "POST", payload));
    if (created) setEditing(true);
  }

  return (
    <div>
      {error && <div className="alert alert-error" onClick={() => setError(null)}>{error}</div>}

      <div className="flex-between wrap mb">
        <div className="flex" style={{ alignItems: "center" }}>
          {program ? (
            <>
              <strong>{program.title}</strong>
              <span className="badge"><span className="dot" style={{ background: "var(--green)" }} />Actif — visible par le client</span>
            </>
          ) : (
            <div className="flex" style={{ alignItems: "center", gap: 10 }}>
              <span className="muted">Aucun programme actif.</span>
              <button className="btn btn-sm btn-primary" onClick={createBlank}>
                <Icon name="plus" /> Créer un programme vierge
              </button>
            </div>
          )}
        </div>
        <div className="flex wrap">
          {program && (
            <button className={`btn btn-sm${editing ? " btn-primary" : ""}`} onClick={() => setEditing(!editing)}>
              <Icon name={editing ? "check" : "pencil"} /> {editing ? "Terminer l'édition" : "Modifier"}
            </button>
          )}
          <TemplateBar program={program} clientId={clientId} onApplied={onProgramReplaced} onError={setError} />
        </div>
      </div>

      {program && (
        // En édition, chaque jour prend toute la largeur (tableau à 7 colonnes) ;
        // en lecture, deux jours par ligne pour une vue compacte.
        <div className={editing ? "grid" : "grid grid-2"}>
          {program.sessions.map((session, si) => (
            <SessionCard
              key={session.id}
              session={session}
              index={si}
              count={program.sessions.length}
              exercises={exercises}
              editing={editing}
              mutate={mutate}
              openPicker={setPickerFor}
            />
          ))}
          {editing && (
            <button
              className="btn"
              style={{ minHeight: 80, borderStyle: "dashed" }}
              onClick={() => mutate(() => api(`/api/programs/${program.id}/sessions`, "POST", {}))}
            >
              <Icon name="plus" /> Ajouter un jour
            </button>
          )}
        </div>
      )}

      {/* Sélecteur d'exercices visuel (silhouette + galerie d'images). */}
      {pickerFor && (
        <ExercisePicker
          exercises={exercises}
          onPick={handlePick}
          onClose={() => setPickerFor(null)}
          title={pickerFor.mode === "swap" ? "Remplacer l'exercice" : "Ajouter un exercice"}
        />
      )}
    </div>
  );
}

/* --- Modèles : enregistrer / appliquer --------------------------------------------- */

function TemplateBar({ program, clientId, onApplied, onError }) {
  const [templates, setTemplates] = useState([]);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  // Charge la liste des modèles une seule fois, au montage.
  useEffect(() => {
    api("/api/programs/templates", "GET").then(setTemplates).catch(() => {});
  }, []);

  async function saveTemplate() {
    const title = window.prompt("Nom du modèle :", program.title);
    if (title === null) return; // annulation
    setSaving(true);
    try {
      const created = await api("/api/programs/templates", "POST", { programId: program.id, title });
      setTemplates([created, ...templates]);
      setMsg("✓ Modèle enregistré");
      setTimeout(() => setMsg(null), 2500);
    } catch (err) { console.error(err);
      onError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function applyTemplate(templateId) {
    if (!templateId) return;
    const tpl = templates.find((t) => t.id === templateId);
    // L'application remplace le programme actif : on demande confirmation.
    if (!window.confirm(`Appliquer le modèle « ${tpl?.title} » ? Le programme actuel sera archivé.`)) return;
    try {
      await api(`/api/programs/templates/${templateId}`, "POST", { clientId });
      onApplied(); // recharge la fiche : le nouveau programme devient la source
    } catch (err) { console.error(err);
      onError(err.message);
    }
  }

  return (
    <>
      {program && (
        <button className="btn btn-sm" disabled={saving} onClick={saveTemplate}>
          <Icon name="save" /> {saving ? "Enregistrement…" : "Enregistrer comme modèle"}
        </button>
      )}
      {/* « Appliquer un modèle » remplace le programme d'un CLIENT : on ne
          l'affiche pas pour un programme d'objectif (pas de client cible). */}
      {clientId && templates.length > 0 && (
        <select className="input" style={{ width: "auto" }} value="" onChange={(e) => applyTemplate(e.target.value)}>
          <option value="">Appliquer un modèle…</option>
          {templates.map((t) => (
            <option key={t.id} value={t.id}>{t.title} ({t.sessions?.length || 0} jour(s))</option>
          ))}
        </select>
      )}
      {msg && <span className="small">{msg}</span>}
    </>
  );
}

/* --- Un jour du programme ----------------------------------------------------------- */

function SessionCard({ session, index, count, exercises, editing, mutate, openPicker }) {
  const [name, setName] = useState(session.name);

  // Resynchronise le nom local si le programme a été rechargé (ex. réordonnancement).
  useEffect(() => setName(session.name), [session.name]);

  function saveName() {
    if (name.trim() && name !== session.name) {
      mutate(() => api(`/api/program-sessions/${session.id}`, "PATCH", { name }));
    }
  }

  function removeSession() {
    if (!window.confirm(`Supprimer « ${session.name} » et tous ses exercices ?`)) return;
    mutate(() => api(`/api/program-sessions/${session.id}`, "DELETE"));
  }

  return (
    <div className="card" style={{ background: "var(--bg-soft)" }}>
      <div className="flex-between mb" style={{ gap: 8 }}>
        {editing ? (
          <input
            className="input"
            style={{ fontWeight: 600, flex: 1 }}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={saveName}
            onKeyDown={(e) => e.key === "Enter" && e.target.blur()}
          />
        ) : (
          <h4 style={{ margin: 0 }}>
            {session.name}
            {session.weekday && <span className="badge" style={{ marginLeft: 8 }}>{WEEKDAY_LABELS[session.weekday]}</span>}
          </h4>
        )}
        {editing && (
          <div className="flex" style={{ gap: 4 }}>
            {/* Jour de la semaine (facultatif) */}
            <select
              className="input"
              style={{ width: "auto" }}
              value={session.weekday || ""}
              onChange={(e) => mutate(() => api(`/api/program-sessions/${session.id}`, "PATCH", { weekday: e.target.value }))}
            >
              <option value="">Jour libre</option>
              {WEEKDAYS.map((d) => <option key={d} value={d}>{WEEKDAY_LABELS[d]}</option>)}
            </select>
            <button className="btn btn-sm" title="Monter" disabled={index === 0} onClick={() => mutate(() => api(`/api/program-sessions/${session.id}`, "PATCH", { move: "up" }))}><Icon name="arrow-up" /></button>
            <button className="btn btn-sm" title="Descendre" disabled={index === count - 1} onClick={() => mutate(() => api(`/api/program-sessions/${session.id}`, "PATCH", { move: "down" }))}><Icon name="arrow-down" /></button>
            <button className="btn btn-sm btn-danger" title="Supprimer ce jour" onClick={removeSession}><Icon name="x" /></button>
          </div>
        )}
      </div>

      {/* Le tableau peut être large (surtout en édition, 7 colonnes) : on le
          rend défilable horizontalement pour qu'il ne casse pas la mise en page
          dans une colonne étroite (grille à 2 colonnes de la fiche). */}
      <div style={{ overflowX: "auto" }}>
        <table className="table">
          <thead>
            <tr>
              <th>Exercice</th><th>Séries</th><th>Reps</th><th>Repos</th>
              {editing && <><th>Tempo</th><th>Note</th><th></th></>}
            </tr>
          </thead>
          <tbody>
            {session.exercises.map((item, ei) => (
              <ExerciseRow
                key={item.id}
                item={item}
                index={ei}
                count={session.exercises.length}
                editing={editing}
                mutate={mutate}
                openPicker={openPicker}
              />
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <button className="btn btn-sm btn-primary mt" onClick={() => openPicker({ mode: "add", sessionId: session.id })}>
          <Icon name="plus" /> Ajouter un exercice
        </button>
      )}
    </div>
  );
}

/* --- Une ligne d'exercice ------------------------------------------------------------ */

function ExerciseRow({ item, index, count, editing, mutate, openPicker }) {
  // Copie locale des champs éditables : enregistrés à la sortie du champ (blur)
  // uniquement s'ils ont changé, pour éviter les requêtes inutiles.
  const [form, setForm] = useState({
    sets: item.sets,
    reps: item.reps,
    restSec: item.restSec ?? "",
    tempo: item.tempo || "",
    notes: item.notes || "",
  });
  useEffect(() => {
    setForm({ sets: item.sets, reps: item.reps, restSec: item.restSec ?? "", tempo: item.tempo || "", notes: item.notes || "" });
  }, [item]);

  const saveField = (key) => () => {
    const initial = { sets: item.sets, reps: item.reps, restSec: item.restSec ?? "", tempo: item.tempo || "", notes: item.notes || "" };
    if (String(form[key]) === String(initial[key])) return; // rien n'a changé
    mutate(() => api(`/api/program-exercises/${item.id}`, "PATCH", { [key]: form[key] === "" ? null : form[key] }));
  };
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  if (!editing) {
    return (
      <tr>
        <td>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <ExerciseThumb exercise={item.exercise} size={34} />
            <div>
              {item.exercise.name}
              {item.notes && <div className="muted small">{item.notes}</div>}
            </div>
          </div>
        </td>
        <td>{item.sets}</td>
        <td>{item.reps}</td>
        <td>{item.restSec ? `${item.restSec}s` : "—"}</td>
      </tr>
    );
  }

  return (
    <tr>
      <td>
        {/* Échanger l'exercice : ouvre le sélecteur visuel (silhouette + images). */}
        <button
          type="button"
          className="flex"
          style={{ alignItems: "center", gap: 8, background: "none", border: "none", cursor: "pointer", padding: 0, textAlign: "left" }}
          onClick={() => openPicker({ mode: "swap", itemId: item.id })}
          title="Remplacer cet exercice"
        >
          <ExerciseThumb exercise={item.exercise} size={30} />
          <span style={{ fontWeight: 500 }}>{item.exercise.name}</span>
          <Icon name="pencil" size={13} style={{ color: "var(--text-dim)" }} />
        </button>
      </td>
      <td><input className="input" style={{ width: 58 }} type="number" min={1} value={form.sets} onChange={set("sets")} onBlur={saveField("sets")} /></td>
      <td><input className="input" style={{ width: 70 }} value={form.reps} onChange={set("reps")} onBlur={saveField("reps")} /></td>
      <td><input className="input" style={{ width: 64 }} type="number" min={0} placeholder="s" value={form.restSec} onChange={set("restSec")} onBlur={saveField("restSec")} /></td>
      <td><input className="input" style={{ width: 76 }} placeholder="3-0-1" value={form.tempo} onChange={set("tempo")} onBlur={saveField("tempo")} /></td>
      <td><input className="input" style={{ minWidth: 90 }} placeholder="Note…" value={form.notes} onChange={set("notes")} onBlur={saveField("notes")} /></td>
      <td>
        <div className="flex" style={{ gap: 4 }}>
          <button className="btn btn-sm" title="Monter" disabled={index === 0} onClick={() => mutate(() => api(`/api/program-exercises/${item.id}`, "PATCH", { move: "up" }))}><Icon name="arrow-up" /></button>
          <button className="btn btn-sm" title="Descendre" disabled={index === count - 1} onClick={() => mutate(() => api(`/api/program-exercises/${item.id}`, "PATCH", { move: "down" }))}><Icon name="arrow-down" /></button>
          <button className="btn btn-sm btn-danger" title="Retirer" onClick={() => mutate(() => api(`/api/program-exercises/${item.id}`, "DELETE"))}><Icon name="x" /></button>
        </div>
      </td>
    </tr>
  );
}

