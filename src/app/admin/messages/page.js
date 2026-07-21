/**
 * Messages — feedbacks hebdomadaires des inscrits.
 * L'admin voit tout ; le coach voit ceux de ses groupes.
 */
import { getSession } from "@/lib/session";
import { listFeedbackForStaff } from "@/modules/clients/feedback.service";
import FeedbackInbox from "@/components/admin/FeedbackInbox";

export const dynamic = "force-dynamic";

export default async function MessagesPage() {
  const session = await getSession();
  const feedbacks = await listFeedbackForStaff({ role: session.role, userId: session.userId });
  return <FeedbackInbox initialFeedbacks={JSON.parse(JSON.stringify(feedbacks))} />;
}
