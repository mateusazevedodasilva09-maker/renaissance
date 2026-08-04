import { handle, ok, requireAuth } from "@/lib/api";
import { recordCoachingSession } from "@/modules/tracking/session-report.service";

/**
 * Enregistre une séance de coaching depuis l'espace coach : présence et
 * ressenti (Bien / Pas bien) de chaque participant, en un seul appel.
 */
export const POST = handle(async (req) => {
  const { error, session } = await requireAuth({ permission: "tracking.manage" });
  if (error) return error;
  const body = await req.json();
  return ok(await recordCoachingSession(body, { authorId: session.userId }), { status: 201 });
});
