import { handle, ok, requireAuth } from "@/lib/api";
import { getClient, updateClient } from "@/modules/clients/client.service";

export const GET = handle(async (req, { params }) => {
  const { error } = await requireAuth({ permission: "clients.manage" });
  if (error) return error;
  return ok(await getClient(params.id));
});

export const PATCH = handle(async (req, { params }) => {
  const { error } = await requireAuth({ permission: "clients.manage" });
  if (error) return error;
  return ok(await updateClient(params.id, await req.json()));
});
