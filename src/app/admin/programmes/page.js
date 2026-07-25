/**
 * Programmes — espace de création (haut) + liste de tous les programmes (bas).
 *  - En haut : le coach/admin choisit un client et construit son programme à la
 *    main (jours + exercices via la silhouette, modèles réutilisables).
 *  - En bas : la liste des programmes existants. Un coach ne voit que ceux de
 *    ses propres clients (encapsulation).
 */
import Link from "next/link";
import { getSession } from "@/lib/session";
import { listAllPrograms, listExercises } from "@/modules/programs/program.service";
import { listClients } from "@/modules/clients/client.service";
import { formatDate } from "@/lib/dates";
import Icon from "@/components/Icon";
import ProgramBuilder from "@/components/admin/ProgramBuilder";

export const dynamic = "force-dynamic";

const STATUS = {
  ACTIVE: { label: "Actif", color: "var(--green)" },
  DRAFT: { label: "Brouillon", color: "var(--amber)" },
  ARCHIVED: { label: "Archivé", color: "var(--text-dim)" },
};

export default async function ProgrammesPage() {
  const session = await getSession();
  const isCoach = session?.role === "COACH";

  const [allPrograms, clientsRaw, exercises] = await Promise.all([
    listAllPrograms(),
    listClients({ activeOnly: true, ...(isCoach ? { coachUserId: session.userId } : {}) }),
    listExercises(),
  ]);

  // Clients autorisés pour la construction (coach → seulement les siens).
  const clients = clientsRaw.map((c) => ({ id: c.id, name: `${c.user.firstName} ${c.user.lastName}` }));

  // Liste des programmes : un coach ne voit que ceux de SES clients.
  const allowedIds = new Set(clientsRaw.map((c) => c.id));
  const programs = isCoach ? allPrograms.filter((p) => p.clientId && allowedIds.has(p.clientId)) : allPrograms;
  const active = programs.filter((p) => p.status === "ACTIVE").length;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Programmes</h1>
          <div className="subtitle">
            Construisez un programme pour un client, ou consultez ceux existants. {programs.length} au total · {active} actif(s).
          </div>
        </div>
      </div>

      {/* Espace de création */}
      <ProgramBuilder
        clients={JSON.parse(JSON.stringify(clients))}
        exercises={JSON.parse(JSON.stringify(exercises))}
      />

      {/* Séparation nette entre la création et la liste existante */}
      <div className="section-label">Programmes existants</div>

      <div className="card">
        {programs.length === 0 ? (
          <p className="muted" style={{ margin: 0 }}>
            Aucun programme pour l&apos;instant. Créez-en un ci-dessus en choisissant un client.
          </p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Programme</th>
                  <th>Cible</th>
                  <th>Séances</th>
                  <th>Statut</th>
                  <th>Créé le</th>
                </tr>
              </thead>
              <tbody>
                {programs.map((p) => {
                  const st = STATUS[p.status] || STATUS.DRAFT;
                  const target = p.isTemplate
                    ? { label: "Modèle", href: null }
                    : p.client
                    ? { label: `${p.client.user.firstName} ${p.client.user.lastName}`, href: `/admin/clients/${p.clientId}` }
                    : p.goal
                    ? { label: p.goal.label, href: `/admin/objectifs` }
                    : { label: "—", href: null };
                  return (
                    <tr key={p.id}>
                      <td><strong>{p.title}</strong></td>
                      <td>
                        {target.href ? (
                          <Link href={target.href} className="badge" style={{ cursor: "pointer" }}>
                            {p.client ? <Icon name="user" /> : <Icon name="target" />} {target.label}
                          </Link>
                        ) : (
                          <span className="badge">{target.label}</span>
                        )}
                      </td>
                      <td>{p._count.sessions}</td>
                      <td>
                        <span className="badge" style={{ color: st.color, borderColor: st.color }}>
                          <span className="dot" style={{ background: st.color }} /> {st.label}
                        </span>
                      </td>
                      <td className="muted small">{formatDate(p.createdAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
