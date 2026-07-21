/**
 * Configuration des séances de groupe : thématiques + planning hebdomadaire.
 */
import { listSessionTypes, listSlots, listGoals } from "@/modules/sessions/schedule.service";
import { listGroups } from "@/modules/clients/group.service";
import ScheduleConfig from "@/components/admin/ScheduleConfig";

export const dynamic = "force-dynamic";

export default async function SeancesPage() {
  const [types, slots, goals, groups] = await Promise.all([
    listSessionTypes(),
    listSlots(),
    listGoals(),
    listGroups(),
  ]);
  return (
    <ScheduleConfig
      initialTypes={JSON.parse(JSON.stringify(types))}
      initialSlots={JSON.parse(JSON.stringify(slots))}
      initialGoals={JSON.parse(JSON.stringify(goals))}
      groups={JSON.parse(JSON.stringify(groups))}
    />
  );
}
