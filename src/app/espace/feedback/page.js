/**
 * Espace client — messages hebdomadaires au coach (ressenti de la semaine)
 * et réponses du coach.
 */
import { getSession } from "@/lib/session";
import { getClientByUserId } from "@/modules/clients/client.service";
import { listFeedbackForClient } from "@/modules/clients/feedback.service";
import FeedbackView from "@/components/espace/FeedbackView";

export const dynamic = "force-dynamic";

export default async function FeedbackPage() {
  const session = await getSession();
  const client = await getClientByUserId(session.userId);
  const feedbacks = await listFeedbackForClient(client.id);
  return <FeedbackView initialFeedbacks={JSON.parse(JSON.stringify(feedbacks))} />;
}
