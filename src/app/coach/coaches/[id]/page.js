/**
 * Fiche d'un coaché, rendue DANS le shell coach (`/coach`). Réutilise la fiche
 * complète `ClientFile` (profil, programme, suivi, notes, messages) mais bornée
 * aux clients du coach : un coach ne peut ouvrir que les membres de ses groupes.
 */
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getClient } from "@/modules/clients/client.service";
import { listGoals, listSessionTypes } from "@/modules/sessions/schedule.service";
import { listExercises } from "@/modules/programs/program.service";
import { listGenerators } from "@/modules/programs/generation/registry";
import ClientFile from "@/components/admin/ClientFile";

export const dynamic = "force-dynamic";

export default async function CoachClientPage({ params }) {
  const [session, client, goals, exercises, sessionTypes] = await Promise.all([
    getSession(),
    getClient(params.id),
    listGoals(),
    listExercises(),
    listSessionTypes(),
  ]);
  if (!session || (session.role !== "COACH" && session.role !== "ADMIN")) redirect("/connexion");
  // Un coach ne voit que ses propres coachés ; l'admin peut tout consulter.
  if (session.role === "COACH" && client.group?.coachId !== session.userId) redirect("/coach");

  return (
    <ClientFile
      initialClient={JSON.parse(JSON.stringify(client))}
      goals={JSON.parse(JSON.stringify(goals))}
      exercises={JSON.parse(JSON.stringify(exercises))}
      sessionTypes={JSON.parse(JSON.stringify(sessionTypes))}
      generators={listGenerators()}
    />
  );
}
