import { handle, ok, requireAuth } from "@/lib/api";
import { listGoals, createGoal } from "@/modules/sessions/schedule.service";

export const GET = handle(async () => {
  const { error } = await requireAuth({ roles: ["ADMIN", "COACH"] });
  if (error) return error;
  return ok(await listGoals());
});

export const POST = handle(async (req) => {
  const { error } = await requireAuth({ roles: ["ADMIN"] });
  if (error) return error;
  return ok(await createGoal(await req.json()), { status: 201 });
});
