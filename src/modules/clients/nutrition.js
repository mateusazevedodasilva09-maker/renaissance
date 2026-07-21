/**
 * Domaine CLIENTS — calcul de la cible nutrition (macros uniquement).
 *
 * Une seule couche nutrition, volontairement simple : à partir du TDEE
 * (métabolisme actif) et de l'objectif de poids → cible calories + macros,
 * protéine en priorité. Pas de journal alimentaire, pas de base d'aliments.
 *
 * Fonctions pures (aucun accès base) : utilisables côté serveur comme côté
 * client, et recalculées automatiquement dès que le poids change.
 * Les valeurs saisies à la main sur la fiche (calorieTarget…) priment.
 */

// Un kilo de tissu corporel ≈ 7 700 kcal : pilote l'ajustement calorique
// quotidien à partir du rythme hebdomadaire visé (ex. -0,5 kg/sem ≈ -550 kcal/j).
const KCAL_PER_KG = 7700;

// Facteurs d'activité (multiplicateurs du métabolisme de base).
// Source unique : la fiche coach et l'espace client utilisent les mêmes.
export const ACTIVITY_FACTORS = {
  "Sédentaire": 1.2,
  "Légèrement actif": 1.375,
  "Modérément actif": 1.55,
  "Très actif": 1.725,
  "Extrêmement actif": 1.9,
};

/** Métabolisme de base (Mifflin-St Jeor) + métabolisme actif (TDEE). */
export function computeMetabolism({ gender, age, heightCm, weightKg, activityLevel }) {
  if (!age || !heightCm || !weightKg) return null;
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age + (gender === "Femme" ? -161 : 5);
  const factor = ACTIVITY_FACTORS[activityLevel] || 1.375;
  return { base: Math.round(base), active: Math.round(base * factor) };
}

/**
 * Cible calories + macros calculée.
 * @param tdee          métabolisme actif (kcal/j)
 * @param weightKg      poids actuel (kg) — base du calcul de protéines
 * @param weeklyRateKg  objectif hebdo (kg/sem, négatif = perte) ; 0/null = maintien
 * @returns { calories, proteinG, carbG, fatG } ou null si données insuffisantes
 */
export function computeMacroTargets({ tdee, weightKg, weeklyRateKg }) {
  if (!tdee || !weightKg) return null;

  // Ajustement calorique quotidien, borné pour rester tenable et sain :
  // jamais plus de 25 % de déficit ni de 15 % de surplus.
  const rate = Number(weeklyRateKg) || 0;
  let adjustment = (rate * KCAL_PER_KG) / 7;
  adjustment = Math.max(-0.25 * tdee, Math.min(0.15 * tdee, adjustment));
  const calories = Math.round(tdee + adjustment);

  // Protéine en priorité : 2 g/kg en perte de poids (préserver le muscle),
  // 1,8 g/kg sinon. Lipides : 25 % des calories. Glucides : le reste.
  const proteinG = Math.round(weightKg * (rate < 0 ? 2.0 : 1.8));
  const fatG = Math.round((calories * 0.25) / 9);
  const carbG = Math.max(0, Math.round((calories - proteinG * 4 - fatG * 9) / 4));

  return { calories, proteinG, carbG, fatG };
}

/**
 * Détail pédagogique du calcul de la cible : renvoie, en plus des valeurs
 * finales, la suite d'étapes qui explique « combien de calories par jour et
 * comment se répartissent protéines / glucides / lipides sur une journée ».
 * Logique volontairement gardée ici (couche métier) pour rester la source
 * unique, réutilisable côté fiche coach comme côté espace client.
 * @returns { calories, proteinG, carbG, fatG, steps: [{label, detail, value}] }
 *          ou null si les données sont insuffisantes.
 */
export function explainMacroTargets({ tdee, weightKg, weeklyRateKg }) {
  const targets = computeMacroTargets({ tdee, weightKg, weeklyRateKg });
  if (!targets) return null;

  const rate = Number(weeklyRateKg) || 0;
  const rawAdjustment = (rate * KCAL_PER_KG) / 7;
  const adjustment = Math.round(Math.max(-0.25 * tdee, Math.min(0.15 * tdee, rawAdjustment)));
  const proteinPerKg = rate < 0 ? 2.0 : 1.8;
  const kg = Math.round(weightKg);
  const sign = (n) => (n >= 0 ? `+${n}` : `${n}`);

  return {
    ...targets,
    steps: [
      {
        label: "1. Dépense quotidienne (TDEE)",
        detail: "métabolisme de base × facteur d'activité",
        value: `${tdee} kcal/j`,
      },
      {
        label: "2. Ajustement selon l'objectif",
        detail: rate === 0
          ? "maintien du poids : aucun ajustement"
          : `${sign(rate)} kg/sem × 7 700 kcal ÷ 7 j (plafonné à −25 % / +15 %)`,
        value: `${sign(adjustment)} kcal/j`,
      },
      {
        label: "3. Calories à ingérer par jour",
        detail: `${tdee} ${adjustment >= 0 ? "+" : "−"} ${Math.abs(adjustment)}`,
        value: `${targets.calories} kcal/j`,
      },
      {
        label: "Protéines (prioritaires)",
        detail: `${proteinPerKg} g × ${kg} kg de poids`,
        value: `${targets.proteinG} g/j · ${targets.proteinG * 4} kcal`,
      },
      {
        label: "Lipides",
        detail: "25 % des calories ÷ 9 kcal/g",
        value: `${targets.fatG} g/j · ${targets.fatG * 9} kcal`,
      },
      {
        label: "Glucides",
        detail: "calories restantes ÷ 4 kcal/g",
        value: `${targets.carbG} g/j · ${targets.carbG * 4} kcal`,
      },
    ],
  };
}

/**
 * Cible effective d'un client : les valeurs forcées à la main sur la fiche
 * priment champ par champ sur le calcul automatique.
 * @param client  fiche client (calorieTarget… éventuels)
 * @param auto    résultat de computeMacroTargets (ou null)
 */
export function effectiveMacroTargets(client, auto) {
  const calories = client.calorieTarget ?? auto?.calories ?? null;
  return {
    calories,
    proteinG: client.proteinTargetG ?? auto?.proteinG ?? null,
    carbG: client.carbTargetG ?? auto?.carbG ?? null,
    fatG: client.fatTargetG ?? auto?.fatG ?? null,
    // Indique champ par champ si la valeur vient d'une saisie manuelle.
    manual: {
      calories: client.calorieTarget != null,
      proteinG: client.proteinTargetG != null,
      carbG: client.carbTargetG != null,
      fatG: client.fatTargetG != null,
    },
  };
}
