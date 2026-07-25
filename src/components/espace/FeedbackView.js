"use client";

/**
 * Espace d'échange hebdomadaire avec le coach :
 * - le client envoie son ressenti de la semaine ;
 * - le coach répond depuis son espace, la réponse s'affiche ici.
 */
import { useState } from "react";
import Icon from "@/components/Icon";

const fmtDate = (d) =>
  new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });

export default function FeedbackView({ initialFeedbacks = [] }) {
  const [feedbacks, setFeedbacks] = useState(initialFeedbacks);
  const [content, setContent] = useState("");
  const [msg, setMsg] = useState(null);
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setMsg(null);
    setLoading(true);
    try {
      const res = await fetch("/api/me/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error);
      setFeedbacks([json.data, ...feedbacks]);
      setContent("");
      setMsg({ type: "success", text: "✓ Message envoyé à votre coach !" });
    } catch (err) { console.error(err);
      setMsg({ type: "error", text: err.message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Mon coach</h1>
          <div className="subtitle">
            Partagez votre ressenti de la semaine : forme, difficultés, questions…
          </div>
        </div>
      </div>

      <div className="card mb">
        <h3><Icon name="message" /> Mon message de la semaine</h3>
        {msg && (
          <div className={`alert alert-${msg.type === "success" ? "success" : "error"}`}>
            {msg.text}
          </div>
        )}
        <form onSubmit={submit}>
          <textarea
            className="input"
            rows={4}
            placeholder="Ex. : bonne semaine, mais j'ai eu du mal sur le squat vendredi…"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            required
          />
          <button className="btn btn-primary mt" disabled={loading}>
            {loading ? "Envoi en cours…" : "Envoyer à mon coach"}
          </button>
        </form>
      </div>

      <div className="card">
        <h3><Icon name="clipboard" /> Mes échanges</h3>
        {feedbacks.length === 0 && (
          <p className="muted">Pas encore de message. Lancez-vous, votre coach vous lit !</p>
        )}
        <ul className="timeline">
          {feedbacks.map((f) => (
            <li key={f.id}>
              <div className="when">{fmtDate(f.createdAt)}</div>
              <div style={{ whiteSpace: "pre-wrap" }}>{f.content}</div>
              {f.coachReply ? (
                <div
                  className="mt"
                  style={{
                    borderLeft: "3px solid var(--accent)",
                    paddingLeft: 12,
                    background: "var(--accent-soft)",
                    borderRadius: 8,
                    padding: "10px 12px",
                  }}
                >
                  <div className="muted small mb" style={{ marginBottom: 4 }}>
                    Réponse de votre coach
                  </div>
                  <div style={{ whiteSpace: "pre-wrap" }}>{f.coachReply}</div>
                </div>
              ) : (
                <div className="muted small mt">En attente de réponse…</div>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
