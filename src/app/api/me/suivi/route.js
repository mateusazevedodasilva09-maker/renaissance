/**
 * Espace client — tableau de bord complet du suivi :
 * mesures hebdo (avec bilan du coach), force (PR), cardio,
 * présence et conseil de la semaine.
 */
import { handle, ok, fail, requireAuth } from "@/lib/api";
import { getClientByUserId } from "@/modules/clients/client.service";
import { listMetrics } from "@/modules/tracking/metric.service";
import {
  listStrengthLogs,
  listCardioLogs,
  listAttendances,
  presenceRate,
} from "@/modules/tracking/performance.service";
import { getAdviceForClient } from "@/modules/clients/advice.service";

export const GET = handle(async () => {
  const { error, session } = await requireAuth({ roles: ["CLIENT"] });
  if (error) return error;
  const client = await getClientByUserId(session.userId);
  if (!client) return fail("Aucun profil client associé à ce compte.", 404);

  const [metrics, strengthLogs, cardioLogs, attendances, rate, advice] = await Promise.all([
    listMetrics(client.id),
    listStrengthLogs(client.id),
    listCardioLogs(client.id),
    listAttendances(client.id),
    presenceRate(client.id),
    getAdviceForClient(client),
  ]);

  return ok({ client, metrics, strengthLogs, cardioLogs, attendances, presenceRate: rate, advice });
});
