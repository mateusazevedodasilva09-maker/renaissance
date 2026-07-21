import { handle, ok, requireAuth } from "@/lib/api";
import { updateSessionType } from "@/modules/sessions/schedule.service";

export const PATCH = handle(async (req, { params }) => {
  const { error } = await requireAuth({ permission: "sessions.manage" });
  if (error) return error;
  return ok(await updateSessionType(params.id, await req.json()));
});
