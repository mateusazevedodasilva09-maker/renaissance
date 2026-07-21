import { handle, ok, requireAuth } from "@/lib/api";
import { replyToFeedback } from "@/modules/clients/feedback.service";

export const PATCH = handle(async (req, { params }) => {
  const { error } = await requireAuth({ permission: "feedback.manage" });
  if (error) return error;
  return ok(await replyToFeedback(params.id, await req.json()));
});
