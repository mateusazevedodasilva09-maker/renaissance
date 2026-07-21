import { handle, ok, requireAuth } from "@/lib/api";
import { updateSession, deleteSession, moveSession } from "@/modules/programs/program-editor.service";

/**
 * Modifie un jour du programme : renommage / jour de la semaine, ou
 * déplacement dans la liste si le corps contient `move: "up" | "down"`.
 */
export const PATCH = handle(async (req, { params }) => {
  const { error } = await requireAuth({ permission: "programs.manage" });
  if (error) return error;
  const body = await req.json();
  if (body.move) return ok(await moveSession(params.id, body.move));
  return ok(await updateSession(params.id, body));
});

/** Supprime un jour et tous ses exercices. */
export const DELETE = handle(async (req, { params }) => {
  const { error } = await requireAuth({ permission: "programs.manage" });
  if (error) return error;
  return ok(await deleteSession(params.id));
});
