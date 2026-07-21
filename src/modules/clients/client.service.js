/**
 * Domaine CLIENTS — clients inscrits et conversion prospect → client.
 */
import prisma from "@/lib/prisma";
import { ApiError } from "@/lib/api";
import { startOfWeek } from "@/lib/dates";
import { createUser } from "@/modules/auth/auth.service";
import { getWonStatus } from "@/modules/crm/pipeline.service";

const include = {
  user: { select: { id: true, username: true, email: true, firstName: true, lastName: true, phone: true, isActive: true } },
  goals: { include: { goal: true } },
  prospect: { include: { status: true } },
  group: { include: { goal: true, coach: { select: { id: true, firstName: true, lastName: true } } } },
};

export function listClients({ activeOnly = false, coachUserId = null } = {}) {
  return prisma.client.findMany({
    where: {
      ...(activeOnly && { isActive: true }),
      ...(coachUserId && { group: { coachId: coachUserId } }),
    },
    include,
    orderBy: { joinedAt: "desc" },
  });
}

export async function getClient(id) {
  const client = await prisma.client.findUnique({
    where: { id },
    include: {
      ...include,
      // Programmes du client (du plus récent au plus ancien), avec leurs séances
      // et exercices triés par position. Règle Prisma importante : `orderBy` se
      // place au même niveau que `include` DANS la relation à trier (ici dans
      // `sessions` et dans `exercises`), jamais à l'intérieur d'un objet
      // `include` — un `orderBy` mal niché provoquait l'erreur
      // « Unknown field `orderBy` for include statement » sur la fiche client.
      // Même structure que `fullInclude` dans programs/program.service.js.
      programs: {
        orderBy: { createdAt: "desc" },
        include: {
          sessions: {
            orderBy: { position: "asc" },
            include: { exercises: { orderBy: { position: "asc" }, include: { exercise: true } } },
          },
        },
      },
      metrics: { orderBy: { weekStart: "asc" } },
      // Rapports de séance (ressenti coach) : alimentent le suivi par séance,
      // la progression de niveau et l'historique. Le plus récent d'abord.
      sessionReports: {
        orderBy: { date: "desc" },
        include: { sessionType: true, strengthLog: { include: { exercise: true } } },
      },
      strengthLogs: { orderBy: { date: "asc" }, include: { exercise: true } },
      cardioLogs: { orderBy: { date: "asc" } },
      attendances: { orderBy: { date: "asc" } },
      feedbacks: { orderBy: { createdAt: "desc" } },
      // Suivi corporel (mensurations + photos) et carnet de notes privé du coach.
      measurements: { orderBy: { date: "asc" } },
      photos: { orderBy: { date: "asc" } },
      coachNotes: {
        orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
        include: { author: { select: { firstName: true, lastName: true } } },
      },
      // Conseil individuel de la SEMAINE EN COURS uniquement : sert à afficher
      // l'état « envoyé » (vert) du conseil jusqu'à la semaine suivante.
      advices: { where: { weekStart: startOfWeek(new Date()) }, orderBy: { createdAt: "desc" } },
    },
  });
  if (!client) throw new ApiError("Client introuvable.", 404);
  return client;
}

export function getClientByUserId(userId) {
  return prisma.client.findUnique({
    where: { userId },
    include: { ...include, goals: { include: { goal: true } } },
  });
}

/**
 * Conversion prospect → client inscrit :
 *  1. crée le compte utilisateur CLIENT (mot de passe fourni par l'admin),
 *  2. crée la fiche Client reliée au prospect (historique CRM conservé),
 *  3. bascule le prospect au statut « Payé / Inscrit » + événement d'historique.
 * Le tout dans une transaction pour garantir la cohérence.
 */
export async function convertProspect(prospectId, { password, goalIds = [] }, { userId = null } = {}) {
  const prospect = await prisma.prospect.findUnique({
    where: { id: prospectId },
    include: { client: true, status: true },
  });
  if (!prospect) throw new ApiError("Prospect introuvable.", 404);
  if (prospect.client) throw new ApiError("Ce prospect est déjà converti en client.");

  const emailTaken = await prisma.user.findUnique({ where: { email: prospect.email } });
  if (emailTaken) throw new ApiError("Un compte utilise déjà cette adresse e-mail.");

  const wonStatus = await getWonStatus();

  // Objectifs : ceux cochés + celui du prospect (fiche CRM)
  const allGoalIds = [...new Set([...goalIds, ...(prospect.goalId ? [prospect.goalId] : [])])];

  // Placement automatique dans un groupe correspondant à l'objectif principal
  // (max 7 par défaut — capacité paramétrable ; nouveau groupe créé si plein).
  const { autoAssignGroup } = await import("@/modules/clients/group.service");
  const group = await autoAssignGroup(allGoalIds[0] || null);

  const user = await createUser({
    email: prospect.email,
    firstName: prospect.firstName,
    lastName: prospect.lastName,
    phone: prospect.phone,
    role: "CLIENT",
    password,
  });

  const [client] = await prisma.$transaction([
    prisma.client.create({
      data: {
        userId: user.id,
        prospectId: prospect.id,
        groupId: group?.id || null,
        goals: { create: allGoalIds.map((goalId) => ({ goalId })) },
      },
      include,
    }),
    prisma.prospect.update({
      where: { id: prospect.id },
      data: { statusId: wonStatus.id, lastContactAt: new Date() },
    }),
    prisma.contactEvent.create({
      data: {
        prospectId: prospect.id,
        type: "SYSTEM",
        content: `Converti en client inscrit (statut : ${wonStatus.label}). Espace client activé.`,
        createdById: userId,
      },
    }),
  ]);

  // Génère d'emblée son programme à partir de son objectif (aucun clic requis).
  try {
    const { ensureClientProgram } = await import("@/modules/programs/program.service");
    await ensureClientProgram(client.id);
  } catch (err) {
    // Sans objectif, pas de programme : la conversion reste valide.
  }

  return { client, username: user.username };
}

/** Mise à jour d'un client : notes, activation, objectifs, profil, groupe. */
export async function updateClient(id, data) {
  const { goalIds } = data;
  if (goalIds) {
    await prisma.clientGoal.deleteMany({ where: { clientId: id } });
    await prisma.clientGoal.createMany({ data: goalIds.map((goalId) => ({ clientId: id, goalId })) });
  }

  const patch = {};
  // Champs texte / booléens du profil + bilan initial (questionnaire d'entrée)
  for (const k of [
    "notes", "isActive", "gender", "lifestyle", "activityLevel", "sportLevel", "bodyType", "dietPreferences", "groupId",
    "injuries", "medicalNotes", "availability", "equipment", "experienceNote",
  ]) {
    if (data[k] !== undefined) patch[k] = data[k] === "" ? null : data[k];
  }
  // Champs numériques (valeurs forcées manuellement + cibles nutrition : vide = auto)
  for (const k of [
    "age", "heightCm", "startWeightKg", "targetWeightKg", "weeklyRateKg",
    "manualWeightKg", "manualBmi", "manualBmr", "manualTdee",
    "calorieTarget", "proteinTargetG", "carbTargetG", "fatTargetG",
  ]) {
    if (data[k] !== undefined) patch[k] = data[k] === "" || data[k] === null ? null : Number(data[k]);
  }
  // Échéance de l'objectif
  if (data.objectiveDeadline !== undefined) {
    patch.objectiveDeadline = data.objectiveDeadline ? new Date(data.objectiveDeadline) : null;
  }

  const updated = await prisma.client.update({ where: { id }, data: patch, include });

  // Le programme dépend de l'objectif et du niveau sportif : dès que l'un change,
  // on le régénère automatiquement (aucune action manuelle du coach).
  if (goalIds !== undefined || data.sportLevel !== undefined) {
    try {
      const { regenerateClientProgram } = await import("@/modules/programs/program.service");
      await regenerateClientProgram(id);
    } catch (err) {
      // Pas d'objectif (ou autre) : on n'empêche pas la mise à jour du client.
    }
  }
  return updated;
}
