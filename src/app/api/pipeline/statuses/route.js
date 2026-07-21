import { handle, ok, requireAuth } from "@/lib/api";
import { listStatuses, createStatus } from "@/modules/crm/pipeline.service";

export const GET = handle(async () => {
  const { error } = await requireAuth({ roles: ["ADMIN"] });
  if (error) return error;
  return ok(await listStatuses());
});

export const POST = handle(async (req) => {
  const { error } = await requireAuth({ roles: ["ADMIN"] });
  if (error) return error;
  return ok(await createStatus(await req.json()), { status: 201 });
});
