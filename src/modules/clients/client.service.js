/**
 * Domaine CLIENTS — clients inscrits et conversion prospect → client.
 */
import prisma from "@/lib/prisma";
import { ApiError } from "@/lib/api";
import { startOfWeek } from "@/lib/dates";
import { createUser } from "@/modules/auth/auth.service";
import { getWonStatus, getDefaultStatus, ensureMetricsStage } from "@/modules/crm/pipeline.service";

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

  // Nouvelle étape : le prospect converti passe d'abord en « Remplissage des
  // métriques » (le client a un compte mais doit renseigner ses données avant
  // que l'admin ne lui donne accès au dashboard). Repli sur « Inscrit » si le
  // statut n'existe pas.
  const fillStatus = await ensureMetricsStage();

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
        enrolled: false, // accès dashboard bloqué jusqu'à validation par l'admin
        goals: { create: allGoalIds.map((goalId) => ({ goalId })) },
      },
      include,
    }),
    prisma.prospect.update({
      where: { id: prospect.id },
      data: { statusId: fillStatus.id, lastContactAt: new Date() },
    }),
    prisma.contactEvent.create({
      data: {
        prospectId: prospect.id,
        type: "SYSTEM",
        content: `Compte client créé (statut : ${fillStatus.label}). En attente du remplissage des métriques par le client.`,
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

/**
 * Auto-inscription depuis l'app (le prospect crée lui-même son compte à la
 * première page du tunnel). Crée en une transaction cohérente :
 *   1. un Prospect dans la colonne Prospect standard, source « Application »
 *      (l'origine « app » est une source, plus une colonne de pipeline) ;
 *   2. le compte utilisateur CLIENT (mot de passe choisi par le prospect) ;
 *   3. la fiche Client reliée au prospect, `enrolled = false` et `paid = false`
 *      → il n'a accès qu'au tunnel d'onboarding, pas au dashboard.
 * Retourne l'utilisateur (pour ouvrir la session) et le client.
 *
 * Sécurité : aucune donnée sensible n'est acceptée ici (pas de rôle, pas de
 * `enrolled`/`paid`/`level`) — seuls les champs d'identité passent.
 */
export async function registerFromApp({ firstName, lastName, email, phone, password }) {
  if (!firstName?.trim() || !lastName?.trim()) throw new ApiError("Le prénom et le nom sont requis.");
  if (!email?.trim()) throw new ApiError("L'e-mail est requis.");
  if (!phone?.trim()) throw new ApiError("Le téléphone est requis.");
  if (!password || password.length < 8) throw new ApiError("Mot de passe : 8 caractères minimum.");

  const cleanEmail = email.trim().toLowerCase();
  const emailTaken = await prisma.user.findUnique({ where: { email: cleanEmail } });
  if (emailTaken) throw new ApiError("Un compte utilise déjà cette adresse e-mail.");

  // Colonne Prospect standard (première colonne non terminale).
  const entry = await getDefaultStatus();

  const prospect = await prisma.prospect.create({
    data: {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: cleanEmail,
      phone: phone.trim(),
      source: "APP",
      statusId: entry.id,
    },
  });

  const user = await createUser({
    email: cleanEmail,
    firstName: firstName.trim(),
    lastName: lastName.trim(),
    phone: phone.trim(),
    role: "CLIENT",
    password,
  });

  const client = await prisma.client.create({
    data: {
      userId: user.id,
      prospectId: prospect.id,
      enrolled: false,
      paid: false,
      onboardingMeasurementsDone: false,
    },
    include,
  });

  await prisma.contactEvent.create({
    data: {
      prospectId: prospect.id,
      type: "SYSTEM",
      content: "Auto-inscription depuis l'app (source : Application).",
      createdById: null,
    },
  });

  return { user, client };
}

/**
 * Mise à jour de SA PROPRE fiche par le client (tunnel d'onboarding).
 * Allowlist STRICTE : seuls les champs de profil / bilan initial sont
 * modifiables. Jamais `enrolled`, `paid`, `level`, `groupId`, `isActive`,
 * ni aucune valeur forcée (manual*, cibles nutrition) — ceux-là restent
 * l'apanage du coach/admin. Ferme la porte à toute élévation de privilège.
 */
export async function updateOwnClientProfile(clientId, data) {
  const patch = {};
  for (const k of [
    "gender", "lifestyle", "activityLevel", "sportLevel", "bodyType", "dietPreferences",
    "injuries", "medicalNotes", "availability", "equipment", "experienceNote",
  ]) {
    if (data[k] !== undefined) patch[k] = data[k] === "" ? null : String(data[k]);
  }
  for (const k of ["age", "heightCm"]) {
    if (data[k] !== undefined) patch[k] = data[k] === "" || data[k] === null ? null : Number(data[k]);
  }
  if (Object.keys(patch).length === 0) return getClient(clientId);
  return prisma.client.update({ where: { id: clientId }, data: patch, include });
}

/**
 * Inscription définitive : l'admin donne au client l'accès à son dashboard.
 * Passe `enrolled = true` et bascule le prospect lié en « Payé / Inscrit ».
 * Idempotent (ne refait rien si déjà inscrit). Conditionné au paiement validé.
 */
export async function enrollClient(clientId, { userId = null } = {}) {
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: { user: { select: { firstName: true, lastName: true } }, prospect: { select: { id: true } } },
  });
  if (!client) throw new ApiError("Client introuvable.", 404);
  if (client.enrolled) return getClient(clientId);
  if (!client.paid) throw new ApiError("Le paiement doit être validé avant d'inscrire le client.");

  const won = await getWonStatus();
  const ops = [
    prisma.client.update({ where: { id: clientId }, data: { enrolled: true } }),
  ];
  if (client.prospect) {
    ops.push(
      prisma.prospect.update({ where: { id: client.prospect.id }, data: { statusId: won.id, lastContactAt: new Date() } }),
      prisma.contactEvent.create({
        data: {
          prospectId: client.prospect.id,
          type: "SYSTEM",
          content: `Inscription validée — accès au dashboard accordé (statut : ${won.label}).`,
          createdById: userId,
        },
      })
    );
  }
  await prisma.$transaction(ops);
  return getClient(clientId);
}

/**
 * Refus d'onboarding par le staff : la fiche remplie par le client est
 * incomplète ou incorrecte. Renvoie le client dans son tunnel d'onboarding
 * (`onboardingMeasurementsDone = false`) AVEC un motif qui s'affichera dans son
 * espace pour lui dire ce qui n'allait pas. Trace un événement CRM. Le motif est
 * effacé automatiquement dès que le client renvoie sa fiche.
 */
export async function rejectOnboarding(clientId, reason, { userId = null } = {}) {
  const msg = (reason || "").trim();
  if (!msg) throw new ApiError("Le motif de refus est requis (il sera affiché au client).");
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: { prospect: { select: { id: true } } },
  });
  if (!client) throw new ApiError("Client introuvable.", 404);
  if (client.enrolled) throw new ApiError("Ce client est déjà inscrit : impossible de refuser sa fiche.");

  const ops = [
    prisma.client.update({
      where: { id: clientId },
      data: { onboardingMeasurementsDone: false, onboardingRejectionReason: msg },
    }),
  ];
  if (client.prospect) {
    ops.push(
      prisma.contactEvent.create({
        data: {
          prospectId: client.prospect.id,
          type: "SYSTEM",
          content: `Onboarding refusé — message envoyé au client : « ${msg} »`,
          createdById: userId,
        },
      })
    );
  }
  await prisma.$transaction(ops);
  return getClient(clientId);
}

/**
 * Clients « à valider » : métriques remplies mais pas encore inscrits (accès
 * dashboard non accordé). Pour l'admin = tous ; pour un coach = les siens.
 * Alimente la notification staff et l'agenda.
 */
export function listPendingValidation({ role, userId } = {}) {
  return prisma.client.findMany({
    where: {
      onboardingMeasurementsDone: true,
      enrolled: false,
      ...(role === "COACH" ? { group: { coachId: userId } } : {}),
    },
    select: {
      id: true,
      joinedAt: true,
      user: { select: { firstName: true, lastName: true } },
      group: { select: { name: true } },
    },
    orderBy: { joinedAt: "desc" },
  });
}

/**
 * Ajout direct d'un client en SUIVI INDIVIDUEL (1v1) — pour les clients déjà
 * coachés hors CRM. Crée en une fois :
 *   1. le compte utilisateur CLIENT (identifiant + mot de passe) ;
 *   2. un groupe PERSONNEL d'une place (« 1v1 — Prénom Nom ») relié au coach ;
 *   3. la fiche client, placée dans ce groupe et déjà inscrite (accès dashboard).
 * Le groupe perso sert de conteneur : le client apparaît ainsi dans l'espace
 * du coach, sans mélange avec les groupes collectifs.
 */
export async function createSoloClient({ firstName, lastName, email, phone, password, coachId, goalIds = [] }) {
  if (!firstName?.trim() || !lastName?.trim()) throw new ApiError("Le prénom et le nom sont requis.");
  if (!email?.trim()) throw new ApiError("L'e-mail est requis.");
  if (!password || password.length < 8) throw new ApiError("Mot de passe : 8 caractères minimum.");

  const emailTaken = await prisma.user.findUnique({ where: { email: email.trim() } });
  if (emailTaken) throw new ApiError("Un compte utilise déjà cette adresse e-mail.");

  const user = await createUser({
    email: email.trim(),
    firstName: firstName.trim(),
    lastName: lastName.trim(),
    phone: phone?.trim() || null,
    role: "CLIENT",
    password,
  });

  // Groupe personnel (capacité 1) relié au coach : le conteneur du suivi 1v1.
  const group = await prisma.group.create({
    data: {
      name: `1v1 — ${firstName.trim()} ${lastName.trim()}`,
      capacity: 1,
      coachId: coachId || null,
      goalId: null,
    },
  });

  const client = await prisma.client.create({
    data: {
      userId: user.id,
      groupId: group.id,
      enrolled: true, // client déjà suivi → accès direct à son espace
      onboardingMeasurementsDone: false, // il renseignera ses mensurations
      ...(goalIds.length ? { goals: { create: goalIds.map((goalId) => ({ goalId })) } } : {}),
    },
    include,
  });

  // Programme généré d'emblée s'il a un objectif (sinon on n'empêche rien).
  try {
    const { ensureClientProgram } = await import("@/modules/programs/program.service");
    await ensureClientProgram(client.id);
  } catch (err) {
    // Sans objectif, pas de programme : l'ajout reste valide.
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
    // Permet à l'admin de « redemander le remplissage » : remettre ce drapeau à
    // false renvoie le client sur la page de remplissage des métriques (gating).
    "onboardingMeasurementsDone",
    // Validation du paiement par le coach (débloque l'inscription au dashboard).
    "paid",
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

  // NB : le programme n'est PLUS régénéré automatiquement ici. Il est construit
  // à la main par le coach ; changer un objectif ne doit jamais écraser son
  // travail. (La régénération auto effaçait le programme personnalisé.)
  return updated;
}
