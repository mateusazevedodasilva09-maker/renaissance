/**
 * Planning de la semaine du coach : ses coachings jour par jour, et qui il
 * entraîne sur chaque séance (contenu inchangé, désormais dans un onglet dédié).
 */
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getCoachDashboard, listCoaches } from "@/modules/coach/coach.service";
import CoachDashboard from "@/components/coach/CoachDashboard";

export const dynamic = "force-dynamic";

export default async function CoachPlanningPage({ searchParams }) {
  const session = await getSession();
  if (!session || (session.role !== "ADMIN" && session.role !== "COACH")) {
    redirect("/connexion");
  }

  const isAdmin = session.role === "ADMIN";
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
