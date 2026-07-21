import { handle, ok, requireAuth } from "@/lib/api";
import { listCardioLogs, addCardioLog } from "@/modules/tracking/performance.service";

export const GET = handle(async (req, { params }) => {
  const { error } = await requireAuth({ permission: "tracking.manage" });
  if (error) return error;
  return ok(await listCardioLogs(params.id));
});

export const POST = handle(async (req, { params }) => {
  const { error } = await requireAuth({ permission: "tracking.manage" });
  if (error) return error;
  return ok(await addCardioLog(params.id, await req.json()), { status: 201 });
});
