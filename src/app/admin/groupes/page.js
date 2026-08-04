/**
 * Groupes d'entraînement — l'admin gère tout, le coach voit ses groupes.
 */
import { getSession } from "@/lib/session";
import { listGroups, listGroupsForCoach, getGroupsStats } from "@/modules/clients/group.service";
import { listGoals } from "@/modules/sessions/schedule.service";
import { listStaff } from "@/modules/auth/user.service";
import { listClientsBrief } from "@/modules/clients/client.service";
import { listExercises } from "@/modules/programs/program.service";
import GroupManager from "@/components/admin/GroupManager";

export const dynamic = "force-dynamic";

export default async function GroupsPage() {
  const session = await getSession();
  const isAdmin = session?.role === "ADMIN";
  const [groups, goals, staff, allClients, exercises] = await Promise.all([
    isAdmin ? listGroups() : listGroupsForCoach(session.userId),
    listGoals(),
    listStaff(),
    // Liste des clients à assigner : réservée à l'admin (le coach ne compose pas les groupes).
    isAdmin ? listClientsBrief() : [],
    // Bibliothèque d'exercices pour l'éditeur de programme du groupe.
    listExercises(),
  ]);
  const stats = await getGroupsStats(groups.map((g) => g.id));
  return (
    <GroupManager
      initialGroups={JSON.parse(JSON.stringify(groups))}
      goals={JSON.parse(JSON.stringify(goals))}
      staff={JSON.parse(JSON.stringify(staff))}
      stats={JSON.parse(JSON.stringify(stats))}
      allClients={JSON.parse(JSON.stringify(allClients))}
      exercises={JSON.parse(JSON.stringify(exercises))}
      isAdmin={isAdmin}
    />
  );
}
