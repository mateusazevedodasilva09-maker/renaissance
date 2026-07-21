import { handle, ok, requireAuth } from "@/lib/api";
import { listExercises, createExercise } from "@/modules/programs/program.service";

export const GET = handle(async () => {
  const { error } = await requireAuth({ permission: "programs.manage" });
  if (error) return error;
  return ok(await listExercises());
});

export const POST = handle(async (req) => {
  const { error } = await requireAuth({ permission: "programs.manage" });
  if (error) return error;
  return ok(await createExercise(await req.json()), { status: 201 });
});
