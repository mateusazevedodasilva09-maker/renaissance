/**
 * Groupes d'entraînement — l'admin gère tout, le coach voit ses groupes.
 */
import { getSession } from "@/lib/session";
import { listGroups, listGroupsForCoach, getGroupsStats } from "@/modules/clients/group.service";
import { listGoals } from "@/modules/sessions/schedule.service";
import { listStaff } from "@/modules/auth/user.service";
import GroupManager from "@/components/admin/GroupManager";

export const dynamic = "force-dynamic";

export default async function GroupsPage() {
  const session = await getSession();
  const isAdmin = session?.role === "ADMIN";
  const [groups, goals, staff] = await Promise.all([
    isAdmin ? listGroups() : listGroupsForCoach(session.userId),
    listGoals(),
    listStaff(),
  ]);
  const stats = await getGroupsStats(groups.map((g) => g.id));
  return (
    <GroupManager
      initialGroups={JSON.parse(JSON.stringify(groups))}
      goals={JSON.parse(JSON.stringify(goals))}
      staff={JSON.parse(JSON.stringify(staff))}
      stats={JSON.parse(JSON.stringify(stats))}
      isAdmin={isAdmin}
    />
  );
}
