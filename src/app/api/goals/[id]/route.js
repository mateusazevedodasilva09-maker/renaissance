import { handle, ok, requireAuth } from "@/lib/api";
import { deleteGoal } from "@/modules/sessions/schedule.service";

export const DELETE = handle(async (req, { params }) => {
  const { error } = await requireAuth({ roles: ["ADMIN"] });
  if (error) return error;
  return ok(await deleteGoal(params.id));
});
