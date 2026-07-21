/**
 * Domaine CLIENTS — groupes d'entraînement.
 * Les inscrits sont placés automatiquement dans un groupe correspondant à
 * leur objectif, dans la limite de la capacité (7 par défaut, paramétrable).
 */
import prisma from "@/lib/prisma";
import { ApiError } from "@/lib/api";
import { startOfWeek } from "@/lib/dates";

const include = {
  goal: true,
  coach: { select: { id: true, firstName: true, lastName: true, username: true } },
  clients: { include: { user: { select: { firstName: true, lastName: true } } } },
  _count: { select: { clients: true } },
};

export function listGroups() {
  return prisma.group.findMany({ include, orderBy: { createdAt: "asc" } });
}

export async function getGroup(id) {
  const group = await prisma.group.findUnique({ where: { id }, include });
  if (!group) throw new ApiError("Groupe introuvable.", 404);
  return group;
}

export function createGroup({ name, goalId, coachId, capacity }) {
  if (!name?.trim()) throw new ApiError("Le nom du groupe est requis.");
  return prisma.group.create({
    data: {
      name: name.trim(),
      goalId: goalId || null,
      coachId: coachId || null,
      capacity: capacity ? Number(capacity) : 7,
    },
    include,
  });
}

export function updateGroup(id, { name, goalId, coachId, capacity, isActive }) {
  return prisma.group.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(goalId !== undefined && { goalId: goalId || null }),
      ...(coachId !== undefined && { coachId: coachId || null }),
      ...(capacity !== undefined && { capacity: Number(capacity) }),
      ...(isActive !== undefined && { isActive }),
    },
    include,
  });
}

export async function deleteGroup(id) {
  const count = await prisma.client.count({ where: { groupId: id } });
  if (count > 0) throw new ApiError("Ce groupe contient encore des inscrits. Déplacez-les d'abord.");
  return prisma.group.delete({ where: { id } });
}

/**
 * Assignation automatique : cherche un groupe actif de l'objectif donné avec
 * une place libre ; sinon en crée un nouveau (« Objectif — Groupe n »).
 * Le coach du nouveau groupe est repris du dernier groupe du même objectif.
 */
export async function autoAssignGroup(goalId) {
  if (!goalId) return null;
  const groups = await prisma.group.findMany({
    where: { goalId, isActive: true },
    include: { _count: { select: { clients: true } } },
    orderBy: { createdAt: "asc" },
  });
  const free = groups.find((g) => g._count.clients < g.capacity);
  if (free) return free;

  const goal = await prisma.goal.findUnique({ where: { id: goalId } });
  const last = groups[groups.length - 1];
  return prisma.group.create({
    data: {
      name: `${goal?.label || "Groupe"} — Groupe ${groups.length + 1}`,
      goalId,
      capacity: last?.capacity ?? 7,
      coachId: last?.coachId ?? null,
    },
  });
}

/** Groupes attribués à un coach (avec leurs inscrits). */
export function listGroupsForCoach(coachUserId) {
  return prisma.group.findMany({
    where: { coachId: coachUserId, isActive: true },
    include,
    orderBy: { createdAt: "asc" },
  });
}

/**
 * Statistiques de performance moyenne par groupe (pour les mini-graphes de la
 * page Groupes) : niveau moyen des membres, effectif, série hebdomadaire du
 * poids moyen (12 dernières semaines) et présence d'un conseil pour la semaine
 * en cours (état « envoyé » vert).
 * @param groupIds  identifiants des groupes à agréger
 * @returns { [groupId]: { avgLevel, memberCount, weightSeries[], hasAdviceThisWeek } }
 */
export async function getGroupsStats(groupIds = []) {
  if (!groupIds.length) return {};
  const week = startOfWeek();
  const groups = await prisma.group.findMany({
    where: { id: { in: groupIds } },
    select: {
      id: true,
      clients: {
        where: { isActive: true },
        select: {
          level: true,
          metrics: { select: { weekStart: true, weightKg: true }, orderBy: { weekStart: "asc" } },
        },
      },
      advices: { where: { weekStart: week }, select: { id: true } },
    },
  });

  const out = {};
  for (const g of groups) {
    const levels = g.clients.map((c) => c.level ?? 1);
    const avgLevel = levels.length
      ? Math.round((levels.reduce((a, b) => a + b, 0) / levels.length) * 10) / 10
      : null;

    // Poids moyen des membres, semaine par semaine.
    const byWeek = new Map();
    for (const c of g.clients) {
      for (const m of c.metrics) {
        if (m.weightKg == null) continue;
        const key = new Date(m.weekStart).toISOString().slice(0, 10);
        if (!byWeek.has(key)) byWeek.set(key, []);
        byWeek.get(key).push(m.weightKg);
      }
    }
    const weightSeries = [...byWeek.entries()]
      .sort((a, b) => (a[0] < b[0] ? -1 : 1))
      .slice(-12)
      .map(([k, arr]) => ({
        label: new Date(k).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" }),
        value: Math.round((arr.reduce((x, y) => x + y, 0) / arr.length) * 10) / 10,
      }));

    out[g.id] = {
      avgLevel,
      memberCount: g.clients.length,
      weightSeries,
      hasAdviceThisWeek: g.advices.length > 0,
    };
  }
  return out;
}
