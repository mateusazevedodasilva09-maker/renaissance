/**
 * Agenda & tâches de l'espace coach : ses tâches personnelles (via le composant
 * partagé AgendaBoard) et le rappel de son planning hebdo de séances. Un ADMIN
 * qui observe un coach (?coach=) voit l'agenda de CE coach.
 */
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { listTasks } from "@/modules/agenda/task.service";
import { listAppointments } from "@/modules/agenda/appointment.service";
import { listStaff } from "@/modules/auth/user.service";
import { listCoaches } from "@/modules/coach/coach.service";
import { getCoachWeeklySchedule } from "@/modules/sessions/schedule.service";
import { WEEKDAYS, WEEKDAY_LABELS } from "@/lib/dates";
import AgendaBoard from "@/components/admin/AgendaBoard";
import SessionSlotCard from "@/components/SessionSlotCard";
import Icon from "@/components/Icon";

export const dynamic = "force-dynamic";

export default async function CoachAgendaPage({ searchParams }) {
  const session = await getSession();
  if (!session || (session.role !== "ADMIN" && session.role !== "COACH")) {
    redirect("/connexion");
  }

  const isAdmin = session.role === "ADMIN";
  const coaches = isAdmin ? await listCoaches() : [];
  const targetCoachId = isAdmin ? (searchParams?.coach || coaches[0]?.id || null) : session.userId;

  const [tasks, appointments, staff, coachSlots] = await Promise.all([
    listTasks({ assigneeId: targetCoachId }),
    listAppointments(),
    listStaff(),
    targetCoachId ? getCoachWeeklySchedule(targetCoachId) : [],
  ]);

  return (
    <div>
      <AgendaBoard
        initialTasks={JSON.parse(JSON.stringify(tasks))}
        initialAppointments={JSON.parse(JSON.stringify(appointments))}
        nextActions={[]}
        staff={JSON.parse(JSON.stringify(staff))}
        sessionUserId={session.userId}
        role={session.role}
        coachSlots={JSON.parse(JSON.stringify(coachSlots))}
      />

      <div className="card mt">
        <h3><Icon name="calendar" /> Le planning de mes séances de groupe</h3>
        {coachSlots.length === 0 ? (
          <p className="muted">Aucune séance placée sur vos groupes pour l&apos;instant.</p>
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
                  {daySlots.map((s) => (
                    <SessionSlotCard key={s.id} slot={s} />
                  ))}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
