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

// Regroupement des exercices par chaîne musculaire, déduit de `bodyPart`
// (dataset importé) : sert à composer des séances cohérentes avec l'objectif.
const BUCKET = {
  chest: "push", shoulders: "push", "upper arms": "push",
  back: "pull", "lower arms": "pull",
  "upper legs": "legs", "lower legs": "legs",
  waist: "core", cardio: "cardio", neck: "other",
};
const bucketOf = (e) => BUCKET[(e.bodyPart || "").toLowerCase()] || "other";

const BUCKET_LABEL = {
  push: "Poussée (pectoraux, épaules, triceps)",
  pull: "Tirage (dos, biceps)",
  legs: "Jambes",
  core: "Gainage & abdominaux",
  cardio: "Cardio",
  other: "Complémentaire",
};

// Stratégie de composition des séances selon l'objectif :
//  - split       : une chaîne musculaire dédiée par jour (hypertrophie) ;
//  - emphasize   : full body, mais en insistant dans cet ordre de chaînes ;
//  - circuit     : nomme les séances « circuit » (perte de poids).
const GOAL_FOCUS = {
  prise_muscle: { split: ["push", "pull", "legs", "core"] },
  performance: { emphasize: ["legs", "pull", "push"] },
  perte_poids: { emphasize: ["cardio", "legs", "push", "pull", "core"], circuit: true },
  remise_forme: { emphasize: ["push", "pull", "legs", "core", "cardio"] },
};

// Décale un tableau de `n` crans → chaque jour propose des exercices différents
// à partir des mêmes réserves.
const rotate = (arr, n) => (arr.length ? arr.slice(n % arr.length).concat(arr.slice(0, n % arr.length)) : arr);

// Entrelace plusieurs listes (full body : un exercice de chaque chaîne à tour de rôle).
function interleave(lists) {
  const out = [];
  const max = Math.max(0, ...lists.map((l) => l.length));
  for (let i = 0; i < max; i++) for (const l of lists) if (i < l.length) out.push(l[i]);
  return out;
}

/**
 * @param {object} params  { goal, level, daysPerWeek }
 * @param {object} ctx     { exercises } — bibliothèque d'exercices (depuis la BDD)
 *
 * Le programme est construit EN FONCTION DE L'OBJECTIF : les exercices sont
 * choisis et regroupés selon la chaîne musculaire pertinente (split
 * hypertrophie, insistance force, circuit full body / cardio pour la perte de
 * poids…), avec le dosage séries/répétitions adapté.
 */
function generate(params, ctx) {
  const goal = params.goal || "remise_forme";
  const level = Number(params.level) || 2;
  const daysPerWeek = Math.min(Math.max(Number(params.daysPerWeek) || 3, 1), 6);
  const dosage = DOSAGE[goal] || DOSAGE.remise_forme;
  const focus = GOAL_FOCUS[goal] || GOAL_FOCUS.remise_forme;

  // Exercices adaptés au niveau (marge de +1).
  const pool = ctx.exercises.filter((e) => e.level <= level + 1);
  if (pool.length === 0) throw new Error("Aucun exercice disponible pour ce niveau.");

  // Réserves par chaîne musculaire.
  const byBucket = pool.reduce((m, e) => {
    const b = bucketOf(e);
    (m[b] ||= []).push(e);
    return m;
  }, {});

  const perSession = Math.min(6, Math.max(3, Math.ceil(pool.length / daysPerWeek)));

  // Liste ordonnée de candidats pour un jour donné, selon la stratégie.
  function candidatesForDay(day) {
    if (focus.split) {
      const primary = focus.split[day % focus.split.length];
      const rest = Object.keys(byBucket).filter((b) => b !== primary);
      return [...rotate(byBucket[primary] || [], day), ...rest.flatMap((b) => rotate(byBucket[b] || [], day))];
    }
    const order = focus.emphasize || ["push", "pull", "legs", "core"];
    return interleave(order.map((b) => rotate(byBucket[b] || [], day)));
  }

  const sessions = [];
  for (let day = 0; day < daysPerWeek; day++) {
    const seen = new Set();
    const exercises = [];
    for (const e of candidatesForDay(day)) {
      if (seen.has(e.id)) continue;
      seen.add(e.id);
      exercises.push({ exerciseId: e.id, sets: dosage.sets, reps: dosage.reps, restSec: dosage.restSec, position: exercises.length });
      if (exercises.length >= perSession) break;
    }
    const name = focus.split
      ? `Jour ${day + 1} — ${BUCKET_LABEL[focus.split[day % focus.split.length]]}`
      : `Jour ${day + 1} — ${focus.circuit ? "Circuit full body" : "Full body"}`;
    sessions.push({ name, position: day, exercises });
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
