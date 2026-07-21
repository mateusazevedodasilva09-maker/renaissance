/**
 * CRM — obligations journalières : prospects à appeler / relancer aujourd'hui,
 * triés par priorité. Avec ?from & ?to : prochaines actions pour le calendrier.
 */
import { handle, ok, requireAuth } from "@/lib/api";
import { dailyObligations, listNextActions } from "@/modules/crm/prospect.service";

export const GET = handle(async (req) => {
  const { error } = await requireAuth({ roles: ["ADMIN"] });
  if (error) return error;
  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  if (from || to) return ok(await listNextActions({ from, to }));
  return ok(await dailyObligations());
});
