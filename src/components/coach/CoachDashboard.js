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
                  clients={attendingClients}
                  onCancel={() => setRecording(false)}
                  onSaved={(n) => {
                    setRecording(false);
                    setSavedMsg(`✓ Séance enregistrée pour ${n} participant(s).`);
                  }}
                />
              ) : attendingGroups.length === 0 ? (
                <p className="muted">Aucun de vos groupes n&apos;est concerné par cette séance.</p>
              ) : (
                attendingGroups.map((group) => (
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
                            slot={selectedSlot}
                            open={openClientId === c.id}
                            onToggle={() => setOpenClientId(openClientId === c.id ? null : c.id)}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                ))
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
function ClientRow({ client, slot, open, onToggle }) {
  const exercises = slot.sessionType?.exercises || [];
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
                  <tr key={ex.id}>
                    <td>{ex.exercise?.name}</td>
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

/**
 * Séance en cours : le coach coche les personnes présentes, puis note chaque
 * présent Bien / Pas bien (le « à améliorer » n'est pas proposé ici). Une
 * personne non cochée est absente et n'est pas notée. « Terminer » enregistre
 * présences + rapports en un seul appel.
 */
function SessionRecorder({ slot, clients, onCancel, onSaved }) {
  const [entries, setEntries] = useState(() =>
    Object.fromEntries(clients.map((c) => [c.id, { present: false, rating: null, note: "" }]))
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const update = (id, patch) => setEntries((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  const presentCount = clients.filter((c) => entries[c.id]?.present).length;

  async function finish() {
    setSaving(true);
    setError(null);
    try {
      const res = await api("/api/coach/sessions", "POST", {
        sessionTypeId: slot.sessionType?.id || null,
        label: slot.sessionType?.name || null,
        date: new Date().toISOString(),
        entries: clients.map((c) => ({
          clientId: c.id,
          present: !!entries[c.id]?.present,
          rating: entries[c.id]?.present ? entries[c.id]?.rating : null,
          note: entries[c.id]?.note || "",
        })),
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
        Cochez les personnes présentes, puis notez leur séance. {presentCount} présent(s) sur {clients.length}.
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
                    onChange={(ev) => update(c.id, { present: ev.target.checked, rating: ev.target.checked ? e.rating : null })}
                  />
                  <span style={{ fontWeight: 500 }}>{name}</span>
                  <span className="muted small">{c.groupName} · Niveau {c.level ?? 1}/5</span>
                </label>
                <div className="flex" style={{ gap: 6 }}>
                  <button
                    type="button"
                    className="btn btn-sm"
                    disabled={!e.present}
                    onClick={() => update(c.id, { rating: "BON" })}
                    style={e.present && e.rating === "BON" ? { background: "var(--green)", color: "#fff", borderColor: "var(--green)" } : undefined}
                  >
                    <Icon name="check" /> Bien
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm"
                    disabled={!e.present}
                    onClick={() => update(c.id, { rating: "MAUVAIS" })}
                    style={e.present && e.rating === "MAUVAIS" ? { background: "var(--red)", color: "#fff", borderColor: "var(--red)" } : undefined}
                  >
                    <Icon name="x" /> Pas bien
                  </button>
                </div>
              </div>
              {e.present && (
                <input
                  className="input mt"
                  placeholder="Note sur la séance (facultatif)…"
                  value={e.note}
                  onChange={(ev) => update(c.id, { note: ev.target.value })}
                />
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
