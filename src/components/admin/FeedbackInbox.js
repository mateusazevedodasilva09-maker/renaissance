"use client";

/**
 * Boîte de réception des feedbacks hebdomadaires des inscrits,
 * avec réponse du coach.
 */
import { useMemo, useState } from "react";
import Link from "next/link";

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

const fmt = (d) =>
  new Date(d).toLocaleString("fr-FR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

export default function FeedbackInbox({ initialFeedbacks }) {
  const [feedbacks, setFeedbacks] = useState(initialFeedbacks);
  const [onlyUnanswered, setOnlyUnanswered] = useState(false);
  const [replying, setReplying] = useState({}); // id -> texte en cours
  const [error, setError] = useState(null);

  const visible = useMemo(
    () => (onlyUnanswered ? feedbacks.filter((f) => !f.coachReply) : feedbacks),
    [feedbacks, onlyUnanswered]
  );
  const unanswered = feedbacks.filter((f) => !f.coachReply).length;

  async function reply(f) {
    try {
      const updated = await api(`/api/feedback/${f.id}`, "PATCH", { coachReply: replying[f.id] });
      setFeedbacks(feedbacks.map((x) => (x.id === f.id ? updated : x)));
      setReplying({ ...replying, [f.id]: undefined });
    } catch (err) { console.error(err);
      setError(err.message);
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Messages des inscrits</h1>
          <div className="subtitle">{feedbacks.length} feedback(s) · {unanswered} sans réponse.</div>
        </div>
        <label className="badge" style={{ cursor: "pointer", borderColor: onlyUnanswered ? "var(--accent)" : "var(--border)" }}>
          <input type="checkbox" checked={onlyUnanswered} onChange={() => setOnlyUnanswered(!onlyUnanswered)} style={{ marginRight: 6 }} />
          Sans réponse uniquement
        </label>
      </div>
      {error && <div className="alert alert-error" onClick={() => setError(null)}>{error}</div>}

      {visible.length === 0 && (
        <div className="card"><p className="muted">Aucun message.</p></div>
      )}

      {visible.map((f) => (
        <div key={f.id} className="card mb">
          <div className="flex-between wrap">
            <div>
              <strong>
                <Link href={`/admin/clients/${f.clientId}`}>
                  {f.client?.user?.firstName} {f.client?.user?.lastName}
                </Link>
              </strong>
              <span className="muted small"> · {f.client?.group?.name || "Sans groupe"} · reçu le {fmt(f.createdAt)}</span>
            </div>
            <span className="badge">
              <span className="dot" style={{ background: f.coachReply ? "var(--green)" : "var(--amber)" }} />
              {f.coachReply ? "Répondu" : "En attente"}
            </span>
          </div>
          <p className="mt" style={{ whiteSpace: "pre-wrap" }}>{f.content}</p>
          {f.coachReply ? (
            <div className="card" style={{ background: "var(--panel-2)", padding: 12 }}>
              <div className="muted small">Votre réponse · {f.repliedAt ? fmt(f.repliedAt) : ""}</div>
              <div style={{ whiteSpace: "pre-wrap" }}>{f.coachReply}</div>
            </div>
          ) : (
            <div className="flex wrap">
              <input
                className="input"
                style={{ flex: 1, minWidth: 220 }}
                placeholder="Répondre à ce message…"
                value={replying[f.id] || ""}
                onChange={(e) => setReplying({ ...replying, [f.id]: e.target.value })}
              />
              <button className="btn btn-primary btn-sm" disabled={!replying[f.id]?.trim()} onClick={() => reply(f)}>
                Envoyer
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
