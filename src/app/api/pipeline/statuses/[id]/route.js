import { handle, ok, requireAuth } from "@/lib/api";
import { updateStatus, deleteStatus } from "@/modules/crm/pipeline.service";

export const PATCH = handle(async (req, { params }) => {
  const { error } = await requireAuth({ roles: ["ADMIN"] });
  if (error) return error;
  return ok(await updateStatus(params.id, await req.json()));
});

export const DELETE = handle(async (req, { params }) => {
  const { error } = await requireAuth({ roles: ["ADMIN"] });
  if (error) return error;
  return ok(await deleteStatus(params.id));
});
