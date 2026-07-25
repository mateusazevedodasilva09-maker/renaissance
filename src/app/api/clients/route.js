import { handle, ok, requireAuth } from "@/lib/api";
import { listClients, createSoloClient } from "@/modules/clients/client.service";

export const GET = handle(async () => {
  const { error } = await requireAuth({ permission: "clients.manage" });
  if (error) return error;
  return ok(await listClients());
});

// Ajout direct d'un client en suivi individuel (1v1) : crée le compte, un
// groupe personnel d'une place relié au coach, et la fiche client inscrite.
export const POST = handle(async (req) => {
  const { error } = await requireAuth({ permission: "clients.manage" });
  if (error) return error;
  return ok(await createSoloClient(await req.json()), { status: 201 });
});
