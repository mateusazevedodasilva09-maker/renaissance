/**
 * Domaine CLIENTS — carnet de notes privé du coach.
 *
 * Notes datées, visibles UNIQUEMENT côté coach/admin (jamais dans l'espace
 * client, contrairement à WeeklyAdvice et coachComment qui sont partagés).
 * C'est la mémoire du suivi personnalisé : « genou fragile en ce moment »,
 * « préfère les séances du matin », « motivée par le semi de mars »…
 */
import prisma from "@/lib/prisma";
import { ApiError } from "@/lib/api";

// Auteur inclus dans toutes les réponses (affiché sous chaque note).
const include = { author: { select: { firstName: true, lastName: true } } };

/** Ajoute une note au carnet du client. */
export async function addNote(clientId, { content, isPinned = false }, { userId = null } = {}) {
  if (!content?.trim()) throw new ApiError("La note est vide.");
  const client = await prisma.client.findUnique({ where: { id: clientId } });
  if (!client) throw new ApiError("Client introuvable.", 404);

  return prisma.clientNote.create({
    data: { clientId, content: content.trim(), isPinned: !!isPinned, authorId: userId },
    include,
  });
}

/** Modifie une note (contenu et/ou épinglage). */
export async function updateNote(id, { content, isPinned }) {
  const note = await prisma.clientNote.findUnique({ where: { id } });
  if (!note) throw new ApiError("Note introuvable.", 404);

  return prisma.clientNote.update({
    where: { id },
    data: {
      ...(content !== undefined && { content: content.trim() }),
      ...(isPinned !== undefined && { isPinned: !!isPinned }),
    },
    include,
  });
}

/** Supprime une note. */
export async function deleteNote(id) {
  const note = await prisma.clientNote.findUnique({ where: { id } });
  if (!note) throw new ApiError("Note introuvable.", 404);
  return prisma.clientNote.delete({ where: { id } });
}
