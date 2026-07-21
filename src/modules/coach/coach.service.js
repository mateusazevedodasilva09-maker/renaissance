/**
 * Domaine COACH — agrégats pour l'interface dédiée `/coach`.
 *
 * Encapsulation : toutes les lectures sont filtrées par `coachUserId`. Un coach
 * ne peut jamais voir un groupe, un client ou une séance qui ne le concerne pas.
 * L'admin peut consulter l'interface d'un coach en passant son identifiant, mais
 * la donnée reste bornée à ce coach — aucune fuite transverse.
 */
import prisma from "@/lib/prisma";
import { getCoachWeeklySchedule } from "@/modules/sessions/schedule.service";

/** Liste des comptes coach (pour le sélecteur réservé à l'admin). */
export function listCoaches() {
  return prisma.user.findMany({
    where: { role: "COACH", isActive: true },
    select: { id: true, firstName: true, lastName: true },
    orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
  });
}

/**
 * Tableau de bord d'un coach pour la semaine :
 *  - `groups` : ses groupes actifs, chacun avec son objectif commun et ses
 *    inscrits (nom + niveau + objectifs, pour l'affectation aux séances) ;
 *  - `slots`  : ses coachings de la semaine (créneaux dont la thématique
 *    correspond aux objectifs de ses groupes), avec le contenu de la séance.
 */
export async function getCoachDashboard(coachUserId) {
  const [groups, slots] = await Promise.all([
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
            goals: { select: { goalId: true } },
          },
          orderBy: { joinedAt: "asc" },
        },
      },
      orderBy: { createdAt: "asc" },
    }),
    getCoachWeeklySchedule(coachUserId),
  ]);

  return { groups, slots };
}
