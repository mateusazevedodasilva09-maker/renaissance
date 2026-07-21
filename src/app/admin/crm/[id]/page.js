/**
 * Fiche prospect — détails, historique horodaté, conversion en client.
 */
import { getProspect } from "@/modules/crm/prospect.service";
import { listStatuses } from "@/modules/crm/pipeline.service";
import { listGoals } from "@/modules/sessions/schedule.service";
import { listStaff } from "@/modules/auth/user.service";
import ProspectFile from "@/components/admin/ProspectFile";

export const dynamic = "force-dynamic";

export default async function ProspectPage({ params }) {
  const [prospect, statuses, goals, staff] = await Promise.all([
    getProspect(params.id),
    listStatuses(),
    listGoals(),
    listStaff(),
  ]);
  return (
    <ProspectFile
      initialProspect={JSON.parse(JSON.stringify(prospect))}
      statuses={JSON.parse(JSON.stringify(statuses))}
      goals={JSON.parse(JSON.stringify(goals))}
      staff={JSON.parse(JSON.stringify(staff))}
    />
  );
}
