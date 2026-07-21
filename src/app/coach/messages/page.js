/**
 * Messages de l'espace coach : les feedbacks des inscrits de ses groupes, avec
 * réponse. Réutilise le composant partagé FeedbackInbox. Un ADMIN qui observe
 * un coach (?coach=) voit les messages de CE coach.
 */
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { listFeedbackForStaff } from "@/modules/clients/feedback.service";
import { listCoaches } from "@/modules/coach/coach.service";
import FeedbackInbox from "@/components/admin/FeedbackInbox";

export const dynamic = "force-dynamic";

export default async function CoachMessagesPage({ searchParams }) {
  const session = await getSession();
  if (!session || (session.role !== "ADMIN" && session.role !== "COACH")) {
    redirect("/connexion");
  }

  const isAdmin = session.role === "ADMIN";
  const coaches = isAdmin ? await listCoaches() : [];
  const targetCoachId = isAdmin ? (searchParams?.coach || coaches[0]?.id || null) : session.userId;

  // Toujours borné à un coach précis dans l'espace coach (scope "COACH").
  const feedbacks = await listFeedbackForStaff({ role: "COACH", userId: targetCoachId });
  return <FeedbackInbox initialFeedbacks={JSON.parse(JSON.stringify(feedbacks))} />;
}
