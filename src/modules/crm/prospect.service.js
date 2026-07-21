/**
 * Domaine CRM — prospects et historique de contact.
 */
import prisma from "@/lib/prisma";
import { ApiError } from "@/lib/api";
import { getDefaultStatus } from "./pipeline.service";

const baseInclude = {
  status: true,
  goal: true,
  assignedTo: { select: { id: true, firstName: true, lastName: true, username: true } },
  appointments: { orderBy: { createdAt: "desc" } },
};

/** Libellés des sources de prospect (côté serveur et client). */
export const SOURCE_LABELS = {
  FORM: "Formulaire du site",
  MANUAL: "Ajout manuel",
  SOCIAL_MEDIA: "Réseaux sociaux",
  WORD_OF_MOUTH: "Bouche à oreille",
  FLYER: "Flyers",
};

export function listProspects({ statusId, search, includeArchived = false } = {}) {
  return prisma.prospect.findMany({
    where: {
      ...(includeArchived ? {} : { archived: false }),
      ...(statusId && { statusId }),
      ...(search && {
        OR: [
          { firstName: { contains: search, mode: "insensitive" } },
          { lastName: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
          { phone: { contains: search } },
        ],
      }),
    },
    include: baseInclude,
    orderBy: { lastContactAt: "desc" },
  });
}

export async function getProspect(id) {
  const prospect = await prisma.prospect.findUnique({
    where: { id },
    include: {
      ...baseInclude,
      contactEvents: { orderBy: { occurredAt: "desc" }, include: { createdBy: true } },
      client: { include: { user: true } },
    },
  });
  if (!prospect) throw new ApiError("Prospect introuvable.", 404);
  return prospect;
}

/**
 * Création d'un prospect. `source: "FORM"` pour le formulaire public :
 * dans ce cas une demande d'appel (Appointment REQUESTED) et un événement
 * d'historique sont créés automatiquement.
 */
export async function createProspect(
  { firstName, lastName, email, phone, generalNote, goalId, assignedToId, priority },
  { source = "MANUAL", createdById = null } = {}
) {
  if (!firstName?.trim() || !lastName?.trim()) throw new ApiError("Nom et prénom requis.");
  if (!email?.trim() || !/^\S+@\S+\.\S+$/.test(email)) throw new ApiError("Adresse e-mail invalide.");
  if (!phone?.trim()) throw new ApiError("Numéro de téléphone requis.");

  const status = await getDefaultStatus();
  return prisma.prospect.create({
    data: {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      generalNote,
      goalId: goalId || null,
      assignedToId: assignedToId || createdById || null,
      priority: priority || "NORMAL",
      source,
      statusId: status.id,
      contactEvents: {
        create: {
          type: "SYSTEM",
          content:
            source === "FORM"
              ? "Demande d'appel envoyée depuis le formulaire public."
              : "Prospect créé manuellement.",
          createdById,
        },
      },
      ...(source === "FORM" && {
        appointments: { create: { title: "Appel découverte", status: "REQUESTED" } },
      }),
    },
    include: baseInclude,
  });
}

export async function updateProspect(id, data, { userId = null } = {}) {
  const allowed = [
    "firstName", "lastName", "email", "phone", "generalNote", "archived",
    "source", "goalId", "assignedToId", "priority", "nextActionLabel",
  ];
  const patch = Object.fromEntries(Object.entries(data).filter(([k]) => allowed.includes(k)));

  // Dates éditables (début / fin d'interaction, prochaine action)
  for (const key of ["firstContactAt", "lastContactAt", "nextActionAt"]) {
    if (data[key] !== undefined) patch[key] = data[key] ? new Date(data[key]) : null;
  }
  if (patch.goalId === "") patch.goalId = null;
  if (patch.assignedToId === "") patch.assignedToId = null;

  // Changement de statut → événement d'historique automatique
  if (data.statusId) {
    const [prospect, newStatus] = await Promise.all([
      getProspect(id),
      prisma.pipelineStatus.findUnique({ where: { id: data.statusId } }),
    ]);
    if (!newStatus) throw new ApiError("Statut inconnu.");
    if (prospect.statusId !== data.statusId) {
      patch.statusId = data.statusId;
      patch.lastContactAt = new Date();
      await prisma.contactEvent.create({
        data: {
          prospectId: id,
          type: "STATUS_CHANGE",
          content: `Statut : ${prospect.status.label} → ${newStatus.label}`,
          createdById: userId,
        },
      });
    }
  }

  return prisma.prospect.update({ where: { id }, data: patch, include: baseInclude });
}

/** Ajoute une entrée à l'historique horodaté et met à jour lastContactAt. */
export async function addContactEvent(prospectId, { type = "NOTE", content, occurredAt }, { userId = null } = {}) {
  if (!content?.trim()) throw new ApiError("Le contenu de l'événement est requis.");
  const event = await prisma.contactEvent.create({
    data: {
      prospectId,
      type,
      content: content.trim(),
      occurredAt: occurredAt ? new Date(occurredAt) : new Date(),
      createdById: userId,
    },
  });
  await prisma.prospect.update({
    where: { id: prospectId },
    data: { lastContactAt: event.occurredAt },
  });
  return event;
}

/**
 * Obligations journalières : prospects dont la prochaine action est due
 * aujourd'hui (ou en retard), triés par priorité puis par heure.
 * Alimente la sous-section « Ma journée » du CRM et le calendrier.
 */
export function dailyObligations() {
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);
  return prisma.prospect.findMany({
    where: {
      archived: false,
      nextActionAt: { lte: endOfDay },
      status: { isWon: false, isLost: false },
    },
    include: baseInclude,
    orderBy: [{ priority: "desc" }, { nextActionAt: "asc" }],
  });
}

/** Toutes les prochaines actions planifiées (pour le calendrier). */
export function listNextActions({ from, to } = {}) {
  return prisma.prospect.findMany({
    where: {
      archived: false,
      nextActionAt: {
        not: null,
        ...(from && { gte: new Date(from) }),
        ...(to && { lte: new Date(to) }),
      },
    },
    include: baseInclude,
    orderBy: { nextActionAt: "asc" },
  });
}

/** Statistiques simples pour le tableau de bord admin. */
export async function pipelineStats() {
  const statuses = await prisma.pipelineStatus.findMany({
    orderBy: { position: "asc" },
    include: { _count: { select: { prospects: { where: { archived: false } } } } },
  });
  const total = statuses.reduce((sum, s) => sum + s._count.prospects, 0);
  return { total, byStatus: statuses.map((s) => ({ id: s.id, label: s.label, color: s.color, count: s._count.prospects, isWon: s.isWon, isLost: s.isLost })) };
}
