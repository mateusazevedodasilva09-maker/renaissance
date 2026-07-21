/**
 * Mes groupes (espace coach) : ses groupes d'entraînement avec leurs inscrits,
 * et le composeur du « message de la semaine ». Un ADMIN qui observe un coach
 * (?coach=) voit les groupes de CE coach.
 */
import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/session";
import { listGroupsForCoach } from "@/modules/clients/group.service";
import { listCoaches } from "@/modules/coach/coach.service";
import WeeklyMessageComposer from "@/components/coach/WeeklyMessageComposer";
import Icon from "@/components/Icon";

export const dynamic = "force-dynamic";

export default async function CoachGroupesPage({ searchParams }) {
  const session = await getSession();
  if (!session || (session.role !== "ADMIN" && session.role !== "COACH")) {
    redirect("/connexion");
  }

  const isAdmin = session.role === "ADMIN";
  const coaches = isAdmin ? await listCoaches() : [];
  const targetCoachId = isAdmin ? (searchParams?.coach || coaches[0]?.id || null) : session.userId;
  const groups = targetCoachId ? await listGroupsForCoach(targetCoachId) : [];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Mes groupes</h1>
          <div className="subtitle">Vos groupes d&apos;entraînement et le message de la semaine.</div>
        </div>
      </div>

      <div className="grid grid-2">
        <WeeklyMessageComposer groups={JSON.parse(JSON.stringify(groups.map((g) => ({ id: g.id, name: g.name }))))} />

        <div className="card">
          <h3><Icon name="users" /> Effectifs</h3>
          {groups.length === 0 ? (
            <p className="muted">Aucun groupe attribué pour l&apos;instant.</p>
          ) : (
            groups.map((g) => (
              <div key={g.id} className="mb">
                <div className="flex-between wrap" style={{ borderBottom: "1px solid var(--border)", paddingBottom: 6, marginBottom: 8 }}>
                  <strong>{g.name}</strong>
                  <span className="flex" style={{ gap: 6 }}>
                    {g.goal && <span className="badge"><Icon name="target" /> {g.goal.label}</span>}
                    <span className="badge">{g._count?.clients ?? g.clients.length}/{g.capacity}</span>
                  </span>
                </div>
                {g.clients.length === 0 ? (
                  <p className="muted small">Aucun inscrit actif.</p>
                ) : (
                  <div className="flex wrap" style={{ gap: 6 }}>
                    {g.clients.map((c) => (
                      <Link key={c.id} href={`/admin/clients/${c.id}`} className="badge" style={{ cursor: "pointer" }}>
                        {c.user.firstName} {c.user.lastName}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
