"use client";

/**
 * Filet de sécurité de l'espace client (même convention Next.js que
 * src/app/admin/error.js : intercepte les erreurs des pages du segment).
 *
 * Côté client final, on reste rassurant : message simple, détail technique
 * replié dans un bloc <details> pour ne pas effrayer, bouton pour réessayer.
 */
import Link from "next/link";
import Icon from "@/components/Icon";

export default function EspaceError({ error, reset }) {
  return (
    <div className="card" style={{ maxWidth: 620, margin: "40px auto" }}>
      <h2>
        <Icon name="warning" /> Oups, un petit souci
      </h2>
      <p className="muted">
        Cette page n&apos;a pas pu se charger. Réessayez — si le problème
        persiste, prévenez votre coach.
      </p>

      {/* Détail technique replié : utile au coach/admin pour le diagnostic. */}
      <details className="mb">
        <summary className="muted small" style={{ cursor: "pointer" }}>
          Détail technique
        </summary>
        <pre
          style={{
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            fontSize: 12,
            background: "var(--bg)",
            border: "1px solid var(--border)",
            borderRadius: 10,
            padding: 12,
            maxHeight: 240,
            overflowY: "auto",
          }}
        >
          {error?.message || String(error)}
        </pre>
      </details>

      <div className="flex">
        <button className="btn btn-primary" onClick={() => reset()}>
          Réessayer
        </button>
        <Link href="/espace" className="btn">
          <Icon name="arrow-left" /> Mes séances
        </Link>
      </div>
    </div>
  );
}
