import { handle, ok, requireAuth } from "@/lib/api";
import { updateTask, deleteTask } from "@/modules/agenda/task.service";

export const PATCH = handle(async (req, { params }) => {
  const { error } = await requireAuth({ roles: ["ADMIN", "COACH"] });
  if (error) return error;
  return ok(await updateTask(params.id, await req.json()));
});

export const DELETE = handle(async (req, { params }) => {
  const { error } = await requireAuth({ roles: ["ADMIN", "COACH"] });
  if (error) return error;
  return ok(await deleteTask(params.id));
});
