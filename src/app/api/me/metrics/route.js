/**
 * Espace client — le client saisit lui-même sa mesure de la semaine.
 */
import { handle, ok, fail, requireAuth } from "@/lib/api";
import { getClientByUserId } from "@/modules/clients/client.service";
import { upsertMetric, listMetrics } from "@/modules/tracking/metric.service";

export const GET = handle(async () => {
  const { error, session } = await requireAuth({ roles: ["CLIENT"] });
  if (error) return error;
  const client = await getClientByUserId(session.userId);
  if (!client) return fail("Aucun profil client associé à ce compte.", 404);
  return ok(await listMetrics(client.id));
});

export const POST = handle(async (req) => {
  const { error, session } = await requireAuth({ roles: ["CLIENT"] });
  if (error) return error;
  const client = await getClientByUserId(session.userId);
  if (!client) return fail("Aucun profil client associé à ce compte.", 404);
  const { weekStart, weightKg, energyLevel, sessionsAttended, notes } = await req.json();
  return ok(await upsertMetric(client.id, { weekStart, weightKg, energyLevel, sessionsAttended, notes }), { status: 201 });
});
