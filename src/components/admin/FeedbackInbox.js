"use client";

/**
 * Messagerie coach/admin, en vue « participant → historique complet ».
 *  - Colonne gauche : la liste des participants (non-répondus d'abord), avec un
 *    aperçu du dernier message et le nombre en attente.
 *  - Colonne droite : dès qu'on clique un participant, tout l'historique de ses
 *    messages s'affiche (du plus ancien au plus récent), réponses incluses, avec
 *    une zone de réponse sur chaque message sans réponse.
 * `focusClientId` (venant d'un lien « ouvrir le message ») ouvre directement le
 * bon participant.
 */
import { useMemo, useState } from "react";
import Link from "next/link";
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

const fmt = (d) =>
  new Date(d).toLocaleString("fr-FR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

const nameOf = (c) => `${c?.user?.firstName || ""} ${c?.user?.lastName || ""}`.trim() || "Participant";

export default function FeedbackInbox({ initialFeedbacks, focusClientId = null }) {
  const [feedbacks, setFeedbacks] = useState(initialFeedbacks);
  const [onlyUnanswered, setOnlyUnanswered] = useState(false);
  const [replying, setReplying] = useState({}); // id -> texte en cours
  const [error, setError] = useState(null);

  // Regroupement par participant : un fil de discussion par client.
  const groups = useMemo(() => {
    const map = new Map();
    for (const f of feedbacks) {
      if (!map.has(f.clientId)) map.set(f.clientId, { clientId: f.clientId, client: f.client, items: [] });
      map.get(f.clientId).items.push(f);
    }
    const arr = [...map.values()].map((g) => {
      const items = [...g.items].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      const unanswered = items.filter((x) => !x.coachReply).length;
      return { ...g, items, unanswered, last: items[items.length - 1] };
    });
    arr.sort(
      (a, b) =>
        (b.unanswered > 0) - (a.unanswered > 0) ||
        new Date(b.last.createdAt) - new Date(a.last.createdAt)
    );
    return arr;
  }, [feedbacks]);

  const visibleGroups = onlyUnanswered ? groups.filter((g) => g.unanswered > 0) : groups;
  const totalUnanswered = groups.reduce((n, g) => n + g.unanswered, 0);

  // Participant ouvert : celui demandé par le lien, sinon le premier de la liste.
  const [selectedId, setSelectedId] = useState(
    focusClientId && groups.some((g) => g.clientId === focusClientId)
      ? focusClientId
      : groups[0]?.clientId || null
  );
  const selected = groups.find((g) => g.clientId === selectedId) || null;

  async function reply(f) {
    try {
      const updated = await api(`/api/feedback/${f.id}`, "PATCH", { coachReply: replying[f.id] });
      setFeedbacks(feedbacks.map((x) => (x.id === f.id ? { ...x, ...updated } : x)));
      setReplying({ ...replying, [f.id]: undefined });
    } catch (err) {
      console.error(err);
      setError("Impossible d'envoyer la réponse.");
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Messages des inscrits</h1>
          <div className="subtitle">
            {groups.length} participant(s) · {feedbacks.length} message(s) · {totalUnanswered} sans réponse.
          </div>
        </div>
        <label className="badge" style={{ cursor: "pointer", borderColor: onlyUnanswered ? "var(--accent)" : "var(--border)" }}>
          <input type="checkbox" checked={onlyUnanswered} onChange={() => setOnlyUnanswered(!onlyUnanswered)} style={{ marginRight: 6 }} />
          En attente uniquement
        </label>
      </div>
      {error && <div className="alert alert-error" onClick={() => setError(null)}>{error}</div>}

      {groups.length === 0 ? (
        <div className="card"><p className="muted" style={{ margin: 0 }}>Aucun message pour l&apos;instant.</p></div>
      ) : (
        <div className="messages-layout">
          {/* Liste des participants */}
          <div className="card" style={{ padding: 8, alignSelf: "start" }}>
            {visibleGroups.map((g) => {
              const active = g.clientId === selectedId;
              return (
                <button
                  key={g.clientId}
                  type="button"
                  onClick={() => setSelectedId(g.clientId)}
                  className="msg-participant"
                  style={{
                    background: active ? "var(--panel-2)" : "transparent",
                    borderColor: active ? "var(--border-strong)" : "transparent",
                  }}
                >
                  <div className="flex-between" style={{ gap: 8 }}>
                    <strong style={{ fontSize: 14 }}>{nameOf(g.client)}</strong>
                    {g.unanswered > 0 && (
                      <span className="dot" style={{ background: "var(--amber)" }} title={`${g.unanswered} sans réponse`} />
                    )}
                  </div>
                  <div className="muted small" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {g.last.content}
                  </div>
                  <div className="muted small" style={{ opacity: 0.7 }}>
                    {g.client?.group?.name || "Sans groupe"} · {fmt(g.last.createdAt)}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Historique complet du participant sélectionné */}
          <div>
            {selected ? (
              <>
                <div className="flex-between wrap mb">
                  <h2 style={{ margin: 0 }}>{nameOf(selected.client)}</h2>
                  <Link href={`/admin/clients/${selected.clientId}`} className="btn btn-sm">
                    <Icon name="user" /> Fiche
                  </Link>
                </div>
                {selected.items.map((f) => (
                  <div key={f.id} className="card mb">
                    <div className="flex-between wrap">
                      <span className="muted small">Reçu le {fmt(f.createdAt)}</span>
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
              </>
            ) : (
              <div className="card"><p className="muted" style={{ margin: 0 }}>Choisissez un participant à gauche.</p></div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
