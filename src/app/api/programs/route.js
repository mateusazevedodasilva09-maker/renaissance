import { handle, ok, requireAuth } from "@/lib/api";
import { generateProgram, regenerateClientProgram } from "@/modules/programs/program.service";
import { listGenerators } from "@/modules/programs/generation/registry";

/** Liste des générateurs disponibles (pilote le formulaire admin). */
export const GET = handle(async () => {
  const { error } = await requireAuth({ permission: "programs.manage" });
  if (error) return error;
  return ok(listGenerators());
});

/** Génère un programme pour un client via la stratégie choisie. */
export const POST = handle(async (req) => {
  const { error, session } = await requireAuth({ permission: "programs.manage" });
  if (error) return error;
  const body = await req.json();
  // Régénération automatique depuis le profil du client (objectif + niveau),
  // sans avoir à saisir de paramètres.
  if (body.auto && body.clientId) {
    return ok(await regenerateClientProgram(body.clientId), { status: 201 });
  }
  return ok(await generateProgram(body, { userId: session.userId }), { status: 201 });
});
