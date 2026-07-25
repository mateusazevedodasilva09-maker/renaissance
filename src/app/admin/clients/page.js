/**
 * Liste des clients inscrits.
 * L'admin voit tout le monde ; le coach ne voit que les membres de ses groupes.
 */
import Link from "next/link";
import { getSession } from "@/lib/session";
import { listClients } from "@/modules/clients/client.service";
import { listCoaches } from "@/modules/coach/coach.service";
import { formatDate } from "@/lib/dates";
import SoloClientButton from "@/components/admin/SoloClientButton";

export const dynamic = "force-dynamic";

export default async function ClientsPage() {
  const session = await getSession();
  const isCoach = session?.role === "COACH";
  const clients = await listClients(isCoach ? { coachUserId: session.userId } : {});
  // Liste des coachs pour l'ajout d'un client 1v1 (réservé à l'admin).
  const coaches = isCoach ? [] : await listCoaches();

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>{isCoach ? "Mes clients" : "Clients inscrits"}</h1>
          <div className="subtitle">
            {isCoach
              ? "Les membres de vos groupes. Consultez leur profil, programme et suivi."
              : "Les prospects convertis. Gérez leur espace : objectifs, programme, suivi."}
          </div>
        </div>
        {!isCoach && <SoloClientButton coaches={JSON.parse(JSON.stringify(coaches))} />}
      </div>

      <div className="card">
        {clients.length === 0 ? (
          <p className="muted">
            {isCoach
              ? "Aucun client dans vos groupes pour l'instant. L'admin peut vous assigner un groupe depuis « Groupes »."
              : "Aucun client pour l'instant. Convertissez un prospect depuis sa fiche CRM (statut « Payé / Inscrit »)."}
          </p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Client</th>
                <th>Contact</th>
                <th>Objectifs</th>
                <th>Groupe</th>
                <th>Inscrit le</th>
                <th>Statut</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {clients.map((c) => (
                <tr key={c.id}>
                  <td style={{ fontWeight: 600 }}>{c.user.firstName} {c.user.lastName}</td>
                  <td className="muted">{c.user.email}<br />{c.user.phone}</td>
                  <td>
                    {c.goals.map((g) => (
                      <span key={g.goal.id} className="badge" style={{ marginRight: 4 }}>{g.goal.label}</span>
                    ))}
                  </td>
                  <td className="muted">{c.group ? c.group.name : "—"}</td>
                  <td>{formatDate(c.joinedAt)}</td>
                  <td>
                    <span className="badge">
                      <span className="dot" style={{ background: c.isActive ? "var(--green)" : "var(--red)" }} />
                      {c.isActive ? "Actif" : "Inactif"}
                    </span>
                  </td>
                  <td><Link className="btn btn-sm" href={`/admin/clients/${c.id}`}>Gérer →</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
