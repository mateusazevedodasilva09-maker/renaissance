/**
 * Bibliothèque d'exercices — alimente le moteur de génération de programmes.
 */
import { listExercises } from "@/modules/programs/program.service";
import ExerciseLibrary from "@/components/admin/ExerciseLibrary";

export const dynamic = "force-dynamic";

export default async function ExercicesPage() {
  const exercises = await listExercises();
  return <ExerciseLibrary initialExercises={JSON.parse(JSON.stringify(exercises))} />;
}
