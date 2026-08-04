/**
 * « Les personnes qui ont besoin de lui » — liste des clients du coach réunissant
 * au moins un signal d'attention, chacun avec ses motifs en badges. Données
 * produites par getClientsNeedingAttention (coach.service).
 */
import Link from "next/link";
import Icon from "@/components/Icon";

// Couleur/icône par type de motif — cohérent avec le design system.
const REASON_STYLE = {
  message: { color: "var(--blue)", icon: "message" },
  unrated: { color: "var(--amber)", icon: "clipboard" },
  onboarding: { color: "var(--violet)", icon: "user" },
  level: { color: "var(--red)", icon: "arrow-down" },
};

export default function AttentionList({ clients = [] }) {
  return (
    <section className="mb">
      <div className="flex-between wrap mb">
        <h2 style={{ margin: 0 }}>
          <Icon name="warning" size={20} /> Ils ont besoin de vous
        </h2>
        <span className="badge">
          <span className="dot" style={{ background: clients.length ? "var(--amber)" : "var(--green)" }} />
          {clients.length} à traiter
        </span>
      </div>

      {clients.length === 0 ? (
        <div className="card">
          <p className="muted" style={{ margin: 0 }}>
            <Icon name="check" /> Tout est à jour — aucun message en attente, séances notées, suivis complets.
          </p>
        </div>
      ) : (
        <div className="grid grid-2">
          {clients.map((c) => (
            <div key={c.id} className="card" style={{ padding: 16 }}>
              <div className="flex-between wrap" style={{ alignItems: "flex-start" }}>
                <div>
                  <strong>{c.name}</strong>
                  <div className="muted small">
                    {c.group?.name || "Sans groupe"} · niveau {c.level}/5
                  </div>
                </div>
                <Link href={`/coach/coaches/${c.id}`} className="btn btn-sm">
                  <Icon name="user" /> Fiche
                </Link>
              </div>
              <div className="flex wrap" style={{ gap: 6, marginTop: 10 }}>
                {c.reasons.map((r) => {
                  const s = REASON_STYLE[r.key] || { color: "var(--text-dim)", icon: "warning" };
                  const label = (
                    <>
                      <Icon name={s.icon} size={13} /> {r.label}{r.count ? ` (${r.count})` : ""}
                    </>
                  );
                  // Un motif « message » est cliquable : il ouvre directement
                  // l'historique des messages de ce participant.
                  return r.key === "message" ? (
                    <Link
                      key={r.key}
                      href={`/coach/coaches/${c.id}`}
                      className="badge"
                      style={{ borderColor: s.color, color: s.color, cursor: "pointer" }}
                    >
                      {label}
                    </Link>
                  ) : (
                    <span
                      key={r.key}
                      className="badge"
                      style={{ borderColor: s.color, color: s.color }}
                    >
                      {label}
                    </span>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
