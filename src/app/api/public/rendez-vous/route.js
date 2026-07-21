/**
 * Route PUBLIQUE — formulaire de prise de rendez-vous.
 * Crée le prospect + la demande d'appel (remontée dans l'agenda et le CRM).
 */
import { handle, ok } from "@/lib/api";
import { createProspect } from "@/modules/crm/prospect.service";

export const POST = handle(async (req) => {
  const { firstName, lastName, email, phone, goalId, generalNote } = await req.json();
  await createProspect(
    { firstName, lastName, email, phone, goalId, generalNote },
    { source: "FORM" }
  );
  return ok({ received: true }, { status: 201 });
});
