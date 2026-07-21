/**
 * Objectifs & programmes — « objectif = groupe = programme ».
 * Chaque objectif regroupe les clients qui le partagent et porte UN programme
 * unique. Générer/mettre à jour ce programme le rend visible à tous les clients
 * de l'objectif (sauf si un client a déjà un programme personnel).
 */
import { listGoals } from "@/modules/sessions/schedule.service";
import { listClients } from "@/modules/clients/client.service";
import { getActiveProgramForGoal } from "@/modules/programs/program.service";
import { listGenerators } from "@/modules/programs/generation/registry";
import ObjectiveManager from "@/components/admin/ObjectiveManager";

export const dynamic = "force-dynamic";

export default async function ObjectifsPage() {
  const [goals, clients] = await Promise.all([listGoals(), listClients()]);

  const objectives = await Promise.all(
    goals.map(async (g) => ({
      id: g.id,
      label: g.label,
      description: g.description,
      members: clients
        .filter((c) => c.goals.some((cg) => cg.goal.id === g.id))
        .map((c) => ({ id: c.id, name: `${c.user.firstName} ${c.user.lastName}` })),
      program: await getActiveProgramForGoal(g.id),
    }))
  );

  return (
    <ObjectiveManager
      objectives={JSON.parse(JSON.stringify(objectives))}
      generators={listGenerators()}
    />
  );
}
