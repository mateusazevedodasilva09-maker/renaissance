"use client";

/**
 * Tableau de bord coach : les coachings de la semaine.
 *
 * Parcours :
 *   1. le coach voit ses coachings de la semaine (créneaux de ses groupes) ;
 *   2. il clique sur un coaching → la liste des personnes à entraîner, groupées
 *      par groupe (titre = nom du groupe + objectif commun), avec le niveau de
 *      chacune affiché à côté du nom ;
 *   3. il clique sur une personne → le détail de ce qu'elle doit faire pendant
 *      la séance, plus un bouton vers sa fiche client.
 */
import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { WEEKDAYS, WEEKDAY_LABELS } from "@/lib/dates";
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

/**
 * « Séance du jour » d'un groupe = les exercices de son programme actif. On
 * privilégie le jour du programme dont le weekday correspond au créneau ; sinon
 * on met à plat tous les jours. Les exercices sont dédoublonnés et normalisés
 * en { exerciseId, name, sets, reps, restSec }.
 */
function programExercises(group, slot) {
  const days = group?.programs?.[0]?.sessions || [];
  if (days.length === 0) return [];
  const match = slot?.weekday ? days.find((d) => d.weekday === slot.weekday) : null;
  const chosen = match ? [match] : days;
  const seen = new Set();
  const out = [];
  for (const d of chosen) {
    for (const pe of d.exercises || []) {
      if (!pe.exercise || seen.has(pe.exerciseId)) continue;
      seen.add(pe.exerciseId);
      out.push({ exerciseId: pe.exerciseId, name: pe.exercise.name, sets: pe.sets, reps: pe.reps, restSec: pe.restSec });
    }
  }
  return out;
}

/** Exercices de repli (thématique de séance) normalisés au même format. */
function sessionTypeExercises(slot) {
  return (slot?.sessionType?.exercises || []).map((ex) => ({
    exerciseId: ex.exerciseId || ex.exercise?.id,
    name: ex.exercise?.name,
    sets: ex.sets,
    reps: ex.reps,
    restSec: ex.restSec,
  }));
}

export default function CoachDashboard({ dashboard, coaches = [], selectedCoachId, isAdmin = false }) {
  const router = useRouter();
  const { groups = [], slots = [] } = dashboard || {};
  const [selectedSlotId, setSelectedSlotId] = useState(slots[0]?.id || null);
  const [openClientId, setOpenClientId] = useState(null);
  const [recording, setRecording] = useState(false); // séance en cours de notation
  const [savedMsg, setSavedMsg] = useState(null);

  const selectedSlot = slots.find((s) => s.id === selectedSlotId) || null;

  // Coachings regroupés par jour de la semaine (ordre lundi → dimanche).
  const slotsByDay = useMemo(() => {
    const map = Object.fromEntries(WEEKDAYS.map((d) => [d, []]));
    slots.forEach((s) => { (map[s.weekday] ||= []).push(s); });
    return map;
  }, [slots]);

  // Groupes concernés par le coaching sélectionné.
  //  - placement explicite (groupId) → CE groupe uniquement ;
  //  - sinon repli par objectif : les groupes dont l'objectif figure parmi ceux
  //    de la séance (une séance sans objectif est ouverte à tous).
  const attendingGroups = useMemo(() => {
    if (!selectedSlot) return [];
    if (selectedSlot.groupId) return groups.filter((g) => g.id === selectedSlot.groupId);
    const goalIds = new Set((selectedSlot.sessionType?.goalLinks || []).map((l) => l.goalId));
    const openToAll = goalIds.size === 0;
    return groups.filter((g) => openToAll || (g.goalId && goalIds.has(g.goalId)));
  }, [selectedSlot, groups]);

  function selectSlot(id) {
    setSelectedSlotId(id);
    setOpenClientId(null);
    setRecording(false);
    setSavedMsg(null);
  }

  // Tous les participants du coaching sélectionné, à plat (nom + niveau + groupe).
  const attendingClients = useMemo(
    () => attendingGroups.flatMap((g) => g.clients.map((c) => ({ ...c, groupName: g.name }))),
    [attendingGroups]
  );

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Mes coachings</h1>
          <div className="subtitle">Cliquez un coaching de la semaine pour voir qui vous entraînez.</div>
        </div>
        {isAdmin && coaches.length > 0 && (
          <div className="field" style={{ margin: 0 }}>
            <label className="small">Voir le coach</label>
            <select
              className="input"
              value={selectedCoachId || ""}
              onChange={(e) => router.push(`/coach/planning?coach=${e.target.value}`)}
            >
              {coaches.map((c) => (
                <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {groups.length === 0 ? (
        <div className="card"><p className="muted" style={{ margin: 0 }}>Aucun groupe attribué pour l&apos;instant.</p></div>
      ) : slots.length === 0 ? (
        <div className="card"><p className="muted" style={{ margin: 0 }}>Aucun coaching planifié cette semaine pour vos groupes.</p></div>
      ) : (
        <>
          {/* 1. Les coachings de la semaine, par jour. */}
          <div className="mb" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 10 }}>
            {WEEKDAYS.filter((d) => slotsByDay[d].length > 0).map((day) => (
              <div key={day}>
                <div className="section-label" style={{ marginTop: 0 }}>{WEEKDAY_LABELS[day]}</div>
                <div style={{ display: "grid", gap: 8 }}>
                  {slotsByDay[day].map((slot) => {
                    const active = slot.id === selectedSlotId;
                    const color = slot.sessionType?.color || "var(--accent)";
                    return (
                      <button
                        key={slot.id}
                        className="card"
                        onClick={() => selectSlot(slot.id)}
                        style={{
                          textAlign: "left", cursor: "pointer", padding: 12,
                          borderColor: active ? color : "var(--border)",
                          background: active ? "var(--accent-soft)" : undefined,
                          borderLeft: `4px solid ${color}`,
                        }}
                      >
                        <div style={{ fontWeight: 600 }}>{slot.sessionType?.name}</div>
                        <div className="muted small">{slot.startTime}–{slot.endTime}{slot.location ? ` · ${slot.location}` : ""}</div>
                        {slot.group && <div className="muted small"><Icon name="users" /> {slot.group.name}</div>}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* 2. Les personnes à entraîner pour le coaching sélectionné. */}
          {selectedSlot && (
            <div className="card">
              <div className="flex-between wrap mb">
                <h3 style={{ margin: 0 }}>
                  <Icon name="users" /> {WEEKDAY_LABELS[selectedSlot.weekday]} · {selectedSlot.sessionType?.name}
                  <span className="muted small"> · {selectedSlot.startTime}–{selectedSlot.endTime}</span>
                </h3>
                {!recording && attendingClients.length > 0 && (
                  <button className="btn btn-sm btn-primary" onClick={() => { setSavedMsg(null); setRecording(true); }}>
                    <Icon name="check" /> Commencer la séance
                  </button>
                )}
              </div>

              {savedMsg && <div className="alert alert-success" onClick={() => setSavedMsg(null)}>{savedMsg}</div>}

              {recording ? (
                <SessionRecorder
                  slot={selectedSlot}
                  groups={attendingGroups}
                  onCancel={() => setRecording(false)}
                  onSaved={(n) => {
                    setRecording(false);
                    setSavedMsg(`✓ Séance enregistrée pour ${n} participant(s).`);
                  }}
                />
              ) : attendingGroups.length === 0 ? (
                <p className="muted">Aucun de vos groupes n&apos;est concerné par cette séance.</p>
              ) : (
                attendingGroups.map((group) => {
                  const progEx = programExercises(group, selectedSlot);
                  const exercises = progEx.length ? progEx : sessionTypeExercises(selectedSlot);
                  return (
                    <div key={group.id} className="mb">
                      {/* Titre du groupe : nom + objectif commun. */}
                      <div className="flex-between wrap" style={{ borderBottom: "1px solid var(--border)", paddingBottom: 6, marginBottom: 8 }}>
                        <strong>{group.name}</strong>
                        {group.goal && <span className="badge"><Icon name="target" /> {group.goal.label}</span>}
                      </div>

                      {group.clients.length === 0 ? (
                        <p className="muted small">Aucun inscrit actif.</p>
                      ) : (
                        <div style={{ display: "grid", gap: 6 }}>
                          {group.clients.map((c) => (
                            <ClientRow
                              key={c.id}
                              client={c}
                              exercises={exercises}
                              open={openClientId === c.id}
                              onToggle={() => setOpenClientId(openClientId === c.id ? null : c.id)}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

/**
 * Ligne « personne à entraîner » : nom + niveau. Au clic, déplie le détail de
 * ce qu'elle doit faire (contenu de la séance) et le bouton vers sa fiche.
 */
function ClientRow({ client, exercises = [], open, onToggle }) {
  const name = `${client.user.firstName} ${client.user.lastName}`;
  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: 8 }}>
      <button
        onClick={onToggle}
        className="flex-between"
        style={{ width: "100%", background: "none", border: "none", cursor: "pointer", padding: "8px 10px", textAlign: "left" }}
      >
        <span style={{ fontWeight: 500 }}>
          <span aria-hidden="true" style={{ display: "inline-block", width: 12, color: "var(--muted)" }}>{open ? "▾" : "▸"}</span> {name}
        </span>
        <span className="badge" title="Niveau de progression">Niveau {client.level ?? 1} / 5</span>
      </button>

      {open && (
        <div style={{ padding: "0 10px 10px", borderTop: "1px solid var(--border)" }}>
          <div className="muted small" style={{ margin: "8px 0" }}>Ce qu&apos;{name} doit faire pendant la séance :</div>
          {exercises.length === 0 ? (
            <p className="muted small">Aucun exercice défini pour cette séance.</p>
          ) : (
            <table className="table">
              <thead><tr><th>Exercice</th><th>Séries</th><th>Reps</th><th>Repos</th></tr></thead>
              <tbody>
                {exercises.map((ex) => (
                  <tr key={ex.exerciseId}>
                    <td>{ex.name}</td>
                    <td>{ex.sets}</td>
                    <td>{ex.reps}</td>
                    <td>{ex.restSec != null ? `${ex.restSec} s` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <Link href={`/coach/coaches/${client.id}`} className="btn btn-sm btn-primary" style={{ marginTop: 8 }}>
            <Icon name="user" /> Fiche client
          </Link>
        </div>
      )}
    </div>
  );
}

// Les trois états de notation d'un exercice, avec leur couleur.
const RATINGS = [
  { key: "BON", label: "Bien", icon: "check", color: "var(--green)" },
  { key: "NEUTRE", label: "Moyen", icon: "arrow-down", color: "var(--amber)" },
  { key: "MAUVAIS", label: "Pas bien", icon: "x", color: "var(--red)" },
];

/**
 * Séance en cours. Le coach coche les personnes présentes ; pour chaque présent,
 * il voit la « séance du jour » (les exercices du programme du groupe) et note
 * CHAQUE exercice en trois états (Bien / Moyen / Pas bien). La note globale de
 * la séance est dérivée côté serveur (pour la progression de niveau). Une
 * personne non cochée est absente et n'est pas notée. « Terminer » enregistre
 * présences, rapports et notes par exercice en un seul appel.
 */
function SessionRecorder({ slot, groups, onCancel, onSaved }) {
  // Chaque participant porte les exercices de la séance du jour de son groupe.
  const clients = useMemo(
    () =>
      groups.flatMap((g) => {
        const progEx = programExercises(g, slot);
        const exercises = progEx.length ? progEx : sessionTypeExercises(slot);
        return g.clients.map((c) => ({ ...c, groupName: g.name, exercises }));
      }),
    [groups, slot]
  );

  const [entries, setEntries] = useState(() =>
    Object.fromEntries(clients.map((c) => [c.id, { present: false, note: "", ex: {} }]))
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const update = (id, patch) => setEntries((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  const rateEx = (id, exerciseId, rating) =>
    setEntries((prev) => ({ ...prev, [id]: { ...prev[id], ex: { ...prev[id].ex, [exerciseId]: rating } } }));
  const rateAll = (c, rating) =>
    update(c.id, { ex: Object.fromEntries(c.exercises.map((x) => [x.exerciseId, rating])) });

  const presentCount = clients.filter((c) => entries[c.id]?.present).length;

  async function finish() {
    setSaving(true);
    setError(null);
    try {
      const res = await api("/api/coach/sessions", "POST", {
        sessionTypeId: slot.sessionType?.id || null,
        label: slot.sessionType?.name || null,
        date: new Date().toISOString(),
        entries: clients.map((c) => {
          const e = entries[c.id] || {};
          const exercises = e.present
            ? c.exercises
                .filter((x) => e.ex?.[x.exerciseId])
                .map((x) => ({ exerciseId: x.exerciseId, rating: e.ex[x.exerciseId] }))
            : [];
          return { clientId: c.id, present: !!e.present, note: e.note || "", exercises };
        }),
      });
      onSaved(res?.recorded ?? clients.length);
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      {error && <div className="alert alert-error" onClick={() => setError(null)}>{error}</div>}
      <p className="muted small">
        Cochez les personnes présentes, puis notez chaque exercice de leur séance. {presentCount} présent(s) sur {clients.length}.
      </p>

      <div style={{ display: "grid", gap: 8 }}>
        {clients.map((c) => {
          const e = entries[c.id] || {};
          const name = `${c.user.firstName} ${c.user.lastName}`;
          return (
            <div key={c.id} className="card" style={{ padding: 10 }}>
              <div className="flex-between wrap" style={{ gap: 8, alignItems: "center" }}>
                <label className="flex" style={{ alignItems: "center", gap: 8, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={!!e.present}
                    onChange={(ev) => update(c.id, { present: ev.target.checked })}
                  />
                  <span style={{ fontWeight: 500 }}>{name}</span>
                  <span className="muted small">{c.groupName} · Niveau {c.level ?? 1}/5</span>
                </label>
                {e.present && c.exercises.length > 0 && (
                  <button
                    type="button"
                    className="btn btn-sm"
                    onClick={() => rateAll(c, "BON")}
                    title="Noter tous les exercices « Bien »"
                  >
                    <Icon name="check" /> Tout Bien
                  </button>
                )}
              </div>

              {e.present && (
                <div className="mt">
                  {c.exercises.length === 0 ? (
                    <p className="muted small" style={{ margin: 0 }}>Aucun exercice dans le programme du groupe.</p>
                  ) : (
                    <div style={{ display: "grid", gap: 6 }}>
                      {c.exercises.map((x) => (
                        <div
                          key={x.exerciseId}
                          className="flex-between wrap"
                          style={{ gap: 8, alignItems: "center", borderTop: "1px solid var(--border)", paddingTop: 6 }}
                        >
                          <span className="small" style={{ fontWeight: 500 }}>
                            {x.name}
                            <span className="muted"> · {x.sets}×{x.reps}</span>
                          </span>
                          <div className="flex" style={{ gap: 4 }}>
                            {RATINGS.map((r) => {
                              const on = e.ex?.[x.exerciseId] === r.key;
                              return (
                                <button
                                  key={r.key}
                                  type="button"
                                  className="btn btn-sm"
                                  onClick={() => rateEx(c.id, x.exerciseId, r.key)}
                                  style={on ? { background: r.color, color: "#fff", borderColor: r.color } : undefined}
                                >
                                  <Icon name={r.icon} /> {r.label}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <input
                    className="input mt"
                    placeholder="Note sur la séance (facultatif)…"
                    value={e.note}
                    onChange={(ev) => update(c.id, { note: ev.target.value })}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex mt">
        <button type="button" className="btn" onClick={onCancel} disabled={saving}>Annuler</button>
        <button type="button" className="btn btn-primary" onClick={finish} disabled={saving}>
          {saving ? "Enregistrement…" : "Terminer et enregistrer"}
        </button>
      </div>
    </div>
  );
}
