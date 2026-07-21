import { handle, ok, requireAuth } from "@/lib/api";
import { listTemplates, saveAsTemplate } from "@/modules/programs/program-editor.service";

/** Liste des modèles de programme réutilisables. */
export const GET = handle(async () => {
  const { error } = await requireAuth({ permission: "programs.manage" });
  if (error) return error;
  return ok(await listTemplates());
});

/** Enregistre un programme existant comme modèle : { programId, title }. */
export const POST = handle(async (req) => {
  const { error, session } = await requireAuth({ permission: "programs.manage" });
  if (error) return error;
  const { programId, title } = await req.json();
  return ok(await saveAsTemplate(programId, { title }, { userId: session.userId }), { status: 201 });
});
