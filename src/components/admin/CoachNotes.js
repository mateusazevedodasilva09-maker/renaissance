"use client";

/**
 * Carnet de notes privé du coach (fiche client).
 *
 * Notes datées, épinglables, jamais visibles côté client : c'est la mémoire
 * du suivi personnalisé, même à 40 clients. Les notes épinglées restent en
 * tête de liste (ex. « genou fragile — pas de squat profond »).
 */
import { useState } from "react";
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

const fmtDateTime = (d) =>
  new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });

// Tri d'affichage : épinglées d'abord, puis de la plus récente à la plus ancienne.
const sortNotes = (notes) =>
  [...notes].sort((a, b) => (b.isPinned - a.isPinned) || (new Date(b.createdAt) - new Date(a.createdAt)));

export default function CoachNotes({ client, onUpdate }) {
  const [content, setContent] = useState("");
  const [error, setError] = useState(null);
  const notes = client.coachNotes || [];

  async function add(e) {
    e.preventDefault();
    try {
      const note = await api(`/api/clients/${client.id}/notes`, "POST", { content });
      onUpdate({ coachNotes: sortNotes([note, ...notes]) });
      setContent("");
      setError(null);
    } catch (err) {
      setError(err.message);
    }
  }

  async function togglePin(note) {
    try {
      const updated = await api(`/api/notes/${note.id}`, "PATCH", { isPinned: !note.isPinned });
      onUpdate({ coachNotes: sortNotes(notes.map((n) => (n.id === note.id ? updated : n))) });
    } catch (err) {
      setError(err.message);
    }
  }

  async function remove(note) {
    if (!window.confirm("Supprimer cette note ?")) return;
    try {
      await api(`/api/notes/${note.id}`, "DELETE");
      onUpdate({ coachNotes: notes.filter((n) => n.id !== note.id) });
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="card">
      <h3><Icon name="note" /> Carnet de notes privé</h3>
      <p className="muted small">Visible uniquement par vous et les coachs — jamais par le client.</p>
      {error && <div className="alert alert-error" onClick={() => setError(null)}>{error}</div>}

      <form onSubmit={add} className="mb">
        <div className="field">
          <textarea
            className="input"
            rows={2}
            required
            placeholder="Ex. : genou droit sensible cette semaine — remplacer les fentes…"
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
        </div>
        <button className="btn btn-primary btn-sm">Ajouter la note</button>
      </form>

      {notes.length === 0 ? (
        <p className="muted">Aucune note pour l&apos;instant.</p>
      ) : (
        <div style={{ display: "grid", gap: 8, maxHeight: 320, overflowY: "auto" }}>
          {notes.map((n) => (
            <div
              key={n.id}
              style={{
                padding: "8px 10px",
                borderRadius: 8,
                border: "1px solid var(--border)",
                background: n.isPinned ? "var(--accent-soft)" : "var(--bg-soft)",
              }}
            >
              <div className="flex-between" style={{ gap: 8 }}>
                <span style={{ whiteSpace: "pre-wrap" }}>{n.content}</span>
                <span className="flex" style={{ gap: 4, flexShrink: 0 }}>
                  <button
                    className="btn btn-sm"
                    title={n.isPinned ? "Désépingler" : "Épingler en haut"}
                    style={n.isPinned ? { borderColor: "var(--accent)" } : undefined}
                    onClick={() => togglePin(n)}
                  >
                    <Icon name="pin" />
                  </button>
                  <button className="btn btn-sm btn-danger" title="Supprimer" onClick={() => remove(n)}>
                    <Icon name="x" />
                  </button>
                </span>
              </div>
              <div className="muted small" style={{ marginTop: 4 }}>
                {fmtDateTime(n.createdAt)}
                {n.author && <> · {n.author.firstName} {n.author.lastName}</>}
                {n.isPinned && <> · <Icon name="pin" size={12} /> épinglée</>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
