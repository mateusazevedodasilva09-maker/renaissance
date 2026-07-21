/**
 * Fiche client — gestion de l'espace client : objectifs, programmes
 * (génération via le moteur), suivi hebdomadaire.
 * Un coach ne peut ouvrir que les fiches des membres de ses groupes.
 */
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getClient } from "@/modules/clients/client.service";
import { listGoals, listSessionTypes } from "@/modules/sessions/schedule.service";
import { listExercises, ensureClientProgram } from "@/modules/programs/program.service";
import { listGenerators } from "@/modules/programs/generation/registry";
import ClientFile from "@/components/admin/ClientFile";

export const dynamic = "force-dynamic";

export default async function ClientPage({ params }) {
  // Génère automatiquement le programme s'il manque (objectif + niveau du profil),
  // avant de charger la fiche : le coach n'a rien à générer à la main.
  await ensureClientProgram(params.id);

  const [session, client, goals, exercises, sessionTypes] = await Promise.all([
    getSession(),
    getClient(params.id),
    listGoals(),
    listExercises(),
    listSessionTypes(),
  ]);
  if (session?.role === "COACH" && client.group?.coachId !== session.userId) {
    redirect("/admin/clients");
  }
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
