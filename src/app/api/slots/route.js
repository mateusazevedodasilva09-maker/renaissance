import { handle, ok, requireAuth } from "@/lib/api";
import { listSlots, createSlot } from "@/modules/sessions/schedule.service";

export const GET = handle(async () => {
  const { error } = await requireAuth({ permission: "sessions.manage" });
  if (error) return error;
  return ok(await listSlots());
});

export const POST = handle(async (req) => {
  const { error } = await requireAuth({ permission: "sessions.manage" });
  if (error) return error;
  return ok(await createSlot(await req.json()), { status: 201 });
});
