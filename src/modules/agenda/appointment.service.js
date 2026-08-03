/**
 * Domaine AGENDA — appels & rendez-vous avec les prospects.
 * Une demande issue du formulaire public naît en statut REQUESTED ;
 * l'admin la planifie (SCHEDULED) puis la clôture (COMPLETED / CANCELLED).
 */
import prisma from "@/lib/prisma";
import { ApiError } from "@/lib/api";
import { addContactEvent } from "@/modules/crm/prospect.service";
import { createTask } from "@/modules/agenda/task.service";

const include = {
  prospect: { include: { status: true } },
};

export function listAppointments({ status, from, to } = {}) {
  return prisma.appointment.findMany({
    where: {
      ...(status && { status }),
      ...((from || to) && {
        scheduledAt: {
          ...(from && { gte: new Date(from) }),
          ...(to && { lte: new Date(to) }),
        },
      }),
    },
    include,
    orderBy: [{ scheduledAt: "asc" }, { createdAt: "desc" }],
  });
}

/**
 * Prochain appel réservé par un client (via son prospect d'origine), pour
 * l'afficher dans son tunnel d'onboarding. Null si aucun. Ne renvoie que les
 * rendez-vous non clôturés (REQUESTED / SCHEDULED).
 */
export async function getUpcomingAppointmentForClient(clientId) {
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: { prospectId: true },
  });
  if (!client?.prospectId) return null;
  return prisma.appointment.findFirst({
    where: { prospectId: client.prospectId, status: { in: ["REQUESTED", "SCHEDULED"] } },
    orderBy: { scheduledAt: "asc" },
  });
}

/**
 * Réservation d'un appel par le CLIENT lui-même (tunnel d'onboarding).
 * Crée le rendez-vous déjà planifié (SCHEDULED) sur le créneau choisi — il
 * apparaît donc dans le calendrier admin — et génère une tâche pour le staff
 * (coach du groupe si connu, sinon non assignée) pour préparer l'appel.
 * `clientId` provient de la session : le client ne peut réserver que pour lui.
 */
export async function bookOwnAppointment(clientId, { scheduledAt }) {
  if (!scheduledAt) throw new ApiError("Un créneau est requis.");
  const when = new Date(scheduledAt);
  if (Number.isNaN(when.getTime())) throw new ApiError("Créneau invalide.");
  if (when.getTime() < Date.now()) throw new ApiError("Le créneau doit être dans le futur.");

  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: {
      user: { select: { firstName: true, lastName: true } },
      prospect: { select: { id: true } },
      group: { select: { coachId: true } },
    },
  });
  if (!client) throw new ApiError("Client introuvable.", 404);

  const name = `${client.user.firstName} ${client.user.lastName}`.trim();

  const appointment = await prisma.appointment.create({
    data: {
      title: `Appel découverte — ${name}`,
      scheduledAt: when,
      status: "SCHEDULED",
      prospectId: client.prospect?.id || null,
    },
    include,
  });

  // Tâche pour le staff : préparer / honorer l'appel.
  await createTask({
    title: `Appel avec ${name}`,
    description: "Appel découverte réservé par le client depuis l'app.",
    dueAt: when,
    assigneeId: client.group?.coachId || null,
    category: "Inscriptions",
    priority: "HIGH",
    createdById: null,
  });

  // Historique CRM.
  if (client.prospect?.id) {
    await addContactEvent(
      client.prospect.id,
      { type: "SYSTEM", content: `Appel réservé par le client le ${when.toLocaleString("fr-FR")}.` },
      {}
    );
  }
  return appointment;
}

export async function updateAppointment(id, { scheduledAt, durationMin, status, notes, title }, { userId } = {}) {
  const existing = await prisma.appointment.findUnique({ where: { id } });
  if (!existing) throw new ApiError("Rendez-vous introuvable.", 404);

  const data = {
    ...(title !== undefined && { title }),
    ...(durationMin !== undefined && { durationMin }),
    ...(notes !== undefined && { notes }),
    ...(status !== undefined && { status }),
  };
  if (scheduledAt !== undefined) {
    data.scheduledAt = scheduledAt ? new Date(scheduledAt) : null;
    if (scheduledAt && existing.status === "REQUESTED") data.status = "SCHEDULED";
  }

  const updated = await prisma.appointment.update({ where: { id }, data, include });

  // Trace automatique dans l'historique CRM du prospect concerné.
  if (updated.prospectId) {
    if (scheduledAt) {
      await addContactEvent(
        updated.prospectId,
        { type: "SYSTEM", content: `Appel planifié le ${new Date(scheduledAt).toLocaleString("fr-FR")}.` },
        { userId }
      );
    } else if (status === "COMPLETED") {
      await addContactEvent(updated.prospectId, { type: "CALL", content: "Appel effectué." }, { userId });
    } else if (status === "CANCELLED") {
      await addContactEvent(updated.prospectId, { type: "SYSTEM", content: "Appel annulé." }, { userId });
    }
  }
  return updated;
}
