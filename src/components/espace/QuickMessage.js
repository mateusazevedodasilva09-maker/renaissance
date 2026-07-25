"use client";

/**
 * Envoi rapide d'un message au coach, directement depuis l'accueil de l'espace
 * client (raccourci vers la messagerie « Mon coach », qui garde l'historique).
 * Poste sur /api/me/feedback, comme FeedbackView.
 */
import { useState } from "react";
import Link from "next/link";
import Icon from "@/components/Icon";

export default function QuickMessage() {
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
      setContent("");
      setMsg({ type: "success", text: "Message envoyé à votre coach." });
    } catch (err) { console.error(err);
      setMsg({ type: "error", text: err.message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card mb">
      <div className="flex-between wrap mb">
        <h3 style={{ margin: 0 }}><Icon name="message" /> Un mot à votre coach</h3>
        <Link href="/espace/feedback" className="btn btn-sm">Voir mes échanges</Link>
      </div>
      {msg && (
        <div className={`alert alert-${msg.type === "success" ? "success" : "error"}`}>{msg.text}</div>
      )}
      <form onSubmit={submit} className="flex wrap" style={{ gap: 8 }}>
        <input
          className="input"
          style={{ flex: 1, minWidth: 220 }}
          placeholder="Une question, un ressenti à partager…"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          required
        />
        <button className="btn btn-primary" disabled={loading || !content.trim()}>
          <Icon name="send" /> {loading ? "Envoi…" : "Envoyer"}
        </button>
      </form>
    </div>
  );
}
