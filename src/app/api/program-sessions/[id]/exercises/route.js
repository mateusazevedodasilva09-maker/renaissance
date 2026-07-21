import { handle, ok, requireAuth } from "@/lib/api";
import { addExercise } from "@/modules/programs/program-editor.service";

/** Ajoute un exercice de la bibliothèque à ce jour du programme. */
export const POST = handle(async (req, { params }) => {
  const { error } = await requireAuth({ permission: "programs.manage" });
  if (error) return error;
  return ok(await addExercise(params.id, await req.json()), { status: 201 });
});
