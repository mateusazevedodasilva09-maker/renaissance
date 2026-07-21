/**
 * Domaine SÉANCES — types de séances de groupe et planning hebdomadaire.
 * Le mapping « jour → thématique » est entièrement configurable par l'admin.
 */
import prisma from "@/lib/prisma";
import { ApiError } from "@/lib/api";
import { WEEKDAYS, startOfWeek, addDays } from "@/lib/dates";

// Récurrence des créneaux : une séance récurrente se répète chaque semaine
// pendant ~1 mois (4 semaines) à partir de sa date d'ancrage ; une séance
// ponctuelle n'a qu'une seule occurrence, à sa date.
const RECUR_DAYS = 28;
// Parse une valeur date en LOCAL : une chaîne « YYYY-MM-DD » (input date) serait
// sinon interprétée en UTC → décalage d'un jour dans les fuseaux négatifs.
const toLocalDate = (v) => {
  if (v instanceof Date) return v;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(v || ""));
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date(v);
};
const startOfDay = (d) => { const x = toLocalDate(d); x.setHours(0, 0, 0, 0); return x; };
const sameDay = (a, b) => startOfDay(a).getTime() === startOfDay(b).getTime();

/** Le créneau a-t-il une occurrence à cette date précise ? */
export function slotOccursOnDate(slot, date) {
  const wd = WEEKDAYS[(new Date(date).getDay() + 6) % 7];
  if (slot.oneOff) return slot.startDate ? sameDay(slot.startDate, date) : false;
  if (slot.weekday !== wd) return false;
  if (!slot.startDate) return true; // ancien créneau → récurrent illimité
  const s = startOfDay(slot.startDate);
  return startOfDay(date) >= s && startOfDay(date) <= addDays(s, RECUR_DAYS);
}

/** Le créneau est-il actif au cours de la semaine (lundi = `weekStart`) ? */
function slotActiveInWeek(slot, weekStart) {
  const wkStart = startOfDay(weekStart);
  const wkEnd = addDays(wkStart, 6);
  if (slot.oneOff) {
    if (!slot.startDate) return false;
    const d = startOfDay(slot.startDate);
    return d >= wkStart && d <= wkEnd;
  }
  if (!slot.startDate) return true; // récurrent illimité (legacy)
  const s = startOfDay(slot.startDate);
  return s <= wkEnd && addDays(s, RECUR_DAYS) >= wkStart; // fenêtre ∩ semaine
}

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

// `include` commun aux lectures de créneau : la thématique complète (objectifs
// + contenu type) ET le groupe explicitement rattaché (avec son coach et son
// objectif). Les agendas client/coach et le planning admin affichent ainsi le
// détail et le groupe sans requête supplémentaire.
const slotInclude = {
  sessionType: { include: typeInclude },
  group: {
    include: {
      coach: { select: { id: true, firstName: true, lastName: true } },
      goal: true,
    },
  },
};

/**
 * Garde-fou : un coach ne peut pas avoir deux séances qui se chevauchent le
 * même jour. Quand un créneau est placé sur un groupe, on vérifie que le coach
 * de ce groupe n'a pas déjà, ce jour-là, un autre créneau (sur l'un de ses
 * groupes) dont l'horaire chevauche le nouveau.
 * Comparaison lexicale sur "HH:MM" (zéro-paddé) : chevauchement ⇔
 * aStart < bEnd && bStart < aEnd.
 */
async function assertCoachFree({ groupId, weekday, startTime, endTime, ignoreSlotId }) {
  if (!groupId) return; // pas de placement explicite → pas de contrainte coach
  const group = await prisma.group.findUnique({ where: { id: groupId }, select: { coachId: true } });
  const coachId = group?.coachId;
  if (!coachId) return; // groupe sans coach attitré → rien à vérifier

  const sameDay = await prisma.weeklySlot.findMany({
    where: {
      weekday,
      isActive: true,
      group: { coachId }, // créneaux placés sur un groupe encadré par ce coach
      ...(ignoreSlotId && { id: { not: ignoreSlotId } }),
    },
    select: { startTime: true, endTime: true, group: { select: { name: true } } },
  });

  const clash = sameDay.find((s) => startTime < s.endTime && s.startTime < endTime);
  if (clash) {
    throw new ApiError(
      `Ce coach a déjà une séance ce jour-là de ${clash.startTime} à ${clash.endTime}` +
        ` (groupe « ${clash.group?.name ?? "?"} »). Choisissez un autre créneau.`
    );
  }
}

export function listSlots() {
  return prisma.weeklySlot.findMany({
    include: slotInclude,
    orderBy: [{ weekday: "asc" }, { startTime: "asc" }],
  });
}

export async function createSlot({ weekday, startTime, endTime, sessionTypeId, location, capacity, groupId, oneOff, startDate }) {
  if (!/^\d{2}:\d{2}$/.test(startTime || "") || !/^\d{2}:\d{2}$/.test(endTime || "")) {
    throw new ApiError("Horaires invalides (format HH:MM).");
  }
  if (startTime >= endTime) throw new ApiError("L'heure de fin doit être après l'heure de début.");
  if (!sessionTypeId) throw new ApiError("Type de séance requis.");

  const once = !!oneOff;
  let anchor;
  let day = weekday;
  if (once) {
    // Séance ponctuelle : la date choisie est obligatoire ; on en déduit le jour.
    if (!startDate) throw new ApiError("Choisissez une date pour la séance ponctuelle.");
    anchor = startOfDay(startDate);
    day = WEEKDAYS[(anchor.getDay() + 6) % 7];
  } else {
    // Séance récurrente (~1 mois) : ancre = date fournie ou aujourd'hui.
    if (!WEEKDAYS.includes(day)) throw new ApiError("Jour invalide.");
    anchor = startOfDay(startDate || new Date());
  }

  await assertCoachFree({ groupId: groupId || null, weekday: day, startTime, endTime });
  return prisma.weeklySlot.create({
    data: {
      weekday: day, startTime, endTime, sessionTypeId,
      location, capacity: capacity || null, groupId: groupId || null,
      oneOff: once, startDate: anchor,
    },
    include: slotInclude,
  });
}

export async function updateSlot(id, data) {
  const allowed = ["weekday", "startTime", "endTime", "sessionTypeId", "location", "capacity", "isActive", "groupId", "oneOff", "startDate"];
  const patch = Object.fromEntries(Object.entries(data).filter(([k]) => allowed.includes(k)));
  if ("groupId" in patch) patch.groupId = patch.groupId || null;
  if ("startDate" in patch && patch.startDate) patch.startDate = startOfDay(patch.startDate);
  // Séance ponctuelle : le jour se déduit de la date.
  if (patch.oneOff && patch.startDate) patch.weekday = WEEKDAYS[(patch.startDate.getDay() + 6) % 7];
  // Revalider le chevauchement horaire du coach si le placement ou l'horaire change.
  if (["groupId", "weekday", "startTime", "endTime"].some((k) => k in patch)) {
    const current = await prisma.weeklySlot.findUnique({
      where: { id },
      select: { weekday: true, startTime: true, endTime: true, groupId: true },
    });
    const next = { ...current, ...patch };
    await assertCoachFree({
      groupId: next.groupId,
      weekday: next.weekday,
      startTime: next.startTime,
      endTime: next.endTime,
      ignoreSlotId: id,
    });
  }
  return prisma.weeklySlot.update({ where: { id }, data: patch, include: slotInclude });
}

export function deleteSlot(id) {
  return prisma.weeklySlot.delete({ where: { id } });
}

/**
 * Planning hebdomadaire d'un client : créneaux actifs visibles pour lui.
 *  - créneau placé explicitement sur un groupe → réservé aux membres de CE groupe ;
 *  - créneau non placé (groupId nul) → repli historique par objectif
 *    (visible si le type de séance correspond à un objectif du client ;
 *    un type sans objectif est ouvert à tous).
 */
export async function getClientWeeklySchedule(clientId) {
  const [client, clientGoals, slots] = await Promise.all([
    prisma.client.findUnique({ where: { id: clientId }, select: { groupId: true } }),
    prisma.clientGoal.findMany({ where: { clientId } }),
    listSlots(),
  ]);
  const goalIds = new Set(clientGoals.map((g) => g.goalId));
  const week = startOfWeek();
  return slots.filter((slot) => {
    if (!slot.isActive || !slot.sessionType.isActive) return false;
    if (!slotActiveInWeek(slot, week)) return false; // récurrence bornée / ponctuelle
    if (slot.groupId) return slot.groupId === client?.groupId; // placement explicite
    const links = slot.sessionType.goalLinks;
    if (links.length === 0) return true; // séance ouverte à tous
    return links.some((l) => goalIds.has(l.goalId));
  });
}

/**
 * Planning hebdomadaire d'un coach : créneaux actifs de ses groupes.
 *  - créneau placé explicitement sur l'un de ses groupes → visible ;
 *  - créneau non placé → repli historique par objectif de ses groupes.
 */
export async function getCoachWeeklySchedule(coachUserId) {
  const groups = await prisma.group.findMany({
    where: { coachId: coachUserId, isActive: true },
    select: { id: true, goalId: true },
  });
  const groupIds = new Set(groups.map((g) => g.id));
  const goalIds = new Set(groups.map((g) => g.goalId).filter(Boolean));
  const slots = await listSlots();
  const week = startOfWeek();
  return slots.filter((slot) => {
    if (!slot.isActive || !slot.sessionType.isActive) return false;
    if (!slotActiveInWeek(slot, week)) return false; // récurrence bornée / ponctuelle
    if (slot.groupId) return groupIds.has(slot.groupId); // placement explicite
    const links = slot.sessionType.goalLinks;
    if (links.length === 0) return true; // séance ouverte à tous
    return links.some((l) => goalIds.has(l.goalId));
  });
}

/**
 * Vue « séances du jour » d'un coach : les créneaux de la semaine restreints au
 * jour de `date`, plus ses groupes avec leur effectif (roster nom + niveau).
 * Le rattachement créneau ↔ groupe(s) est recalculé côté composant, comme dans
 * le planning hebdo (créneau explicite = son groupe ; sinon par objectif).
 */
export async function getCoachDayView(coachUserId, date = new Date()) {
  const weekday = WEEKDAYS[(new Date(date).getDay() + 6) % 7];
  const [allSlots, groups] = await Promise.all([
    getCoachWeeklySchedule(coachUserId),
    prisma.group.findMany({
      where: { coachId: coachUserId, isActive: true },
      include: {
        goal: true,
        clients: {
          where: { isActive: true },
          select: {
            id: true,
            level: true,
            user: { select: { firstName: true, lastName: true } },
          },
          orderBy: { joinedAt: "asc" },
        },
      },
      orderBy: { createdAt: "asc" },
    }),
  ]);
  // Occurrence réelle du jour (récurrence bornée + séances ponctuelles).
  return { weekday, slots: allSlots.filter((s) => slotOccursOnDate(s, date)), groups };
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
