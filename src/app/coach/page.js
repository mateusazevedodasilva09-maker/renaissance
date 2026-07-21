/**
 * Page d'accueil de l'espace coach : les coachings de la semaine.
 * Encapsulation stricte : un COACH est borné à ses propres groupes ; un ADMIN
 * peut consulter l'interface d'un coach donné (sélecteur), mais la donnée reste
 * bornée à ce coach.
 */
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getCoachDashboard, listCoaches } from "@/modules/coach/coach.service";
import CoachDashboard from "@/components/coach/CoachDashboard";

export const dynamic = "force-dynamic";

export default async function CoachPage({ searchParams }) {
  const session = await getSession();
  if (!session || (session.role !== "ADMIN" && session.role !== "COACH")) {
    redirect("/connexion");
  }

  const isAdmin = session.role === "ADMIN";
  // Le coach ne voit que lui-même ; l'admin peut choisir quel coach observer.
  const coaches = isAdmin ? await listCoaches() : [];
  const selectedCoachId = isAdmin ? (searchParams?.coach || coaches[0]?.id || null) : session.userId;

  const dashboard = selectedCoachId
    ? await getCoachDashboard(selectedCoachId)
    : { groups: [], slots: [] };

  return (
    <CoachDashboard
      dashboard={JSON.parse(JSON.stringify(dashboard))}
      coaches={JSON.parse(JSON.stringify(coaches))}
      selectedCoachId={selectedCoachId}
      isAdmin={isAdmin}
    />
  );
}
