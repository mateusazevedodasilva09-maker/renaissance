import { handle, ok, requireAuth } from "@/lib/api";
import { addSession } from "@/modules/programs/program-editor.service";

/** Ajoute un jour d'entraînement au programme. */
export const POST = handle(async (req, { params }) => {
  const { error } = await requireAuth({ permission: "programs.manage" });
  if (error) return error;
  return ok(await addSession(params.id, await req.json()), { status: 201 });
});
