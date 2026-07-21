/**
 * Domaine AGENDA — appels & rendez-vous avec les prospects.
 * Une demande issue du formulaire public naît en statut REQUESTED ;
 * l'admin la planifie (SCHEDULED) puis la clôture (COMPLETED / CANCELLED).
 */
import prisma from "@/lib/prisma";
import { ApiError } from "@/lib/api";
import { addContactEvent } from "@/modules/crm/prospect.service";

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
