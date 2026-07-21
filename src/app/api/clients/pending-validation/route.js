import { handle, ok, requireAuth } from "@/lib/api";
import { listPendingValidation } from "@/modules/clients/client.service";

/**
 * Clients ayant rempli leurs métriques et en attente d'inscription (accès
 * dashboard). Sert la notification staff (sondage) et l'affichage « à valider ».
 * Admin = tous ; coach = les siens.
 */
export const GET = handle(async () => {
  const { error, session } = await requireAuth({ permission: "clients.manage" });
  if (error) return error;
  return ok(await listPendingValidation({ role: session.role, userId: session.userId }));
});
