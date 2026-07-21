/**
 * Domaine SUIVI — rapports de séance & progression de niveau.
 *
 * Remplace l'ancien « rapport de la semaine » : le coach note chaque séance
 * d'un apprenti selon son ressenti (BON / NEUTRE / MAUVAIS). L'ensemble des
 * rapports d'une même semaine pilote la variation de niveau du client, à
 * OBJECTIF CONSTANT :
 *   - toutes les séances de la semaine « bonnes »   → niveau +1
 *   - au moins une séance « mauvaise »              → niveau -1
 *   - sinon (neutre ou mélange sans mauvaise)       → niveau inchangé
 * Le niveau reste borné entre 1 et 5 (aligné sur Exercise.level).
 *
 * La progression est IDEMPOTENTE : chaque semaine ne s'applique qu'une fois
 * (table WeeklyLevelChange). Ajouter, modifier ou supprimer un rapport
 * recalcule proprement la semaine sans jamais double-compter.
 */
import prisma from "@/lib/prisma";
import { ApiError } from "@/lib/api";
import { startOfWeek } from "@/lib/dates";
import { addStrengthLog } from "@/modules/tracking/performance.service";

const MIN_LEVEL = 1;
const MAX_LEVEL = 5;
const clampLevel = (n) => Math.max(MIN_LEVEL, Math.min(MAX_LEVEL, n));

/** Règle de variation hebdomadaire à partir des rapports d'une semaine. */
function weeklyDelta(reports) {
  if (reports.length === 0) return { delta: 0, reason: "aucune séance notée" };
  if (reports.some((r) => r.rating === "MAUVAIS")) {
    return { delta: -1, reason: "au moins une séance mauvaise" };
  }
  if (reports.every((r) => r.rating === "BON")) {
    return { delta: +1, reason: "toutes les séances bonnes" };
  }
  return { delta: 0, reason: "séances neutres" };
}

/**
 * Recalcule et applique la variation de niveau d'un client pour une semaine.
 * Idempotent et robuste au bornage : on restaure d'abord le niveau « avant
 * cette semaine » (en retirant le delta déjà appliqué), puis on ré-applique le
 * delta voulu en le bornant à [1, 5].
 * @returns le client mis à jour (id, level).
 */
export async function recomputeWeeklyLevel(clientId, weekStart) {
  const week = startOfWeek(weekStart);

  const [client, reports, previous] = await Promise.all([
    prisma.client.findUnique({ where: { id: clientId }, select: { id: true, level: true } }),
    prisma.sessionReport.findMany({ where: { clientId, weekStart: week }, select: { rating: true } }),
    prisma.weeklyLevelChange.findUnique({ where: { clientId_weekStart: { clientId, weekStart: week } } }),
  ]);
  if (!client) throw new ApiError("Client introuvable.", 404);

  const appliedBefore = previous?.delta ?? 0;
  // Niveau tel qu'il serait sans l'effet (déjà appliqué) de cette semaine.
  const baseLevel = clampLevel((client.level ?? 1) - appliedBefore);

  const { delta, reason } = weeklyDelta(reports);
  const newLevel = clampLevel(baseLevel + delta);
  const appliedDelta = newLevel - baseLevel; // 0 si borné

  await prisma.$transaction([
    prisma.client.update({ where: { id: clientId }, data: { level: newLevel } }),
    prisma.weeklyLevelChange.upsert({
      where: { clientId_weekStart: { clientId, weekStart: week } },
      create: { clientId, weekStart: week, delta: appliedDelta, reason },
      update: { delta: appliedDelta, reason },
    }),
  ]);

  return { id: clientId, level: newLevel, delta: appliedDelta, reason };
}

/**
 * Crée un rapport de séance. Si la séance est « bonne » et qu'un PR est fourni,
 * on enregistre un StrengthLog (détection isPR automatique) qui alimente le
 * graphe de force du client, et on le rattache au rapport.
 * @param pr  { exerciseId, weightKg, reps, rpe? } — facultatif, ignoré si la
 *            séance n'est pas « bonne ».
 */
export async function createSessionReport(clientId, { date, rating, note, sessionTypeId, authorId, pr }) {
  if (!["BON", "NEUTRE", "MAUVAIS"].includes(rating)) {
    throw new ApiError("Ressenti de séance invalide (BON / NEUTRE / MAUVAIS).");
  }
  const when = date ? new Date(date) : new Date();
  const week = startOfWeek(when);

  // PR optionnel : uniquement pour une séance « bonne » et si un exercice est
  // sélectionné. On réutilise la logique de performance (isPR, graphe).
  let strengthLogId = null;
  if (rating === "BON" && pr && pr.exerciseId && pr.weightKg && pr.reps) {
    const log = await addStrengthLog(clientId, {
      exerciseId: pr.exerciseId,
      date: when,
      weightKg: pr.weightKg,
      reps: pr.reps,
      rpe: pr.rpe,
      notes: "Enregistré depuis un rapport de séance",
    });
    strengthLogId = log.id;
  }

  const report = await prisma.sessionReport.create({
    data: {
      clientId,
      date: when,
      weekStart: week,
      rating,
      note: note || null,
      sessionTypeId: sessionTypeId || null,
      authorId: authorId || null,
      strengthLogId,
    },
    include: { sessionType: true, strengthLog: { include: { exercise: true } } },
  });

  // La semaine change → on ré-évalue le niveau (idempotent).
  const levelUpdate = await recomputeWeeklyLevel(clientId, week);
  return { report, level: levelUpdate };
}

/** Historique des rapports de séance d'un client (le plus récent d'abord). */
export function listSessionReports(clientId) {
  return prisma.sessionReport.findMany({
    where: { clientId },
    include: { sessionType: true, strengthLog: { include: { exercise: true } } },
    orderBy: { date: "desc" },
  });
}

/** Supprime un rapport puis recalcule le niveau de sa semaine. */
export async function deleteSessionReport(id) {
  const existing = await prisma.sessionReport.findUnique({
    where: { id },
    select: { clientId: true, weekStart: true },
  });
  if (!existing) throw new ApiError("Rapport introuvable.", 404);
  await prisma.sessionReport.delete({ where: { id } });
  const level = await recomputeWeeklyLevel(existing.clientId, existing.weekStart);
  return { id, level: level.level };
}
