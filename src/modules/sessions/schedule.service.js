/**
 * Domaine SÉANCES — types de séances de groupe et planning hebdomadaire.
 * Le mapping « jour → thématique » est entièrement configurable par l'admin.
 */
import prisma from "@/lib/prisma";
import { ApiError } from "@/lib/api";
import { WEEKDAYS } from "@/lib/dates";

// --- Types de séances -------------------------------------------------------

// `include` commun à toutes les lectures de SessionType : les objectifs liés
// ET le contenu type de la séance (exercices choisis dans la bibliothèque,
// triés par ordre d'exécution). Centralisé ici pour que la création, la mise
// à jour et les listings renvoient toujours la même forme d'objet.
// Rappel Prisma : `orderBy` se place au même niveau que `include`, DANS la
// relation à trier (jamais à l'intérieur d'un objet `include`).
const typeInclude = {
  goalLinks: { include: { goal: true } },
  exercises: { orderBy: { position: "asc" }, include: { exercise: true } },
};

export function listSessionTypes() {
  return prisma.sessionType.findMany({
    include: typeInclude,
    orderBy: { name: "asc" },
  });
}

/**
 * Normalise la liste d'exercices reçue de l'UI en lignes SessionTypeExercise.
 * L'ordre du tableau fait foi : la position est l'index. Les paramètres non
 * fournis retombent sur les défauts du schéma (3 × 10, repos libre).
 */
function buildExerciseRows(exercises = []) {
  return exercises
    .filter((e) => e?.exerciseId)
    .map((e, index) => ({
      exerciseId: e.exerciseId,
      position: index,
      sets: Number(e.sets) || 3,
      reps: String(e.reps || "10"),
      restSec: e.restSec ? Number(e.restSec) : null,
    }));
}

export async function createSessionType({ name, color, description, goalIds = [], exercises = [] }) {
  if (!name?.trim()) throw new ApiError("Le nom est requis.");
  return prisma.sessionType.create({
    data: {
      name: name.trim(),
      color: color || "#e05d38",
      description,
      goalLinks: { create: goalIds.map((goalId) => ({ goalId })) },
      // Contenu type de la séance, choisi dans la bibliothèque d'exercices.
      exercises: { create: buildExerciseRows(exercises) },
    },
    include: typeInclude,
  });
}

export async function updateSessionType(id, { name, color, description, isActive, goalIds, exercises }) {
  if (goalIds) {
    await prisma.sessionTypeGoal.deleteMany({ where: { sessionTypeId: id } });
    await prisma.sessionTypeGoal.createMany({ data: goalIds.map((goalId) => ({ sessionTypeId: id, goalId })) });
  }
  // Comme pour les objectifs : si l'UI envoie une liste d'exercices, elle
  // remplace intégralement l'ancienne (plus simple et sans ambiguïté côté
  // formulaire ; les volumes sont minuscules, la réécriture est sans coût).
  if (exercises) {
    await prisma.sessionTypeExercise.deleteMany({ where: { sessionTypeId: id } });
    const rows = buildExerciseRows(exercises).map((r) => ({ ...r, sessionTypeId: id }));
    if (rows.length > 0) await prisma.sessionTypeExercise.createMany({ data: rows });
  }
  return prisma.sessionType.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(color !== undefined && { color }),
      ...(description !== undefined && { description }),
      ...(isActive !== undefined && { isActive }),
    },
    include: typeInclude,
  });
}

// --- Créneaux hebdomadaires --------------------------------------------------

export function listSlots() {
  // Chaque créneau embarque sa thématique complète (objectifs + contenu type
  // de la séance) : les agendas client et coach peuvent ainsi afficher le
  // détail des exercices au clic sans requête supplémentaire.
  return prisma.weeklySlot.findMany({
    include: { sessionType: { include: typeInclude } },
    orderBy: [{ weekday: "asc" }, { startTime: "asc" }],
  });
}

export function createSlot({ weekday, startTime, endTime, sessionTypeId, location, capacity }) {
  if (!WEEKDAYS.includes(weekday)) throw new ApiError("Jour invalide.");
  if (!/^\d{2}:\d{2}$/.test(startTime || "") || !/^\d{2}:\d{2}$/.test(endTime || "")) {
    throw new ApiError("Horaires invalides (format HH:MM).");
  }
  if (!sessionTypeId) throw new ApiError("Type de séance requis.");
  // Même `include` que listSlots() : le créneau renvoyé est directement
  // affichable (carte cliquable avec contenu type) sans recharger la page.
  return prisma.weeklySlot.create({
    data: { weekday, startTime, endTime, sessionTypeId, location, capacity: capacity || null },
    include: { sessionType: { include: typeInclude } },
  });
}

export function updateSlot(id, data) {
  const allowed = ["weekday", "startTime", "endTime", "sessionTypeId", "location", "capacity", "isActive"];
  const patch = Object.fromEntries(Object.entries(data).filter(([k]) => allowed.includes(k)));
  return prisma.weeklySlot.update({ where: { id }, data: patch, include: { sessionType: { include: typeInclude } } });
}

export function deleteSlot(id) {
  return prisma.weeklySlot.delete({ where: { id } });
}

/**
 * Planning hebdomadaire d'un client : uniquement les créneaux actifs dont le
 * type de séance correspond à au moins un de ses objectifs.
 * (Un type sans objectif associé est considéré ouvert à tous.)
 */
export async function getClientWeeklySchedule(clientId) {
  const clientGoals = await prisma.clientGoal.findMany({ where: { clientId } });
  const goalIds = new Set(clientGoals.map((g) => g.goalId));
  const slots = await listSlots();
  return slots.filter((slot) => {
    if (!slot.isActive || !slot.sessionType.isActive) return false;
    const links = slot.sessionType.goalLinks;
    if (links.length === 0) return true; // séance ouverte à tous
    return links.some((l) => goalIds.has(l.goalId));
  });
}

/**
 * Planning hebdomadaire d'un coach : les créneaux actifs dont le type de
 * séance correspond aux objectifs des groupes qu'il encadre.
 * (Un type sans objectif associé est considéré ouvert à tous.)
 */
export async function getCoachWeeklySchedule(coachUserId) {
  const groups = await prisma.group.findMany({
    where: { coachId: coachUserId, isActive: true },
    select: { goalId: true },
  });
  const goalIds = new Set(groups.map((g) => g.goalId).filter(Boolean));
  const slots = await listSlots();
  return slots.filter((slot) => {
    if (!slot.isActive || !slot.sessionType.isActive) return false;
    const links = slot.sessionType.goalLinks;
    if (links.length === 0) return true; // séance ouverte à tous
    return links.some((l) => goalIds.has(l.goalId));
  });
}

// --- Objectifs ---------------------------------------------------------------

export function listGoals() {
  return prisma.goal.findMany({ orderBy: { label: "asc" } });
}

export async function createGoal({ label, description }) {
  if (!label?.trim()) throw new ApiError("Le libellé est requis.");
  const key = label
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
  return prisma.goal.create({ data: { key, label: label.trim(), description } });
}

/**
 * Supprime un objectif — refusé s'il est encore utilisé (clients, séances,
 * groupes, programmes ou prospects), pour éviter toute suppression en cascade
 * silencieuse. L'admin doit d'abord réattribuer, puis supprimer.
 */
export async function deleteGoal(id) {
  const [clients, types, groups, programs, prospects] = await Promise.all([
    prisma.clientGoal.count({ where: { goalId: id } }),
    prisma.sessionTypeGoal.count({ where: { goalId: id } }),
    prisma.group.count({ where: { goalId: id } }),
    prisma.program.count({ where: { goalId: id } }),
    prisma.prospect.count({ where: { goalId: id } }),
  ]);
  if (clients || types || groups || programs || prospects) {
    throw new ApiError(
      "Objectif encore utilisé (clients, séances, groupes ou programmes). Réattribuez-les avant de le supprimer."
    );
  }
  return prisma.goal.delete({ where: { id } });
}
