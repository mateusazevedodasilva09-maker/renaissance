import { handle, ok, requireAuth } from "@/lib/api";
import { updateExercise, deleteExercise, moveExercise } from "@/modules/programs/program-editor.service";

/**
 * Modifie un exercice du programme : séries / reps / repos / tempo / note,
 * échange d'exercice (`exerciseId`), ou déplacement (`move: "up" | "down"`).
 */
export const PATCH = handle(async (req, { params }) => {
  const { error } = await requireAuth({ permission: "programs.manage" });
  if (error) return error;
  const body = await req.json();
  if (body.move) return ok(await moveExercise(params.id, body.move));
  return ok(await updateExercise(params.id, body));
});

/** Retire un exercice du programme. */
export const DELETE = handle(async (req, { params }) => {
  const { error } = await requireAuth({ permission: "programs.manage" });
  if (error) return error;
  return ok(await deleteExercise(params.id));
});
