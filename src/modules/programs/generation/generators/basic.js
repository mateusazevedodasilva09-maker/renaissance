/**
 * Générateur "basique" — première stratégie livrée avec l'application.
 * Produit un programme simple à partir de : objectif, niveau, nombre de
 * jours par semaine. Il illustre le contrat du moteur ; la logique métier
 * complète (vos futurs paramètres) viendra s'ajouter comme d'autres
 * générateurs, sans toucher au reste de l'application.
 */

const paramsSchema = [
  {
    name: "goal",
    label: "Objectif principal",
    type: "select",
    options: [
      { value: "perte_poids", label: "Perte de poids" },
      { value: "prise_muscle", label: "Prise de muscle" },
      { value: "remise_forme", label: "Remise en forme" },
      { value: "performance", label: "Performance / Force" },
    ],
    required: true,
  },
  {
    name: "level",
    label: "Niveau (1 = débutant, 5 = avancé)",
    type: "number",
    min: 1,
    max: 5,
    default: 2,
  },
  {
    name: "daysPerWeek",
    label: "Jours d'entraînement par semaine",
    type: "number",
    min: 1,
    max: 6,
    default: 3,
  },
];

// Dosage sets/reps selon l'objectif.
const DOSAGE = {
  perte_poids: { sets: 3, reps: "15-20", restSec: 45 },
  prise_muscle: { sets: 4, reps: "8-12", restSec: 90 },
  remise_forme: { sets: 3, reps: "12-15", restSec: 60 },
  performance: { sets: 5, reps: "3-5", restSec: 180 },
};

/**
 * @param {object} params  { goal, level, daysPerWeek }
 * @param {object} ctx     { exercises } — bibliothèque d'exercices (depuis la BDD)
 */
function generate(params, ctx) {
  const goal = params.goal || "remise_forme";
  const level = Number(params.level) || 2;
  const daysPerWeek = Math.min(Math.max(Number(params.daysPerWeek) || 3, 1), 6);
  const dosage = DOSAGE[goal] || DOSAGE.remise_forme;

  // Exercices adaptés au niveau (marge de ±1), triés par groupe musculaire.
  const pool = ctx.exercises.filter((e) => e.level <= level + 1);
  if (pool.length === 0) throw new Error("Aucun exercice disponible pour ce niveau.");

  const perSession = Math.min(5, Math.max(3, Math.ceil(pool.length / daysPerWeek)));
  const sessions = [];
  for (let day = 0; day < daysPerWeek; day++) {
    const exercises = [];
    for (let i = 0; i < perSession; i++) {
      const exercise = pool[(day * perSession + i) % pool.length];
      exercises.push({
        exerciseId: exercise.id,
        sets: dosage.sets,
        reps: dosage.reps,
        restSec: dosage.restSec,
        position: i,
      });
    }
    sessions.push({ name: `Jour ${day + 1}`, position: day, exercises });
  }

  const goalLabel = paramsSchema[0].options.find((o) => o.value === goal)?.label || goal;
  return { title: `Programme ${goalLabel} — ${daysPerWeek}j/semaine`, sessions };
}

const basicGenerator = {
  key: "basic",
  label: "Générateur basique (objectif / niveau / fréquence)",
  paramsSchema,
  generate,
};

export default basicGenerator;
