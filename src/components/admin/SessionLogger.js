"use client";

/**
 * Logging de performance en séance (vue tablette du coach).
 *
 * Déroulé pensé pour le studio :
 *   1. le coach tape sur le client qui vient de finir sa série ;
 *   2. la séance du jour de son programme s'affiche, exercices pré-remplis ;
 *   3. il saisit charge × reps (+ RPE optionnel) → « OK » → série enregistrée.
 *
 * La dernière performance connue sur chaque exercice est rappelée sous le nom
 * (« Dernière fois : 40 kg × 10 ») pour charger juste. Les PR sont détectés
 * automatiquement côté serveur. Boutons volontairement larges : usage tactile.
 */
import { useEffect, useMemo, useState } from "react";
import { WEEKDAY_LABELS } from "@/lib/dates";
import ExerciseThumb from "@/components/ExerciseThumb";
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

const todayISO = () => new Date().toISOString().slice(0, 10);

export default function SessionLogger({ clients, todaySlots, todayKey }) {
  const [selectedId, setSelectedId] = useState(null);
  const [error, setError] = useState(null);

  const dateLabel = new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });

  // Clusters : les personnes d'un même groupe s'entraînent dans la même séance.
  // On regroupe donc les clients par groupe (objectif commun), un cluster à part
  // pour les éventuels clients sans groupe.
  const clusters = useMemo(() => {
    const map = new Map();
    for (const c of clients) {
      const key = c.group?.id || "none";
      if (!map.has(key)) map.set(key, { group: c.group || null, members: [] });
      map.get(key).members.push(c);
    }
    return [...map.values()];
  }, [clients]);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1><Icon name="flame" /> Séance du jour</h1>
          <div className="subtitle" style={{ textTransform: "capitalize" }}>{dateLabel}</div>
        </div>
      </div>

      {/* Créneaux du jour : simple rappel visuel du planning. */}
      {todaySlots.length > 0 && (
        <div className="flex wrap mb">
          {todaySlots.map((s) => (
            <span key={s.id} className="badge">
              <span className="dot" style={{ background: s.sessionType?.color || "var(--accent)" }} />
              {s.startTime} – {s.endTime} · {s.sessionType?.name}{s.location ? ` · ${s.location}` : ""}
            </span>
          ))}
        </div>
      )}

      {error && <div className="alert alert-error" onClick={() => setError(null)}>{error}</div>}

      {/* Sélection du client, regroupée par cluster (séance / groupe commun).
          Gros boutons pensés pour la tablette. */}
      {clients.length === 0 ? (
        <p className="muted">Aucun client actif.</p>
      ) : (
        <div className="mb" style={{ display: "grid", gap: 14 }}>
          {clusters.map((cl) => (
            <div key={cl.group?.id || "none"}>
              <div className="section-label" style={{ marginTop: 0 }}>
                {cl.group ? cl.group.name : "Sans groupe"}
                {cl.group?.goal && <span className="muted"> · {cl.group.goal.label}</span>}
                <span className="muted"> · {cl.members.length} pers.</span>
              </div>
              <div className="flex wrap" style={{ gap: 8 }}>
                {cl.members.map((c) => (
                  <button
                    key={c.id}
                    className={`btn${selectedId === c.id ? " btn-primary" : ""}`}
                    style={{ padding: "12px 18px", fontSize: 15 }}
                    onClick={() => setSelectedId(selectedId === c.id ? null : c.id)}
                  >
                    {c.user.firstName} {c.user.lastName}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedId && (
        <ClientLogger
          key={selectedId}
          clientId={selectedId}
          todayKey={todayKey}
          todaySlots={todaySlots}
          onError={setError}
        />
      )}
    </div>
  );
}

/* --- Saisie pour un client ----------------------------------------------------------- */

function ClientLogger({ clientId, todayKey, todaySlots, onError }) {
  const [client, setClient] = useState(null); // fiche complète, chargée à la demande
  const [sessionId, setSessionId] = useState(null);
  const [attendanceMarked, setAttendanceMarked] = useState(false);

  // Charge la fiche complète (programme + historique de force) au moment où
  // le coach sélectionne le client — la liste initiale reste légère.
  useEffect(() => {
    api(`/api/clients/${clientId}`, "GET")
      .then((data) => {
        setClient(data);
        const program = data.programs?.find((p) => p.status === "ACTIVE");
        // Séance par défaut : celle prévue aujourd'hui, sinon la première.
        const todaySession = program?.sessions?.find((s) => s.weekday === todayKey);
        setSessionId((todaySession || program?.sessions?.[0])?.id || null);
      })
      .catch((err) => onError(err.message));
  }, [clientId, todayKey, onError]);

  if (!client) return <p className="muted">Chargement…</p>;

  const program = client.programs?.find((p) => p.status === "ACTIVE");
  const session = program?.sessions?.find((s) => s.id === sessionId);

  async function markAttendance(present) {
    try {
      await api(`/api/clients/${clientId}/attendance`, "POST", {
        date: todayISO(),
        present,
        label: session?.name || todaySlots[0]?.sessionType?.name || "Séance",
      });
      setAttendanceMarked(true);
    } catch (err) {
      onError(err.message);
    }
  }

  return (
    <div className="card">
      <div className="flex-between wrap mb">
        <h3 style={{ margin: 0 }}>
          {client.user.firstName} {client.user.lastName}
        </h3>
        <div className="flex wrap">
          {/* Présence en un tap. */}
          {attendanceMarked ? (
            <span className="badge"><Icon name="check" /> Présence enregistrée</span>
          ) : (
            <>
              <button className="btn btn-sm" onClick={() => markAttendance(true)}><Icon name="check" /> Présent</button>
              <button className="btn btn-sm" onClick={() => markAttendance(false)}><Icon name="x" /> Absent</button>
            </>
          )}
          {/* Changement de séance si le client ne suit pas celle du jour. */}
          {program?.sessions?.length > 1 && (
            <select className="input" style={{ width: "auto" }} value={sessionId || ""} onChange={(e) => setSessionId(e.target.value)}>
              {program.sessions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}{s.weekday ? ` (${WEEKDAY_LABELS[s.weekday]})` : ""}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Sécurité : blessures du bilan initial toujours visibles en séance. */}
      {client.injuries && (
        <div className="alert" style={{ border: "1px solid var(--amber)", marginBottom: 10 }}>
          <Icon name="warning" /> {client.injuries}
        </div>
      )}

      {!session ? (
        <p className="muted">Pas de programme actif — la saisie libre reste possible depuis la fiche client.</p>
      ) : (
        <div>
          {session.exercises.map((item) => (
            <ExerciseLogRow
              key={item.id}
              clientId={clientId}
              item={item}
              history={(client.strengthLogs || []).filter((l) => l.exerciseId === item.exerciseId)}
              onError={onError}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* --- Une ligne = un exercice de la séance --------------------------------------------- */

function ExerciseLogRow({ clientId, item, history, onError }) {
  // Pré-remplissage intelligent : la dernière charge connue sur cet exercice.
  const last = history.length > 0 ? history[history.length - 1] : null;
  const [form, setForm] = useState({ weightKg: last ? String(last.weightKg) : "", reps: "", rpe: "" });
  const [saved, setSaved] = useState([]); // séries enregistrées pendant cette séance
  const [saving, setSaving] = useState(false);

  const lastLabel = useMemo(() => {
    if (!last) return null;
    const d = new Date(last.date).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
    return `Dernière fois (${d}) : ${last.weightKg} kg × ${last.reps}${last.rpe ? ` @ RPE ${last.rpe}` : ""}`;
  }, [last]);

  async function save() {
    if (!form.weightKg || !form.reps) return;
    setSaving(true);
    try {
      const log = await api(`/api/clients/${clientId}/strength-logs`, "POST", {
        exerciseId: item.exerciseId,
        date: todayISO(),
        weightKg: form.weightKg,
        reps: form.reps,
        rpe: form.rpe || null,
      });
      // La charge reste pré-remplie pour la série suivante ; reps/RPE se vident.
      setSaved([...saved, log]);
      setForm({ ...form, reps: "", rpe: "" });
    } catch (err) {
      onError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mb" style={{ padding: "10px 0", borderTop: "1px solid var(--border)" }}>
      <div className="flex wrap" style={{ alignItems: "center", gap: 10 }}>
        <ExerciseThumb exercise={item.exercise} size={44} />
        <div style={{ flex: 1, minWidth: 150 }}>
          <strong>{item.exercise.name}</strong>
          <div className="muted small">
            Objectif : {item.sets} × {item.reps}{item.restSec ? ` · repos ${item.restSec}s` : ""}{item.notes ? ` · ${item.notes}` : ""}
          </div>
          {lastLabel && <div className="muted small">{lastLabel}</div>}
        </div>
        {/* Saisie tactile : 3 champs + OK. */}
        <div className="flex" style={{ gap: 6, alignItems: "center" }}>
          <input className="input" style={{ width: 92 }} type="number" step="0.5" min="0" inputMode="decimal" placeholder="kg" value={form.weightKg} onChange={(e) => setForm({ ...form, weightKg: e.target.value })} />
          <span className="muted">×</span>
          <input className="input" style={{ width: 76 }} type="number" min="1" inputMode="numeric" placeholder="reps" value={form.reps} onChange={(e) => setForm({ ...form, reps: e.target.value })} />
          <select className="input" style={{ width: 86 }} value={form.rpe} onChange={(e) => setForm({ ...form, rpe: e.target.value })} title="Effort ressenti (RPE)">
            <option value="">RPE</option>
            {[5, 6, 7, 8, 9, 10].map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
          <button className="btn btn-primary" style={{ padding: "10px 16px" }} disabled={saving || !form.weightKg || !form.reps} onClick={save}>
            {saving ? "…" : "OK"}
          </button>
        </div>
      </div>
      {/* Séries enregistrées pendant cette séance. */}
      {saved.length > 0 && (
        <div className="flex wrap mt" style={{ gap: 6 }}>
          {saved.map((l) => (
            <span key={l.id} className="badge">
              {l.weightKg} kg × {l.reps}{l.rpe ? ` @ ${l.rpe}` : ""} {l.isPR && <Icon name="trophy" />}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
