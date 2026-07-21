/**
 * Programmes — la liste de TOUS les programmes générés (par objectif ou par
 * client), avec leur statut, leur cible, leur nombre de séances et leur date.
 * Un programme généré y reste visible même une fois archivé (remplacé par une
 * nouvelle génération).
 */
import Link from "next/link";
import { listAllPrograms } from "@/modules/programs/program.service";
import { formatDate } from "@/lib/dates";
import Icon from "@/components/Icon";

export const dynamic = "force-dynamic";

const STATUS = {
  ACTIVE: { label: "Actif", color: "var(--green)" },
  DRAFT: { label: "Brouillon", color: "var(--amber)" },
  ARCHIVED: { label: "Archivé", color: "var(--text-dim)" },
};

export default async function ProgrammesPage() {
  const programs = await listAllPrograms();
  const active = programs.filter((p) => p.status === "ACTIVE").length;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Programmes</h1>
          <div className="subtitle">
            Tous les programmes générés, par objectif ou par client. {programs.length} au total · {active} actif(s).
          </div>
        </div>
      </div>

      <div className="card">
        {programs.length === 0 ? (
          <p className="muted" style={{ margin: 0 }}>
            Aucun programme pour l&apos;instant. Générez-en depuis « Objectifs &amp; programmes » ou une fiche client.
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
