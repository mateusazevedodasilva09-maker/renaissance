import { handle, ok, requireAuth } from "@/lib/api";
import { deleteStrengthLog } from "@/modules/tracking/performance.service";

export const DELETE = handle(async (req, { params }) => {
  const { error } = await requireAuth({ permission: "tracking.manage" });
  if (error) return error;
  return ok(await deleteStrengthLog(params.id));
});
