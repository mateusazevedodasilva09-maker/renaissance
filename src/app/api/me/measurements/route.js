/**
 * Espace client — le client renseigne lui-même ses mensurations (étape
 * d'onboarding). Encapsulation : réservé au rôle CLIENT, borné à SON profil.
 */
import { handle, ok, fail, requireAuth } from "@/lib/api";
import { getClientByUserId } from "@/modules/clients/client.service";
import { addMeasurementByClient, listMeasurements } from "@/modules/tracking/body.service";

export const GET = handle(async () => {
  const { error, session } = await requireAuth({ roles: ["CLIENT"] });
  if (error) return error;
  const client = await getClientByUserId(session.userId);
  if (!client) return fail("Aucun profil client associé à ce compte.", 404);
  return ok(await listMeasurements(client.id));
});

export const POST = handle(async (req) => {
  const { error, session } = await requireAuth({ roles: ["CLIENT"] });
  if (error) return error;
  const client = await getClientByUserId(session.userId);
  if (!client) return fail("Aucun profil client associé à ce compte.", 404);
  return ok(await addMeasurementByClient(client.id, await req.json()), { status: 201 });
});
