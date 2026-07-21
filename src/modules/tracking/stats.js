/**
 * Domaine SUIVI — statistiques enrichies (fonctions pures, aucun accès base).
 *
 * Transforme l'historique brut (charges, poids hebdo) en indicateurs qui
 * parlent : 1RM estimé, volume d'entraînement, moyenne mobile du poids et
 * projection vers l'objectif. Utilisées par la fiche client côté coach.
 */

/**
 * 1RM estimé (formule d'Epley) : charge maximale théorique sur 1 répétition.
 * Fiable jusqu'à ~10 reps ; au-delà l'estimation reste indicative.
 */
export function estimate1RM(weightKg, reps) {
  if (!weightKg || !reps) return null;
  if (reps <= 1) return weightKg;
  return Math.round(weightKg * (1 + reps / 30) * 2) / 2; // arrondi au 0,5 kg
}

/**
 * Meilleur 1RM estimé par exercice, trié du plus lourd au plus léger.
 * @param strengthLogs  logs avec `exercise` inclus
 * @returns [{ exerciseId, name, oneRm, weightKg, reps, date }]
 */
export function best1RMs(strengthLogs) {
  const byExercise = {};
  for (const log of strengthLogs) {
    const oneRm = estimate1RM(log.weightKg, log.reps);
    if (oneRm == null) continue;
    const current = byExercise[log.exerciseId];
    if (!current || oneRm > current.oneRm) {
      byExercise[log.exerciseId] = {
        exerciseId: log.exerciseId,
        name: log.exercise?.name || "?",
        oneRm,
        weightKg: log.weightKg,
        reps: log.reps,
        date: log.date,
      };
    }
  }
  return Object.values(byExercise).sort((a, b) => b.oneRm - a.oneRm);
}

/**
 * Volume d'entraînement par semaine (somme charge × reps), sur les
 * `weeks` dernières semaines. Le volume qui monte = la progression qui dure.
 * @returns [{ weekStart: Date, volume: number }]
 */
export function weeklyVolumes(strengthLogs, weeks = 8) {
  const byWeek = {};
  for (const log of strengthLogs) {
    const week = startOfWeekLocal(new Date(log.date));
    const key = week.getTime();
    byWeek[key] = (byWeek[key] || 0) + log.weightKg * log.reps;
  }
  return Object.entries(byWeek)
    .map(([t, volume]) => ({ weekStart: new Date(Number(t)), volume: Math.round(volume) }))
    .sort((a, b) => a.weekStart - b.weekStart)
    .slice(-weeks);
}

/** Lundi 00:00 local de la semaine du jour donné (autonome : fonction pure). */
function startOfWeekLocal(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
}

/**
 * Moyenne mobile sur `window` points : lisse les fluctuations d'eau et de
 * pesée pour montrer la vraie tendance du poids.
 * @param points [{ label, value }] — les valeurs nulles sont ignorées
 */
export function movingAverage(points, window = 3) {
  const valid = points.filter((p) => p.value != null);
  return valid.map((p, i) => {
    const slice = valid.slice(Math.max(0, i - window + 1), i + 1);
    const avg = slice.reduce((sum, x) => sum + x.value, 0) / slice.length;
    return { label: p.label, value: Math.round(avg * 10) / 10 };
  });
}

/**
 * Projection de l'objectif de poids à partir de la tendance récente
 * (régression linéaire sur les 6 dernières mesures hebdomadaires).
 *
 * @returns null si données insuffisantes, sinon :
 *   { slopePerWeek, onTrack, projectedDate, weeksNeeded, atDeadlineKg }
 *   - slopePerWeek : tendance actuelle (kg/semaine, négatif = perte)
 *   - projectedDate : date estimée d'atteinte de la cible (null si tendance opposée)
 *   - atDeadlineKg  : poids projeté à l'échéance (si échéance définie)
 */
export function weightProjection({ metrics, targetWeightKg, objectiveDeadline }) {
  if (!targetWeightKg) return null;
  const points = metrics
    .filter((m) => m.weightKg != null)
    .slice(-6)
    .map((m) => ({ t: new Date(m.weekStart).getTime(), w: m.weightKg }));
  if (points.length < 3) return null;

  // Régression linéaire simple (moindres carrés) : pente en kg / semaine.
  const WEEK = 7 * 24 * 60 * 60 * 1000;
  const n = points.length;
  const meanT = points.reduce((s, p) => s + p.t, 0) / n;
  const meanW = points.reduce((s, p) => s + p.w, 0) / n;
  const denom = points.reduce((s, p) => s + (p.t - meanT) ** 2, 0);
  if (denom === 0) return null;
  const slope = points.reduce((s, p) => s + (p.t - meanT) * (p.w - meanW), 0) / denom;
  const slopePerWeek = Math.round(slope * WEEK * 100) / 100;

  const current = points[n - 1].w;
  const remaining = targetWeightKg - current; // négatif = il faut perdre

  // La tendance va-t-elle dans le sens de l'objectif ?
  const onTrack = remaining === 0 || (remaining < 0 && slopePerWeek < -0.05) || (remaining > 0 && slopePerWeek > 0.05);

  let projectedDate = null;
  let weeksNeeded = null;
  if (onTrack && slopePerWeek !== 0) {
    weeksNeeded = Math.ceil(remaining / slopePerWeek);
    projectedDate = new Date(Date.now() + weeksNeeded * WEEK);
  }

  let atDeadlineKg = null;
  if (objectiveDeadline) {
    const weeksToDeadline = (new Date(objectiveDeadline) - Date.now()) / WEEK;
    if (weeksToDeadline > 0) atDeadlineKg = Math.round((current + slopePerWeek * weeksToDeadline) * 10) / 10;
  }

  return { slopePerWeek, onTrack, projectedDate, weeksNeeded, atDeadlineKg, currentWeightKg: current };
}
