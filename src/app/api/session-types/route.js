import { handle, ok, requireAuth } from "@/lib/api";
import { listSessionTypes, createSessionType } from "@/modules/sessions/schedule.service";

export const GET = handle(async () => {
  const { error } = await requireAuth({ permission: "sessions.manage" });
  if (error) return error;
  return ok(await listSessionTypes());
});

export const POST = handle(async (req) => {
  const { error } = await requireAuth({ permission: "sessions.manage" });
  if (error) return error;
  return ok(await createSessionType(await req.json()), { status: 201 });
});
