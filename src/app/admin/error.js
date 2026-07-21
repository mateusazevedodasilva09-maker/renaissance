"use client";

/**
 * Filet de sécurité de la zone /admin (convention Next.js App Router :
 * un fichier `error.js` dans un segment intercepte toute erreur levée par
 * les pages de ce segment et de ses sous-segments).
 *
 * Rôle :
 * - éviter l'écran d'erreur brut ("Unhandled Runtime Error") côté admin ;
 * - afficher le détail technique complet de l'erreur pour pouvoir la
 *   diagnostiquer (le texte est sélectionnable / copiable) ;
 * - proposer de réessayer (`reset()` relance le rendu du segment) ou de
 *   revenir au tableau de bord.
 *
 * Ce composant est volontairement autonome (aucune dépendance aux services) :
 * en cas de panne de la couche données, il doit toujours pouvoir s'afficher.
 */
import Link from "next/link";
import Icon from "@/components/Icon";

export default function AdminError({ error, reset }) {
  return (
    <div className="card" style={{ maxWidth: 720, margin: "40px auto" }}>
      <h2>
        <Icon name="warning" /> Une erreur est survenue
      </h2>
      <p className="muted">
        Quelque chose s&apos;est mal passé en chargeant cette page. Le détail
        technique ci-dessous permet d&apos;identifier la cause — vous pouvez le
        copier et l&apos;envoyer tel quel.
      </p>

      {/* Détail technique complet : c'est la partie utile au diagnostic. */}
      <pre
        style={{
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          fontSize: 12,
          lineHeight: 1.5,
          background: "var(--bg)",
          border: "1px solid var(--border)",
          borderRadius: 10,
          padding: 14,
          maxHeight: 320,
          overflowY: "auto",
        }}
      >
        {error?.message || String(error)}
      </pre>

      <div className="flex mt">
        <button className="btn btn-primary" onClick={() => reset()}>
          Réessayer
        </button>
        <Link href="/admin" className="btn">
          <Icon name="arrow-left" /> Retour au tableau de bord
        </Link>
      </div>
    </div>
  );
}
