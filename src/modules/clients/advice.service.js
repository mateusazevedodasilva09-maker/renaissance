/**
 * Domaine CLIENTS — conseil de la semaine (coach → groupe ou client précis).
 */
import prisma from "@/lib/prisma";
import { ApiError } from "@/lib/api";
import { startOfWeek } from "@/lib/dates";

/** Crée ou remplace le conseil de la semaine pour un groupe ou un client. */
export async function upsertAdvice({ content, weekStart, groupId, clientId, authorId }) {
  if (!content?.trim()) throw new ApiError("Le contenu du conseil est requis.");
  if (!groupId && !clientId) throw new ApiError("Choisissez un groupe ou un client.");
  const week = startOfWeek(weekStart ? new Date(weekStart) : new Date());

  const existing = await prisma.weeklyAdvice.findFirst({
    where: { weekStart: week, groupId: groupId || null, clientId: clientId || null },
  });
  if (existing) {
    return prisma.weeklyAdvice.update({
      where: { id: existing.id },
      data: { content: content.trim(), authorId },
    });
  }
  return prisma.weeklyAdvice.create({
    data: {
      content: content.trim(),
      weekStart: week,
      groupId: groupId || null,
      clientId: clientId || null,
      authorId,
    },
  });
}

/**
 * Conseil applicable à un client pour la semaine en cours :
 * conseil individuel prioritaire, sinon conseil de son groupe.
 */
export async function getAdviceForClient(client) {
  const week = startOfWeek();
  const [individual, group] = await Promise.all([
    prisma.weeklyAdvice.findFirst({ where: { clientId: client.id, weekStart: week } }),
    client.groupId
      ? prisma.weeklyAdvice.findFirst({ where: { groupId: client.groupId, weekStart: week } })
      : null,
  ]);
  return individual || group || null;
}

export function listAdviceForGroup(groupId) {
  return prisma.weeklyAdvice.findMany({
    where: { groupId },
    orderBy: { weekStart: "desc" },
    take: 10,
  });
}
