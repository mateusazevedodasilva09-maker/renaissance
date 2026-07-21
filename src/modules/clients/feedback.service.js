/**
 * Domaine CLIENTS — feedback hebdomadaire client → coach.
 * Le coach voit les messages des inscrits de ses groupes ; l'admin voit tout.
 */
import prisma from "@/lib/prisma";
import { ApiError } from "@/lib/api";
import { startOfWeek } from "@/lib/dates";

const include = {
  client: {
    include: {
      user: { select: { firstName: true, lastName: true } },
      group: { select: { id: true, name: true, coachId: true } },
    },
  },
};

/** Feedback envoyé par le client (depuis son espace). */
export function createFeedback(clientId, { content, weekStart }) {
  if (!content?.trim()) throw new ApiError("Le message est requis.");
  return prisma.feedbackMessage.create({
    data: {
      clientId,
      content: content.trim(),
      weekStart: startOfWeek(weekStart ? new Date(weekStart) : new Date()),
    },
  });
}

export function listFeedbackForClient(clientId) {
  return prisma.feedbackMessage.findMany({
    where: { clientId },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Messages reçus côté coach/admin.
 * - ADMIN : tous les messages.
 * - COACH : uniquement ceux des inscrits de ses groupes (groupe attitré).
 */
export function listFeedbackForStaff({ role, userId }) {
  return prisma.feedbackMessage.findMany({
    where: role === "ADMIN" ? {} : { client: { group: { coachId: userId } } },
    include,
    orderBy: { createdAt: "desc" },
  });
}

export async function replyToFeedback(id, { coachReply }) {
  if (!coachReply?.trim()) throw new ApiError("La réponse est requise.");
  return prisma.feedbackMessage.update({
    where: { id },
    data: { coachReply: coachReply.trim(), repliedAt: new Date() },
    include,
  });
}
