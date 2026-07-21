/**
 * Cockpit coach « qui a besoin de moi » — l'écran des 2 minutes du matin.
 * Remonte les clients à risque (absence, plateau, énergie basse, suivi
 * décroché, échéance proche, message sans réponse) avec action rapide.
 */
import Link from "next/link";
import { getSession } from "@/lib/session";
import { getClientsAtRisk } from "@/modules/tracking/cockpit.service";
import Icon from "@/components/Icon";

export const dynamic = "force-dynamic";

// Couleur d'affichage par gravité de signal.
const SEVERITY_COLOR = { high: "var(--red)", medium: "var(--amber)" };

export default async function CockpitPage() {
  const session = await getSession();
  const coachUserId = session?.role === "COACH" ? session.userId : null;
  const { atRisk, totalClients } = await getClientsAtRisk({ coachUserId });

  return (
    <div>
      <div className="page-header">
        <div>
          <h1><Icon name="heart" /> Qui a besoin de moi</h1>
          <div className="subtitle">
            {atRisk.length === 0
              ? `Tout va bien : aucun signal sur ${totalClients} client(s) actif(s).`
              : `${atRisk.length} client(s) sur ${totalClients} demandent votre attention.`}
          </div>
        </div>
        <Link href="/admin/messages" className="btn"><Icon name="message" /> Messages</Link>
      </div>

      {atRisk.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: 40 }}>
          <p style={{ fontSize: 40, margin: 0 }}>💪</p>
          <p className="muted">Aucun client à risque aujourd&apos;hui. Continuez comme ça !</p>
        </div>
      ) : (
        <div className="grid grid-2">
          {atRisk.map((c) => (
            <div key={c.id} className="card">
              <div className="flex-between wrap mb">
                <h3 style={{ margin: 0 }}>
                  {c.firstName} {c.lastName}
                  {c.groupName && <span className="muted small" style={{ fontWeight: 400, marginLeft: 8 }}>{c.groupName}</span>}
                </h3>
                {/* Action rapide : la fiche complète à un clic. */}
                <Link href={`/admin/clients/${c.id}`} className="btn btn-sm btn-primary">Ouvrir la fiche</Link>
              </div>
              <div style={{ display: "grid", gap: 8 }}>
                {c.alerts.map((a) => (
                  <div key={a.key} className="flex" style={{ alignItems: "baseline", gap: 8 }}>
                    {/* Pastille de gravité (le style .dot global ne s'applique que dans un badge). */}
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: SEVERITY_COLOR[a.severity], flexShrink: 0 }} />
                    <div>
                      <strong><Icon name={a.icon} /> {a.label}</strong>
                      {a.detail && <div className="muted small">{a.detail}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
