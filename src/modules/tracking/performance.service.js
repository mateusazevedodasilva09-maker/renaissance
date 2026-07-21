/**
 * Domaine SUIVI — performance : force (avec détection automatique de PR),
 * cardio (distance, allure, fréquence cardiaque) et présence aux séances.
 */
import prisma from "@/lib/prisma";
import { ApiError } from "@/lib/api";

// --- Force ------------------------------------------------------------------

/**
 * Enregistre une charge soulevée. Le record personnel (PR) est détecté
 * automatiquement : charge strictement supérieure au maximum précédent
 * du client sur cet exercice.
 */
export async function addStrengthLog(clientId, { exerciseId, date, weightKg, reps, rpe, notes }) {
  if (!exerciseId) throw new ApiError("L'exercice est requis.");
  if (!weightKg || Number(weightKg) <= 0) throw new ApiError("Charge invalide.");
  if (!reps || Number(reps) <= 0) throw new ApiError("Nombre de répétitions invalide.");
  // RPE (effort ressenti 1-10) : optionnel, saisi par le coach en séance.
  if (rpe !== undefined && rpe !== null && rpe !== "" && (Number(rpe) < 1 || Number(rpe) > 10)) {
    throw new ApiError("Le RPE doit être entre 1 et 10.");
  }

  const best = await prisma.strengthLog.aggregate({
    where: { clientId, exerciseId },
    _max: { weightKg: true },
  });
  const isPR = best._max.weightKg == null || Number(weightKg) > best._max.weightKg;

  return prisma.strengthLog.create({
    data: {
      clientId,
      exerciseId,
      date: date ? new Date(date) : new Date(),
      weightKg: Number(weightKg),
      reps: Number(reps),
      rpe: rpe === undefined || rpe === null || rpe === "" ? null : Number(rpe),
      notes: notes || null,
      isPR,
    },
    include: { exercise: true },
  });
}

export function listStrengthLogs(clientId) {
  return prisma.strengthLog.findMany({
    where: { clientId },
    include: { exercise: true },
    orderBy: { date: "asc" },
  });
}

export function deleteStrengthLog(id) {
  return prisma.strengthLog.delete({ where: { id } });
}

// --- Cardio -----------------------------------------------------------------

export function addCardioLog(clientId, { date, distanceKm, paceMinPerKm, avgHeartRate, notes }) {
  return prisma.cardioLog.create({
    data: {
      clientId,
      date: date ? new Date(date) : new Date(),
      distanceKm: distanceKm ? Number(distanceKm) : null,
      paceMinPerKm: paceMinPerKm ? Number(paceMinPerKm) : null,
      avgHeartRate: avgHeartRate ? Number(avgHeartRate) : null,
      notes: notes || null,
    },
  });
}

export function listCardioLogs(clientId) {
  return prisma.cardioLog.findMany({ where: { clientId }, orderBy: { date: "asc" } });
}

export function deleteCardioLog(id) {
  return prisma.cardioLog.delete({ where: { id } });
}

// --- Présence ---------------------------------------------------------------

export function addAttendance(clientId, { date, present = true, label }) {
  if (!date) throw new ApiError("La date de la séance est requise.");
  return prisma.attendance.create({
    data: { clientId, date: new Date(date), present: !!present, label: label || null },
  });
}

export function listAttendances(clientId) {
  return prisma.attendance.findMany({ where: { clientId }, orderBy: { date: "asc" } });
}

/** Taux de présence (0-100) sur l'ensemble des séances enregistrées. */
export async function presenceRate(clientId) {
  const [total, present] = await Promise.all([
    prisma.attendance.count({ where: { clientId } }),
    prisma.attendance.count({ where: { clientId, present: true } }),
  ]);
  return total === 0 ? null : Math.round((present / total) * 100);
}
