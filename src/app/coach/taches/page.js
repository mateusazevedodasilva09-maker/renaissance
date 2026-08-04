/**
 * « Mes tâches » — uniquement les tâches assignées au coach connecté. Aucune
 * donnée de prospection (les rendez-vous / demandes d'appel restent côté admin).
 * Un ADMIN peut observer les tâches d'un coach via ?coach=.
 */
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { listTasks } from "@/modules/agenda/task.service";
import { listStaff } from "@/modules/auth/user.service";
import { listCoaches } from "@/modules/coach/coach.service";
import AgendaBoard from "@/components/admin/AgendaBoard";
import CoachPicker from "@/components/coach/CoachPicker";

export const dynamic = "force-dynamic";

export default async function CoachTasksPage({ searchParams }) {
  const session = await getSession();
  if (!session || (session.role !== "ADMIN" && session.role !== "COACH")) {
    redirect("/connexion");
  }

  const isAdmin = session.role === "ADMIN";
  const coaches = isAdmin ? await listCoaches() : [];
  const targetCoachId = isAdmin ? (searchParams?.coach || coaches[0]?.id || null) : session.userId;

  const [tasks, staff] = await Promise.all([
    targetCoachId ? listTasks({ assigneeId: targetCoachId }) : [],
    listStaff(),
  ]);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Mes tâches</h1>
          <div className="subtitle">Vos rappels et suivis personnels.</div>
        </div>
        {isAdmin && <CoachPicker coaches={JSON.parse(JSON.stringify(coaches))} selectedCoachId={targetCoachId} />}
      </div>
      <AgendaBoard
        initialTasks={JSON.parse(JSON.stringify(tasks))}
        initialAppointments={[]}
        nextActions={[]}
        staff={JSON.parse(JSON.stringify(staff))}
        sessionUserId={session.userId}
        role={session.role}
        coachSlots={[]}
      />
    </div>
  );
}
