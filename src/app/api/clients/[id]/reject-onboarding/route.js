import { handle, ok, requireAuth } from "@/lib/api";
import { rejectOnboarding } from "@/modules/clients/client.service";

/**
 * Refuse la fiche d'onboarding d'un client (staff) : le renvoie remplir sa
 * fiche avec un message expliquant ce qui n'allait pas. Réservé au staff.
 * Body : { reason: string }.
 */
export const POST = handle(async (req, { params }) => {
  const { error, session } = await requireAuth({ permission: "clients.manage" });
  if (error) return error;
  const { reason } = await req.json();
  return ok(await rejectOnboarding(params.id, reason, { userId: session.userId }));
});
