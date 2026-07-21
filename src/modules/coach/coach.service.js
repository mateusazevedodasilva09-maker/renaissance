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
import { startOfWeek, addDays } from "@/lib/dates";

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

/**
 * « Les personnes qui ont besoin de lui » — clients des groupes du coach qui
 * réunissent au moins un signal d'attention. Chaque client renvoyé porte la
 * liste de ses motifs (pour des badges dans l'UI). Quatre signaux :
 *   - message (feedback) sans réponse du coach ;
 *   - aucune séance notée (SessionReport) cette semaine ;
 *   - onboarding incomplet (mensurations initiales non renseignées) ;
 *   - niveau en baisse la semaine passée (WeeklyLevelChange delta < 0).
 */
export async function getClientsNeedingAttention(coachUserId) {
  const week = startOfWeek();
  const lastWeek = startOfWeek(addDays(week, -7));

  const clients = await prisma.client.findMany({
    where: { isActive: true, group: { coachId: coachUserId } },
    select: {
      id: true,
      level: true,
      onboardingMeasurementsDone: true,
      group: { select: { id: true, name: true } },
      user: { select: { firstName: true, lastName: true } },
      feedbacks: { where: { coachReply: null }, select: { id: true } },
      sessionReports: { where: { weekStart: week }, select: { id: true } },
      levelChanges: { where: { weekStart: lastWeek }, select: { delta: true } },
    },
  });

  const out = [];
  for (const c of clients) {
    const reasons = [];
    if (c.feedbacks.length > 0) {
      reasons.push({ key: "message", label: "Message sans réponse", count: c.feedbacks.length });
    }
    if (c.sessionReports.length === 0) reasons.push({ key: "unrated", label: "Séance non notée" });
    if (!c.onboardingMeasurementsDone) reasons.push({ key: "onboarding", label: "Onboarding incomplet" });
    if (c.levelChanges.some((l) => l.delta < 0)) reasons.push({ key: "level", label: "Niveau en baisse" });

    if (reasons.length > 0) {
      out.push({
        id: c.id,
        name: `${c.user.firstName} ${c.user.lastName}`,
        level: c.level ?? 1,
        group: c.group,
        reasons,
      });
    }
  }
  // Les clients cumulant le plus de motifs remontent en tête.
  out.sort((a, b) => b.reasons.length - a.reasons.length);
  return out;
}
