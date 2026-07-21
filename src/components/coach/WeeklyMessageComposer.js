"use client";

/**
 * Composeur du « message de la semaine » (conseil du coach) pour l'un de ses
 * groupes. Enregistre via POST /api/advice (upsert sur la semaine en cours) et
 * affiche l'historique récent du groupe (GET /api/advice?groupId=).
 */
import { useEffect, useState } from "react";
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

// Lundi 00:00 de la semaine courante (même règle que src/lib/dates.js).
function mondayISO() {
  const d = new Date();
  const day = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

const fmtWeek = (d) =>
  new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });

export default function WeeklyMessageComposer({ groups = [] }) {
  const [groupId, setGroupId] = useState(groups[0]?.id || "");
  const [content, setContent] = useState("");
  const [history, setHistory] = useState([]);
  const [status, setStatus] = useState({ loading: false, error: null, ok: false });

  const thisWeek = mondayISO();
  const currentEntry = history.find((h) => new Date(h.weekStart).toISOString().slice(0, 10) === thisWeek);

  // À chaque changement de groupe : recharger l'historique et pré-remplir avec
  // le message de la semaine en cours s'il existe déjà (sinon champ vide).
  useEffect(() => {
    if (!groupId) return;
    let cancelled = false;
    setStatus({ loading: false, error: null, ok: false });
    api(`/api/advice?groupId=${groupId}`, "GET")
      .then((rows) => {
        if (cancelled) return;
        setHistory(rows);
        const cur = rows.find((h) => new Date(h.weekStart).toISOString().slice(0, 10) === thisWeek);
        setContent(cur?.content || "");
      })
      .catch((e) => !cancelled && setStatus({ loading: false, error: e.message, ok: false }));
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId]);

  async function submit(e) {
    e.preventDefault();
    if (!content.trim()) return;
    setStatus({ loading: true, error: null, ok: false });
    try {
      await api("/api/advice", "POST", { content, groupId });
      const rows = await api(`/api/advice?groupId=${groupId}`, "GET");
      setHistory(rows);
      setStatus({ loading: false, error: null, ok: true });
    } catch (err) {
      setStatus({ loading: false, error: err.message, ok: false });
    }
  }

  if (groups.length === 0) {
    return (
      <div className="card">
        <p className="muted" style={{ margin: 0 }}>Aucun groupe attribué : pas de message à envoyer.</p>
      </div>
    );
  }

  return (
    <div className="card">
      <h3><Icon name="bulb" /> Le message de la semaine</h3>
      <p className="muted small">
        Un mot adressé à tout le groupe pour la semaine en cours. Vos clients le voient en tête de leur espace.
      </p>

      <form onSubmit={submit}>
        <div className="form-row mb">
          <div className="field" style={{ margin: 0 }}>
            <label className="small">Groupe</label>
            <select className="input" value={groupId} onChange={(e) => setGroupId(e.target.value)}>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </div>
        </div>

        {status.error && <div className="alert alert-error" onClick={() => setStatus({ ...status, error: null })}>{status.error}</div>}
        {status.ok && <div className="alert alert-success">Message enregistré pour la semaine du {fmtWeek(thisWeek)}.</div>}

        <div className="field">
          <label className="small">
            {currentEntry ? "Modifier le message de cette semaine" : "Rédiger le message de cette semaine"}
          </label>
          <textarea
            className="input"
            rows={4}
            placeholder="Ex. : cette semaine, on soigne la technique sur les squats. Pensez à bien vous hydrater entre les séries."
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
        </div>
        <button className="btn btn-primary" disabled={status.loading || !content.trim()}>
          <Icon name="send" /> {status.loading ? "Enregistrement…" : "Envoyer au groupe"}
        </button>
      </form>

      {history.length > 0 && (
        <div className="mt">
          <div className="section-label" style={{ paddingLeft: 0 }}>Historique</div>
          {history.map((h) => {
            const isCurrent = new Date(h.weekStart).toISOString().slice(0, 10) === thisWeek;
            return (
              <div key={h.id} style={{ padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
                <div className="flex-between wrap">
                  <span className="muted small">Semaine du {fmtWeek(h.weekStart)}</span>
                  {isCurrent && <span className="badge" style={{ borderColor: "var(--accent)", color: "var(--accent)" }}>en cours</span>}
                </div>
                <div style={{ whiteSpace: "pre-wrap" }}>{h.content}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
