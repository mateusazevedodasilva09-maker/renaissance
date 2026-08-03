import { handle, ok } from "@/lib/api";
import { registerFromApp } from "@/modules/clients/client.service";
import { createSession } from "@/lib/session";

/**
 * Auto-inscription publique depuis l'app (première page du tunnel client).
 * Crée le prospect + le compte CLIENT (statut « Prospect appli ») puis ouvre
 * immédiatement la session pour enchaîner sur le tunnel d'onboarding.
 * Seuls les champs d'identité sont acceptés : aucune élévation de privilège.
 */
export const POST = handle(async (req) => {
  const { firstName, lastName, email, phone, password } = await req.json();
  const { user } = await registerFromApp({ firstName, lastName, email, phone, password });
  await createSession(user);
  return ok({ role: user.role, name: `${user.firstName} ${user.lastName}` });
});
