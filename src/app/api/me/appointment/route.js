/**
 * Espace client — le client réserve lui-même son appel découverte (tunnel
 * d'onboarding). Encapsulation : réservé au rôle CLIENT, borné à SON profil.
 * Le créneau réservé apparaît dans le calendrier admin + génère une tâche staff.
 */
import { handle, ok, fail, requireAuth } from "@/lib/api";
import { getClientByUserId } from "@/modules/clients/client.service";
import { bookOwnAppointment } from "@/modules/agenda/appointment.service";

export const POST = handle(async (req) => {
  const { error, session } = await requireAuth({ roles: ["CLIENT"] });
  if (error) return error;
  const client = await getClientByUserId(session.userId);
  if (!client) return fail("Aucun profil client associé à ce compte.", 404);
  const { scheduledAt } = await req.json();
  return ok(await bookOwnAppointment(client.id, { scheduledAt }), { status: 201 });
});
