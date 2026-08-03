/**
 * Espace client — le client complète sa fiche d'onboarding (profil + bilan
 * initial) pour que le coach dispose de toutes les infos utiles.
 * Encapsulation : réservé au rôle CLIENT, borné à SON profil. L'allowlist
 * stricte de `updateOwnClientProfile` empêche toute élévation de privilège
 * (jamais enrolled / paid / level / groupe / valeurs forcées par le coach).
 */
import { handle, ok, fail, requireAuth } from "@/lib/api";
import { getClientByUserId, updateOwnClientProfile } from "@/modules/clients/client.service";

export const PATCH = handle(async (req) => {
  const { error, session } = await requireAuth({ roles: ["CLIENT"] });
  if (error) return error;
  const client = await getClientByUserId(session.userId);
  if (!client) return fail("Aucun profil client associé à ce compte.", 404);
  return ok(await updateOwnClientProfile(client.id, await req.json()));
});
