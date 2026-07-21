import { handle, ok, requireAuth } from "@/lib/api";
import { updateSlot, deleteSlot } from "@/modules/sessions/schedule.service";

export const PATCH = handle(async (req, { params }) => {
  const { error } = await requireAuth({ permission: "sessions.manage" });
  if (error) return error;
  return ok(await updateSlot(params.id, await req.json()));
});

export const DELETE = handle(async (req, { params }) => {
  const { error } = await requireAuth({ permission: "sessions.manage" });
  if (error) return error;
  return ok(await deleteSlot(params.id));
});
