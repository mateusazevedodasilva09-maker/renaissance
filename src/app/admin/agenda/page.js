/**
 * Agenda v2 — calendrier filtrable : tâches, appels prospects et
 * prochaines actions CRM. Le coach ne voit que ses propres tâches,
 * et retrouve en plus le planning hebdo des séances de ses groupes.
 */
import { getSession } from "@/lib/session";
import { listTasks } from "@/modules/agenda/task.service";
import { listAppointments } from "@/modules/agenda/appointment.service";
import { listNextActions } from "@/modules/crm/prospect.service";
import { listStaff } from "@/modules/auth/user.service";
import { getCoachWeeklySchedule, listSlots } from "@/modules/sessions/schedule.service";
import { WEEKDAYS, WEEKDAY_LABELS } from "@/lib/dates";
import AgendaBoard from "@/components/admin/AgendaBoard";
import SessionSlotCard from "@/components/SessionSlotCard";
import Icon from "@/components/Icon";

export const dynamic = "force-dynamic";

export default async function AgendaPage() {
  const session = await getSession();
  const isAdmin = session?.role === "ADMIN";
  const [tasks, appointments, nextActions, staff, coachSlots] = await Promise.all([
    listTasks(isAdmin ? {} : { assigneeId: session.userId }),
    listAppointments(),
    isAdmin ? listNextActions() : [],
    listStaff(),
    // Admin : toutes les séances placées ; coach : uniquement les siennes.
    isAdmin ? listSlots() : getCoachWeeklySchedule(session.userId),
  ]);
  return (
    <div>
      <AgendaBoard
        initialTasks={JSON.parse(JSON.stringify(tasks))}
        initialAppointments={JSON.parse(JSON.stringify(appointments))}
        nextActions={JSON.parse(JSON.stringify(nextActions))}
        staff={JSON.parse(JSON.stringify(staff))}
        sessionUserId={session?.userId}
        role={session?.role || "ADMIN"}
        coachSlots={JSON.parse(JSON.stringify(coachSlots))}
      />

      {/* Planning hebdo des séances du coach */}
      {!isAdmin && (
        <div className="card mt">
          <h3><Icon name="calendar" /> Le planning de mes séances de groupe</h3>
          {coachSlots.length === 0 ? (
            <p className="muted">
              Aucune séance ne correspond aux objectifs de vos groupes pour l&apos;instant.
            </p>
          ) : (
            <div className="kanban">
              {WEEKDAYS.map((day) => {
                const daySlots = coachSlots.filter((s) => s.weekday === day);
                return (
                  <div key={day} className="kanban-col" style={{ minWidth: 150, width: 150 }}>
                    <div className="kanban-col-header"><span>{WEEKDAY_LABELS[day]}</span></div>
                    {daySlots.length === 0 && (
                      <div className="muted small" style={{ textAlign: "center", padding: 8 }}>—</div>
                    )}
                    {/* Carte cliquable partagée avec l'espace client : ouvre
                        le contenu type de la séance (exercices + descriptions). */}
                    {daySlots.map((s) => (
                      <SessionSlotCard key={s.id} slot={s} />
                    ))}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
