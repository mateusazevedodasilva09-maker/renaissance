/**
 * CRM — obligations journalières + pipeline kanban des prospects.
 */
import { listProspects, dailyObligations } from "@/modules/crm/prospect.service";
import { listStatuses } from "@/modules/crm/pipeline.service";
import { listGoals } from "@/modules/sessions/schedule.service";
import CrmBoard from "@/components/admin/CrmBoard";

export const dynamic = "force-dynamic";

export default async function CrmPage() {
  const [prospects, statuses, goals, obligations] = await Promise.all([
    listProspects(),
    listStatuses(),
    listGoals(),
    dailyObligations(),
  ]);
  return (
    <CrmBoard
      initialProspects={JSON.parse(JSON.stringify(prospects))}
      initialStatuses={JSON.parse(JSON.stringify(statuses))}
      goals={JSON.parse(JSON.stringify(goals))}
      obligations={JSON.parse(JSON.stringify(obligations))}
    />
  );
}
