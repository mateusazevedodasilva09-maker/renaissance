/**
 * Tableau de bord — vue d'ensemble de l'activité.
 * Admin : pipeline CRM, demandes d'appel, tâches, clients actifs.
 * Coach : ses groupes, ses clients, ses tâches et les messages de ses inscrits.
 */
import Link from "next/link";
import { getSession } from "@/lib/session";
import { pipelineStats } from "@/modules/crm/prospect.service";
import { listAppointments } from "@/modules/agenda/appointment.service";
import { listTasks } from "@/modules/agenda/task.service";
import { listGroupsForCoach } from "@/modules/clients/group.service";
import { listFeedbackForStaff } from "@/modules/clients/feedback.service";
import { getClientsNeedingAttention } from "@/modules/coach/coach.service";
import prisma from "@/lib/prisma";
import { formatDateTime } from "@/lib/dates";
import Icon from "@/components/Icon";

export const dynamic = "force-dynamic";

const TASK_LABEL = { TODO: "À faire", IN_PROGRESS: "En cours", DONE: "Fait" };
const TASK_COLOR = { TODO: "var(--amber)", IN_PROGRESS: "var(--blue)", DONE: "var(--green)" };

// ---------------------------------------------------------------------------
// Tableau de bord COACH
// ---------------------------------------------------------------------------
async function CoachDashboard({ session }) {
  const [groups, tasks, feedbacks] = await Promise.all([
    listGroupsForCoach(session.userId),
    listTasks({ assigneeId: session.userId, status: "TODO" }),
    listFeedbackForStaff({ role: "COACH", userId: session.userId }),
  ]);
  const clientCount = groups.reduce((s, g) => s + g._count.clients, 0);
  const unanswered = feedbacks.filter((f) => !f.coachReply);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Bonjour {session.name}</h1>
          <div className="subtitle">Vos groupes, vos clients et vos tâches en un coup d&apos;œil.</div>
        </div>
      </div>

      <div className="grid grid-4 mb">
        <div className="card">
          <div className="stat-value">{groups.length}</div>
          <div className="stat-label">Groupes encadrés</div>
        </div>
        <div className="card">
          <div className="stat-value" style={{ color: "var(--green)" }}>{clientCount}</div>
          <div className="stat-label">Clients suivis</div>
        </div>
        <div className="card">
          <div className="stat-value" style={{ color: "var(--amber)" }}>{tasks.length}</div>
          <div className="stat-label">Tâches à faire</div>
        </div>
        <div className="card">
          <div className="stat-value" style={{ color: "var(--accent)" }}>{unanswered.length}</div>
          <div className="stat-label">Messages sans réponse</div>
        </div>
      </div>

      <div className="grid grid-2">
        <div className="card">
          <div className="flex-between mb">
            <h3>Mes groupes</h3>
            <Link href="/admin/groupes" className="btn btn-sm">Voir les groupes</Link>
          </div>
          {groups.length === 0 && (
            <p className="muted">Aucun groupe assigné pour l&apos;instant. L&apos;admin peut vous en confier un.</p>
          )}
          {groups.map((g) => (
            <div key={g.id} className="flex-between" style={{ padding: "7px 0", borderBottom: "1px solid var(--border)" }}>
              <div>
                <strong>{g.name}</strong>
                {g.goal && <span className="muted small"> · <Icon name="target" /> {g.goal.label}</span>}
              </div>
              <span className="badge">{g._count.clients}/{g.capacity} membres</span>
            </div>
          ))}
        </div>

        <div className="card">
          <div className="flex-between mb">
            <h3>Derniers messages de mes inscrits</h3>
            <Link href="/admin/messages" className="btn btn-sm">Messagerie</Link>
          </div>
          {feedbacks.length === 0 && <p className="muted">Aucun message pour l&apos;instant.</p>}
          {feedbacks.slice(0, 6).map((f) => (
            <div key={f.id} style={{ padding: "7px 0", borderBottom: "1px solid var(--border)" }}>
              <div className="flex-between">
                <strong>{f.client.user.firstName} {f.client.user.lastName}</strong>
                <span className="badge">
                  <span className="dot" style={{ background: f.coachReply ? "var(--green)" : "var(--amber)" }} />
                  {f.coachReply ? "Répondu" : "À répondre"}
                </span>
              </div>
              <div className="muted small" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {f.content}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tableau de bord ADMIN
// ---------------------------------------------------------------------------
export default async function AdminDashboard() {
  const session = await getSession();
  if (session?.role === "COACH") return <CoachDashboard session={session} />;

  const [stats, requested, tasks, clientCount, attention, allTasks] = await Promise.all([
    pipelineStats(),
    listAppointments({ status: "REQUESTED" }),
    listTasks({ status: "TODO" }),
    prisma.client.count({ where: { isActive: true } }),
    getClientsNeedingAttention(), // global (tous coachs)
    listTasks({}), // toutes les tâches de l'équipe
  ]);

  // Tâches de toute l'équipe (coachs + admin), non terminées, groupées par personne.
  const openTasks = allTasks.filter((t) => t.status !== "DONE");
  const tasksByPerson = Object.values(
    openTasks.reduce((m, t) => {
      const key = t.assigneeId || "none";
      const name = t.assignee ? `${t.assignee.firstName} ${t.assignee.lastName}` : "Non assigné";
      (m[key] ||= { key, name, tasks: [] }).tasks.push(t);
      return m;
    }, {})
  ).sort((a, b) => b.tasks.length - a.tasks.length);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Vue d&apos;ensemble</h1>
          <div className="subtitle">L&apos;état de votre activité en un coup d&apos;œil.</div>
        </div>
      </div>

      <div className="grid grid-4 mb">
        <div className="card">
          <div className="stat-value">{stats.total}</div>
          <div className="stat-label">Prospects dans la pipeline</div>
        </div>
        <div className="card">
          <div className="stat-value" style={{ color: "var(--accent)" }}>{requested.length}</div>
          <div className="stat-label">Demandes d&apos;appel à planifier</div>
        </div>
        <div className="card">
          <div className="stat-value" style={{ color: "var(--amber)" }}>{tasks.length}</div>
          <div className="stat-label">Tâches à faire</div>
        </div>
        <div className="card">
          <div className="stat-value" style={{ color: "var(--green)" }}>{clientCount}</div>
          <div className="stat-label">Clients actifs</div>
        </div>
        <div className="card">
          <div className="stat-value" style={{ color: attention.length ? "var(--amber)" : "var(--green)" }}>{attention.length}</div>
          <div className="stat-label">Personnes à traiter</div>
        </div>
      </div>

      <div className="grid grid-2">
        <div className="card">
          <div className="flex-between mb">
            <h3>Pipeline</h3>
            <Link href="/admin/crm" className="btn btn-sm">Ouvrir le CRM</Link>
          </div>
          {stats.byStatus.map((s) => (
            <div key={s.id} className="flex-between" style={{ padding: "7px 0", borderBottom: "1px solid var(--border)" }}>
              <span className="badge">
                <span className="dot" style={{ background: s.color }} />
                {s.label}
              </span>
              <strong>{s.count}</strong>
            </div>
          ))}
        </div>

        <div className="card">
          <div className="flex-between mb">
            <h3>Demandes d&apos;appel reçues</h3>
            <Link href="/admin/agenda" className="btn btn-sm">Agenda</Link>
          </div>
          {requested.length === 0 && <p className="muted">Aucune demande en attente.</p>}
          {requested.slice(0, 6).map((a) => (
            <div key={a.id} className="flex-between" style={{ padding: "7px 0", borderBottom: "1px solid var(--border)" }}>
              <div>
                <Link href={`/admin/crm/${a.prospect?.id}`} style={{ fontWeight: 600 }}>
                  {a.prospect ? `${a.prospect.firstName} ${a.prospect.lastName}` : "—"}
                </Link>
                <div className="muted small">reçue le {formatDateTime(a.createdAt)}</div>
              </div>
              <span className="badge">
                <span className="dot" style={{ background: "var(--accent)" }} />À planifier
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Tâches de toute l'équipe (tous les coachs), groupées par personne. */}
      <div className="card mt">
        <div className="flex-between mb">
          <h3 style={{ margin: 0 }}><Icon name="check" /> Tâches de l&apos;équipe ({openTasks.length})</h3>
          <Link href="/admin/agenda" className="btn btn-sm">Ouvrir l&apos;agenda</Link>
        </div>
        {openTasks.length === 0 ? (
          <p className="muted">Aucune tâche en cours dans l&apos;équipe.</p>
        ) : (
          <div className="grid grid-2">
            {tasksByPerson.map((p) => (
              <div key={p.key}>
                <div className="section-label" style={{ paddingLeft: 0 }}>
                  <Icon name="user" /> {p.name} · {p.tasks.length}
                </div>
                {p.tasks.slice(0, 8).map((t) => (
                  <div key={t.id} className="flex-between" style={{ padding: "6px 0", borderBottom: "1px solid var(--border)" }}>
                    <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {t.title}
                      {t.dueAt && <span className="muted small"> · {formatDateTime(t.dueAt)}</span>}
                    </span>
                    <span className="badge" style={{ color: TASK_COLOR[t.status], borderColor: TASK_COLOR[t.status] }}>
                      {TASK_LABEL[t.status]}
                    </span>
                  </div>
                ))}
                {p.tasks.length > 8 && <div className="muted small">+ {p.tasks.length - 8} autre(s)</div>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
