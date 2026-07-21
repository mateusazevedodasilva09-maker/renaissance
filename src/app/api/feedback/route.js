/**
 * Feedback hebdomadaire — côté staff.
 * ADMIN : tous les messages ; COACH : ceux des inscrits de ses groupes.
 */
import { handle, ok, requireAuth } from "@/lib/api";
import { listFeedbackForStaff } from "@/modules/clients/feedback.service";

export const GET = handle(async () => {
  const { error, session } = await requireAuth({ permission: "feedback.manage" });
  if (error) return error;
  return ok(await listFeedbackForStaff({ role: session.role, userId: session.userId }));
});
