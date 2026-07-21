/**
 * Domaine SUIVI — mesures hebdomadaires des clients.
 * Une entrée par client et par semaine (upsert sur clientId + weekStart).
 */
import prisma from "@/lib/prisma";
import { ApiError } from "@/lib/api";
import { startOfWeek } from "@/lib/dates";

export function listMetrics(clientId) {
  return prisma.weeklyMetric.findMany({
    where: { clientId },
    orderBy: { weekStart: "asc" },
  });
}

export async function upsertMetric(clientId, { weekStart, weightKg, energyLevel, sessionsAttended, sessionsPlanned, notes, custom, coachComment }) {
  const week = startOfWeek(weekStart ? new Date(weekStart) : new Date());
  if (energyLevel !== undefined && energyLevel !== null && (energyLevel < 1 || energyLevel > 10)) {
    throw new ApiError("Le niveau d'énergie doit être entre 1 et 10.");
  }
  const data = {
    ...(weightKg !== undefined && { weightKg: weightKg === null ? null : Number(weightKg) }),
    ...(energyLevel !== undefined && { energyLevel: energyLevel === null ? null : Number(energyLevel) }),
    ...(sessionsAttended !== undefined && { sessionsAttended: Number(sessionsAttended) }),
    ...(sessionsPlanned !== undefined && { sessionsPlanned: Number(sessionsPlanned) }),
    ...(notes !== undefined && { notes }),
    ...(custom !== undefined && { custom }),
    ...(coachComment !== undefined && { coachComment: coachComment?.trim() || null }),
  };
  return prisma.weeklyMetric.upsert({
    where: { clientId_weekStart: { clientId, weekStart: week } },
    update: data,
    create: { clientId, weekStart: week, ...data },
  });
}
