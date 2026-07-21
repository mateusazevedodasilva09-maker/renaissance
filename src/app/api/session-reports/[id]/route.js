import { handle, ok, requireAuth } from "@/lib/api";
import { deleteSessionReport } from "@/modules/tracking/session-report.service";

export const DELETE = handle(async (req, { params }) => {
  const { error } = await requireAuth({ permission: "tracking.manage" });
  if (error) return error;
  return ok(await deleteSessionReport(params.id));
});
