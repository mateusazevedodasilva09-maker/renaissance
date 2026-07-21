/**
 * Espace client — feedback hebdomadaire envoyé au coach.
 */
import { handle, ok, fail, requireAuth } from "@/lib/api";
import { getClientByUserId } from "@/modules/clients/client.service";
import { createFeedback, listFeedbackForClient } from "@/modules/clients/feedback.service";

export const GET = handle(async () => {
  const { error, session } = await requireAuth({ roles: ["CLIENT"] });
  if (error) return error;
  const client = await getClientByUserId(session.userId);
  if (!client) return fail("Aucun profil client associé à ce compte.", 404);
  return ok(await listFeedbackForClient(client.id));
});

export const POST = handle(async (req) => {
  const { error, session } = await requireAuth({ roles: ["CLIENT"] });
  if (error) return error;
  const client = await getClientByUserId(session.userId);
  if (!client) return fail("Aucun profil client associé à ce compte.", 404);
  return ok(await createFeedback(client.id, await req.json()), { status: 201 });
});
