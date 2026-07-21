/**
 * Fait correspondre un objectif (table Goal, libellé libre) au type de dosage
 * attendu par le générateur de programmes (perte_poids / prise_muscle /
 * performance / remise_forme). Permet de construire un programme automatiquement
 * à partir de l'objectif, sans re-sélectionner l'objectif à la main.
 */
export function mapGoalToGenerator(label = "") {
  const s = (label || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
  if (/(perte|mincir|maigrir|seche|cardio|endurance|minceur)/.test(s)) return "perte_poids";
  if (/(muscle|masse|hypertroph|volume|full body|prise)/.test(s)) return "prise_muscle";
  if (/(perf|force|puissance|athlet)/.test(s)) return "performance";
  return "remise_forme";
}
