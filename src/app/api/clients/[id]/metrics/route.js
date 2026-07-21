import { handle, ok, requireAuth } from "@/lib/api";
import { listMetrics, upsertMetric } from "@/modules/tracking/metric.service";

export const GET = handle(async (req, { params }) => {
  const { error } = await requireAuth({ permission: "tracking.manage" });
  if (error) return error;
  return ok(await listMetrics(params.id));
});

export const POST = handle(async (req, { params }) => {
  const { error } = await requireAuth({ permission: "tracking.manage" });
  if (error) return error;
  return ok(await upsertMetric(params.id, await req.json()), { status: 201 });
});
