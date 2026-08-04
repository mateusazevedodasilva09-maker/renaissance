/**
 * Accueil de l'espace coach : « Mes coachés » — tous les clients des groupes
 * dont il est le coach, avec accès à leur fiche complète.
 *
 * Encapsulation : un COACH est borné à lui-même ; un ADMIN peut observer un
 * coach donné via ?coach=, la donnée restant bornée à ce coach.
 */
import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/session";
import { listCoaches, getCoachDashboard } from "@/modules/coach/coach.service";
import CoachPicker from "@/components/coach/CoachPicker";
import Icon from "@/components/Icon";

export const dynamic = "force-dynamic";

export default async function CoachHomePage({ searchParams }) {
  const session = await getSession();
  if (!session || (session.role !== "ADMIN" && session.role !== "COACH")) {
    redirect("/connexion");
  }

  const isAdmin = session.role === "ADMIN";
  const coaches = isAdmin ? await listCoaches() : [];
  const selectedCoachId = isAdmin ? (searchParams?.coach || coaches[0]?.id || null) : session.userId;
  const q = isAdmin && selectedCoachId ? `?coach=${selectedCoachId}` : "";

  const { groups } = selectedCoachId ? await getCoachDashboard(selectedCoachId) : { groups: [] };
  // Liste plate des coachés (dédupliquée), triée par nom.
  const seen = new Set();
  const clients = [];
  for (const g of groups) {
    for (const c of g.clients) {
      if (seen.has(c.id)) continue;
      seen.add(c.id);
      clients.push({ ...c, groupName: g.name });
    }
  }
  clients.sort((a, b) => (a.user.firstName + a.user.lastName).localeCompare(b.user.firstName + b.user.lastName));

  const firstName = session.name ? session.name.split(" ")[0] : null;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Mes coachés</h1>
          <div className="subtitle">
            {clients.length} personne{clients.length > 1 ? "s" : ""} que vous accompagnez
            {firstName && !isAdmin ? ` — bonjour ${firstName}` : ""}.
          </div>
        </div>
        {isAdmin && <CoachPicker coaches={JSON.parse(JSON.stringify(coaches))} selectedCoachId={selectedCoachId} />}
      </div>

      {clients.length === 0 ? (
        <div className="card"><p className="muted" style={{ margin: 0 }}>Aucun coaché pour l&apos;instant.</p></div>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          <table className="table">
            <thead>
              <tr><th>Nom</th><th>Groupe</th><th>Niveau</th><th></th></tr>
            </thead>
            <tbody>
              {clients.map((c) => (
                <tr key={c.id}>
                  <td><strong>{c.user.firstName} {c.user.lastName}</strong></td>
                  <td className="muted">{c.groupName || "—"}</td>
                  <td><span className="badge">Niveau {c.level ?? 1} / 5</span></td>
                  <td style={{ textAlign: "right" }}>
                    <Link href={`/coach/coaches/${c.id}${q}`} className="btn btn-sm btn-primary">
                      <Icon name="eye" /> Ouvrir la fiche
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
