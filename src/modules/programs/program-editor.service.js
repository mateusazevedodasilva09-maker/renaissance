/**
 * Domaine PROGRAMMES — édition manuelle et modèles réutilisables.
 *
 * Séparé de program.service.js (génération / consultation) pour garder une
 * forte cohésion : ici, uniquement les retouches faites à la main par le
 * coach (jours, exercices, paramètres) et la gestion des modèles.
 *
 * Philosophie : le générateur produit un brouillon ; le coach l'ajuste ici
 * en quelques secondes au lieu de repartir de zéro.
 */
import prisma from "@/lib/prisma";
import { ApiError } from "@/lib/api";

// Include complet réutilisé par toutes les fonctions : après chaque
// modification on renvoie le programme entier, pour que l'interface se
// resynchronise en un seul aller-retour.
const fullInclude = {
  sessions: {
    orderBy: { position: "asc" },
    include: { exercises: { orderBy: { position: "asc" }, include: { exercise: true } } },
  },
  client: { include: { user: { select: { firstName: true, lastName: true } } } },
};

/** Recharge le programme complet (réponse standard de toutes les mutations). */
function reloadProgram(programId) {
  return prisma.program.findUnique({ where: { id: programId }, include: fullInclude });
}

/**
 * Crée un programme VIERGE (sans générateur) pour un client, prêt à être
 * construit à la main par le coach. L'ancien programme actif est archivé (même
 * règle que la génération / l'application de modèle). On démarre avec un jour
 * vide pour que le coach puisse ajouter ses exercices tout de suite.
 */
export async function createBlankProgram(clientId, { title } = {}, { userId = null } = {}) {
  const client = await prisma.client.findUnique({ where: { id: clientId } });
  if (!client) throw new ApiError("Client introuvable.", 404);

  await prisma.program.updateMany({ where: { clientId, status: "ACTIVE" }, data: { status: "ARCHIVED" } });

  return prisma.program.create({
    data: {
      title: title?.trim() || "Programme personnalisé",
      status: "ACTIVE",
      clientId,
      createdById: userId,
      sessions: { create: [{ name: "Jour 1", position: 0 }] },
    },
    include: fullInclude,
  });
}

// ===========================================================================
// JOURS (ProgramSession)
// ===========================================================================

/** Ajoute un jour vide à la fin du programme. */
export async function addSession(programId, { name, weekday } = {}) {
  const program = await prisma.program.findUnique({
    where: { id: programId },
    include: { sessions: { select: { position: true } } },
  });
  if (!program) throw new ApiError("Programme introuvable.", 404);

  const nextPosition = program.sessions.reduce((max, s) => Math.max(max, s.position), -1) + 1;
  await prisma.programSession.create({
    data: {
      programId,
      name: name?.trim() || `Jour ${program.sessions.length + 1}`,
      weekday: weekday || null,
      position: nextPosition,
    },
  });
  return reloadProgram(programId);
}

/** Renomme un jour ou change son jour de la semaine. */
export async function updateSession(sessionId, { name, weekday }) {
  const session = await prisma.programSession.findUnique({ where: { id: sessionId } });
  if (!session) throw new ApiError("Jour introuvable.", 404);

  await prisma.programSession.update({
    where: { id: sessionId },
    data: {
      ...(name !== undefined && { name: name.trim() || session.name }),
      ...(weekday !== undefined && { weekday: weekday || null }),
    },
  });
  return reloadProgram(session.programId);
}

/** Supprime un jour et tous ses exercices (cascade Prisma). */
export async function deleteSession(sessionId) {
  const session = await prisma.programSession.findUnique({ where: { id: sessionId } });
  if (!session) throw new ApiError("Jour introuvable.", 404);
  await prisma.programSession.delete({ where: { id: sessionId } });
  return reloadProgram(session.programId);
}

/** Déplace un jour d'un cran vers le haut ou le bas (échange de positions). */
export async function moveSession(sessionId, direction) {
  const session = await prisma.programSession.findUnique({ where: { id: sessionId } });
  if (!session) throw new ApiError("Jour introuvable.", 404);

  const siblings = await prisma.programSession.findMany({
    where: { programId: session.programId },
    orderBy: { position: "asc" },
  });
  const index = siblings.findIndex((s) => s.id === sessionId);
  const targetIndex = direction === "up" ? index - 1 : index + 1;
  // Déjà en bout de liste : rien à faire, on renvoie l'état actuel.
  if (targetIndex < 0 || targetIndex >= siblings.length) return reloadProgram(session.programId);

  const target = siblings[targetIndex];
  // Échange des deux positions dans une transaction (jamais d'état intermédiaire).
  await prisma.$transaction([
    prisma.programSession.update({ where: { id: session.id }, data: { position: target.position } }),
    prisma.programSession.update({ where: { id: target.id }, data: { position: session.position } }),
  ]);
  return reloadProgram(session.programId);
}

// ===========================================================================
// EXERCICES (ProgramExercise)
// ===========================================================================

/** Ajoute un exercice de la bibliothèque à la fin d'un jour. */
export async function addExercise(sessionId, { exerciseId, sets, reps, restSec, tempo, notes }) {
  const session = await prisma.programSession.findUnique({
    where: { id: sessionId },
    include: { exercises: { select: { position: true } } },
  });
  if (!session) throw new ApiError("Jour introuvable.", 404);
  if (!exerciseId) throw new ApiError("Choisissez un exercice.");
  const exercise = await prisma.exercise.findUnique({ where: { id: exerciseId } });
  if (!exercise) throw new ApiError("Exercice introuvable.", 404);

  const nextPosition = session.exercises.reduce((max, e) => Math.max(max, e.position), -1) + 1;
  await prisma.programExercise.create({
    data: {
      sessionId,
      exerciseId,
      sets: Number(sets) || 3,
      reps: String(reps || "10"),
      restSec: restSec ? Number(restSec) : null,
      tempo: tempo || null,
      notes: notes || null,
      position: nextPosition,
    },
  });
  return reloadProgram(session.programId);
}

/**
 * Modifie les paramètres d'un exercice du programme : séries, répétitions,
 * repos, tempo, note. Passer un `exerciseId` échange l'exercice contre un
 * autre de la bibliothèque en conservant les paramètres.
 */
export async function updateExercise(programExerciseId, { exerciseId, sets, reps, restSec, tempo, notes }) {
  const item = await prisma.programExercise.findUnique({
    where: { id: programExerciseId },
    include: { session: { select: { programId: true } } },
  });
  if (!item) throw new ApiError("Exercice du programme introuvable.", 404);

  // Échange d'exercice : on vérifie que le remplaçant existe bien.
  if (exerciseId !== undefined) {
    const exercise = await prisma.exercise.findUnique({ where: { id: exerciseId } });
    if (!exercise) throw new ApiError("Exercice de remplacement introuvable.", 404);
  }

  await prisma.programExercise.update({
    where: { id: programExerciseId },
    data: {
      ...(exerciseId !== undefined && { exerciseId }),
      ...(sets !== undefined && { sets: Math.max(1, Number(sets) || 1) }),
      ...(reps !== undefined && { reps: String(reps) }),
      ...(restSec !== undefined && { restSec: restSec === null || restSec === "" ? null : Number(restSec) }),
      ...(tempo !== undefined && { tempo: tempo || null }),
      ...(notes !== undefined && { notes: notes || null }),
    },
  });
  return reloadProgram(item.session.programId);
}

/** Retire un exercice d'un jour. */
export async function deleteExercise(programExerciseId) {
  const item = await prisma.programExercise.findUnique({
    where: { id: programExerciseId },
    include: { session: { select: { programId: true } } },
  });
  if (!item) throw new ApiError("Exercice du programme introuvable.", 404);
  await prisma.programExercise.delete({ where: { id: programExerciseId } });
  return reloadProgram(item.session.programId);
}

/** Déplace un exercice d'un cran vers le haut ou le bas dans son jour. */
export async function moveExercise(programExerciseId, direction) {
  const item = await prisma.programExercise.findUnique({
    where: { id: programExerciseId },
    include: { session: { select: { programId: true } } },
  });
  if (!item) throw new ApiError("Exercice du programme introuvable.", 404);

  const siblings = await prisma.programExercise.findMany({
    where: { sessionId: item.sessionId },
    orderBy: { position: "asc" },
  });
  const index = siblings.findIndex((e) => e.id === programExerciseId);
  const targetIndex = direction === "up" ? index - 1 : index + 1;
  if (targetIndex < 0 || targetIndex >= siblings.length) return reloadProgram(item.session.programId);

  const target = siblings[targetIndex];
  await prisma.$transaction([
    prisma.programExercise.update({ where: { id: item.id }, data: { position: target.position } }),
    prisma.programExercise.update({ where: { id: target.id }, data: { position: item.position } }),
  ]);
  return reloadProgram(item.session.programId);
}

// ===========================================================================
// MODÈLES RÉUTILISABLES (Program.isTemplate)
// ===========================================================================

/** Liste des modèles enregistrés, du plus récent au plus ancien. */
export function listTemplates() {
  return prisma.program.findMany({
    where: { isTemplate: true },
    orderBy: { createdAt: "desc" },
    include: {
      sessions: {
        orderBy: { position: "asc" },
        include: { exercises: { orderBy: { position: "asc" }, include: { exercise: true } } },
      },
    },
  });
}

/**
 * Copie intégrale d'un programme (jours + exercices) vers une nouvelle cible.
 * Utilisée à la fois pour « enregistrer comme modèle » et « appliquer un
 * modèle » : seule la destination change.
 */
async function duplicateProgram(source, { title, isTemplate, clientId = null, goalId = null, status, userId = null }) {
  return prisma.program.create({
    data: {
      title,
      isTemplate,
      clientId,
      goalId,
      status,
      createdById: userId,
      // Traçabilité : on note en JSON de quel programme provient la copie.
      generationParams: { copiedFromProgramId: source.id },
      sessions: {
        create: source.sessions.map((s) => ({
          name: s.name,
          position: s.position,
          weekday: s.weekday,
          exercises: {
            create: s.exercises.map((e) => ({
              exerciseId: e.exerciseId,
              sets: e.sets,
              reps: e.reps,
              restSec: e.restSec,
              tempo: e.tempo,
              notes: e.notes,
              position: e.position,
            })),
          },
        })),
      },
    },
    include: fullInclude,
  });
}

/** Enregistre une copie du programme comme modèle réutilisable. */
export async function saveAsTemplate(programId, { title } = {}, { userId = null } = {}) {
  const source = await prisma.program.findUnique({
    where: { id: programId },
    include: { sessions: { include: { exercises: true }, orderBy: { position: "asc" } } },
  });
  if (!source) throw new ApiError("Programme introuvable.", 404);

  return duplicateProgram(source, {
    title: title?.trim() || `${source.title} (modèle)`,
    isTemplate: true,
    status: "DRAFT", // un modèle n'est jamais « actif » : il sert de source de copie
    userId,
  });
}

/**
 * Applique un modèle à un client : copie du modèle en programme personnel
 * ACTIF (l'ancien programme actif du client est archivé automatiquement,
 * même règle que pour la génération).
 */
export async function applyTemplate(templateId, { clientId }, { userId = null } = {}) {
  const template = await prisma.program.findUnique({
    where: { id: templateId },
    include: { sessions: { include: { exercises: true }, orderBy: { position: "asc" } } },
  });
  if (!template || !template.isTemplate) throw new ApiError("Modèle introuvable.", 404);
  if (!clientId) throw new ApiError("Un client est requis pour appliquer un modèle.");
  const client = await prisma.client.findUnique({ where: { id: clientId } });
  if (!client) throw new ApiError("Client introuvable.", 404);

  await prisma.program.updateMany({ where: { clientId, status: "ACTIVE" }, data: { status: "ARCHIVED" } });
  return duplicateProgram(template, {
    title: template.title.replace(/ \(modèle\)$/, ""),
    isTemplate: false,
    clientId,
    status: "ACTIVE",
    userId,
  });
}

/** Supprime un modèle (jours et exercices supprimés en cascade). */
export async function deleteTemplate(templateId) {
  const template = await prisma.program.findUnique({ where: { id: templateId } });
  if (!template || !template.isTemplate) throw new ApiError("Modèle introuvable.", 404);
  await prisma.program.delete({ where: { id: templateId } });
  return { deleted: true };
}
