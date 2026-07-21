import { handle, ok, requireAuth } from "@/lib/api";
import { listAttendances, addAttendance, presenceRate } from "@/modules/tracking/performance.service";

export const GET = handle(async (req, { params }) => {
  const { error } = await requireAuth({ permission: "tracking.manage" });
  if (error) return error;
  const [attendances, rate] = await Promise.all([
    listAttendances(params.id),
    presenceRate(params.id),
  ]);
  return ok({ attendances, presenceRate: rate });
});

export const POST = handle(async (req, { params }) => {
  const { error } = await requireAuth({ permission: "tracking.manage" });
  if (error) return error;
  return ok(await addAttendance(params.id, await req.json()), { status: 201 });
});
