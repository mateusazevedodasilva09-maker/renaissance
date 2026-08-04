/**
 * « Qui a besoin de moi » — uniquement les coachés du coach connecté réunissant
 * un signal d'attention (message sans réponse, séance non notée, onboarding
 * incomplet, niveau en baisse). Un ADMIN peut observer un coach via ?coach=.
 */
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { listCoaches, getClientsNeedingAttention } from "@/modules/coach/coach.service";
import AttentionList from "@/components/coach/AttentionList";
import CoachPicker from "@/components/coach/CoachPicker";

export const dynamic = "force-dynamic";

export default async function CoachBesoinPage({ searchParams }) {
  const session = await getSession();
  if (!session || (session.role !== "ADMIN" && session.role !== "COACH")) {
    redirect("/connexion");
  }

  const isAdmin = session.role === "ADMIN";
  const coaches = isAdmin ? await listCoaches() : [];
  const selectedCoachId = isAdmin ? (searchParams?.coach || coaches[0]?.id || null) : session.userId;

  const attention = selectedCoachId ? await getClientsNeedingAttention(selectedCoachId) : [];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Qui a besoin de moi</h1>
          <div className="subtitle">Vos coachés qui demandent votre attention cette semaine.</div>
        </div>
        {isAdmin && <CoachPicker coaches={JSON.parse(JSON.stringify(coaches))} selectedCoachId={selectedCoachId} />}
      </div>
      <AttentionList clients={JSON.parse(JSON.stringify(attention))} />
    </div>
  );
}
