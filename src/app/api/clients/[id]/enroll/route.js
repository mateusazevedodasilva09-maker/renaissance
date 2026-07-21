import { handle, ok, requireAuth } from "@/lib/api";
import { enrollClient } from "@/modules/clients/client.service";

/** Inscrit le client : lui donne accès à son dashboard (réservé au staff). */
export const POST = handle(async (req, { params }) => {
  const { error, session } = await requireAuth({ permission: "clients.manage" });
  if (error) return error;
  return ok(await enrollClient(params.id, { userId: session.userId }));
});
