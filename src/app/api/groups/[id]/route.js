import { handle, ok, requireAuth } from "@/lib/api";
import { getGroup, updateGroup, deleteGroup } from "@/modules/clients/group.service";

export const GET = handle(async (req, { params }) => {
  const { error } = await requireAuth({ roles: ["ADMIN", "COACH"] });
  if (error) return error;
  return ok(await getGroup(params.id));
});

export const PATCH = handle(async (req, { params }) => {
  const { error } = await requireAuth({ permission: "groups.manage" });
  if (error) return error;
  return ok(await updateGroup(params.id, await req.json()));
});

export const DELETE = handle(async (req, { params }) => {
  const { error } = await requireAuth({ permission: "groups.manage" });
  if (error) return error;
  return ok(await deleteGroup(params.id));
});
