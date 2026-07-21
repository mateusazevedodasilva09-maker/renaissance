import { handle, ok, requireAuth } from "@/lib/api";
import { listStrengthLogs, addStrengthLog } from "@/modules/tracking/performance.service";

export const GET = handle(async (req, { params }) => {
  const { error } = await requireAuth({ permission: "tracking.manage" });
  if (error) return error;
  return ok(await listStrengthLogs(params.id));
});

export const POST = handle(async (req, { params }) => {
  const { error } = await requireAuth({ permission: "tracking.manage" });
  if (error) return error;
  return ok(await addStrengthLog(params.id, await req.json()), { status: 201 });
});
