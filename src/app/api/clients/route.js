import { handle, ok, requireAuth } from "@/lib/api";
import { listClients } from "@/modules/clients/client.service";

export const GET = handle(async () => {
  const { error } = await requireAuth({ permission: "clients.manage" });
  if (error) return error;
  return ok(await listClients());
});
