/**
 * Bibliothèque d'exercices, côté client : consultation seule
 * (recherche, filtres, fiches avec GIF animé). Pas d'ajout possible.
 */
import { listExercises } from "@/modules/programs/program.service";
import ExerciseLibrary from "@/components/admin/ExerciseLibrary";

export const dynamic = "force-dynamic";

export default async function EspaceExercicesPage() {
  const exercises = await listExercises();
  return <ExerciseLibrary initialExercises={JSON.parse(JSON.stringify(exercises))} readOnly />;
}
