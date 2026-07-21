import { handle, ok, requireAuth } from "@/lib/api";
import { applyTemplate, deleteTemplate } from "@/modules/programs/program-editor.service";

/** Applique le modèle à un client : { clientId }. Archive son ancien programme. */
export const POST = handle(async (req, { params }) => {
  const { error, session } = await requireAuth({ permission: "programs.manage" });
  if (error) return error;
  return ok(await applyTemplate(params.id, await req.json(), { userId: session.userId }), { status: 201 });
});

/** Supprime un modèle. */
export const DELETE = handle(async (req, { params }) => {
  const { error } = await requireAuth({ permission: "programs.manage" });
  if (error) return error;
  return ok(await deleteTemplate(params.id));
});
