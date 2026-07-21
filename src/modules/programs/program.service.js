/**
 * Domaine PROGRAMMES — création, génération et consultation.
 */
import prisma from "@/lib/prisma";
import { ApiError } from "@/lib/api";
import { getGenerator } from "./generation/registry";
import { mapGoalToGenerator } from "@/lib/goalMap";

// Correspondance niveau sportif du profil client -> niveau numérique du générateur.
const SPORT_LEVEL_TO_NUMBER = { "Débutant": 2, "Intermédiaire": 3, "Avancé": 5 };

/**
 * Paramètres de génération déduits automatiquement du profil du client :
 * son objectif (obligatoire) et son niveau sportif. Retourne null si le client
 * n'a pas d'objectif (rien à générer).
 */
function paramsFromClient(client) {
  const goalLabel = client?.goals?.[0]?.goal?.label;
  if (!goalLabel) return null;
  return {
    goal: mapGoalToGenerator(goalLabel),
    level: SPORT_LEVEL_TO_NUMBER[client.sportLevel] || 2,
    daysPerWeek: 3,
  };
}

const DEFAULT_GENERATOR = "basic";

const fullInclude = {
  sessions: {
    orderBy: { position: "asc" },
    include: { exercises: { orderBy: { position: "asc" }, include: { exercise: true } } },
  },
  client: { include: { user: { select: { firstName: true, lastName: true } } } },
};

export async function getProgram(id) {
  const program = await prisma.program.findUnique({ where: { id }, include: fullInclude });
  if (!program) throw new ApiError("Programme introuvable.", 404);
  return program;
}

/**
 * Programme actif vu par le client dans son espace : son programme personnel
 * s'il en a un, sinon le programme rattaché à l'un de ses objectifs
 * (« objectif = groupe = programme »).
 */
export async function getActiveProgramForClient(clientId) {
  // Génère automatiquement le programme s'il manque (objectif + niveau du profil).
  await ensureClientProgram(clientId);

  const personal = await prisma.program.findFirst({
    where: { clientId, status: "ACTIVE" },
    include: fullInclude,
    orderBy: { createdAt: "desc" },
  });
  if (personal) return personal;

  // Repli : le programme de l'objectif du client (programme de groupe).
  const goals = await prisma.clientGoal.findMany({ where: { clientId }, select: { goalId: true } });
  const goalIds = goals.map((g) => g.goalId);
  if (goalIds.length === 0) return null;
  return prisma.program.findFirst({
    where: { goalId: { in: goalIds }, status: "ACTIVE" },
    include: fullInclude,
    orderBy: { createdAt: "desc" },
  });
}

/** Programme actif rattaché à un objectif (« objectif = groupe = programme »). */
export function getActiveProgramForGoal(goalId) {
  return prisma.program.findFirst({
    where: { goalId, status: "ACTIVE" },
    include: fullInclude,
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Génère automatiquement le programme du client s'il n'en a pas encore, à partir
 * de son objectif et de son niveau sportif. Ne fait rien s'il a déjà un
 * programme actif ou s'il n'a pas d'objectif. Aucune action manuelle requise.
 */
export async function ensureClientProgram(clientId) {
  const existing = await prisma.program.findFirst({
    where: { clientId, status: "ACTIVE" },
    select: { id: true },
  });
  if (existing) return existing;

  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: { goals: { include: { goal: true } } },
  });
  const params = paramsFromClient(client);
  if (!params) return null; // pas d'objectif : rien à générer
  return generateProgram({ clientId, generatorKey: DEFAULT_GENERATOR, params });
}

/**
 * (Re)génère le programme du client depuis son profil (objectif + niveau) :
 * l'ancien programme actif est archivé automatiquement. Utilisé quand l'objectif
 * ou le niveau change, ou via le bouton « Regénérer ».
 */
export async function regenerateClientProgram(clientId) {
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: { goals: { include: { goal: true } } },
  });
  if (!client) throw new ApiError("Client introuvable.", 404);
  const params = paramsFromClient(client);
  if (!params) throw new ApiError("Ce client n'a pas d'objectif : impossible de générer un programme.");
  return generateProgram({ clientId, generatorKey: DEFAULT_GENERATOR, params });
}

/**
 * Génère et persiste un programme via la stratégie choisie.
 * Les paramètres d'entrée sont archivés en JSON sur le programme.
 */
export async function generateProgram({ clientId, goalId, generatorKey, params = {} }, { userId = null } = {}) {
  const generator = getGenerator(generatorKey);
  if (!generator) throw new ApiError(`Générateur inconnu : ${generatorKey}`);
  if (!clientId && !goalId) throw new ApiError("Un client ou un objectif est requis.");

  if (clientId) {
    const client = await prisma.client.findUnique({ where: { id: clientId } });
    if (!client) throw new ApiError("Client introuvable.", 404);
  }
  if (goalId) {
    const goal = await prisma.goal.findUnique({ where: { id: goalId } });
    if (!goal) throw new ApiError("Objectif introuvable.", 404);
  }

  const exercises = await prisma.exercise.findMany();
  let plan;
  try {
    plan = generator.generate(params, { exercises });
  } catch (err) {
    throw new ApiError(`Génération impossible : ${err.message}`);
  }

  // Un seul programme ACTIF par cible (client OU objectif) : on archive les
  // précédents avant de créer le nouveau.
  if (clientId) {
    await prisma.program.updateMany({ where: { clientId, status: "ACTIVE" }, data: { status: "ARCHIVED" } });
  }
  if (goalId) {
    await prisma.program.updateMany({ where: { goalId, status: "ACTIVE" }, data: { status: "ARCHIVED" } });
  }

  return prisma.program.create({
    data: {
      title: plan.title,
      clientId: clientId || null,
      goalId: goalId || null,
      createdById: userId,
      generatorKey,
      generationParams: params,
      status: "ACTIVE",
      sessions: {
        create: plan.sessions.map((s, si) => ({
          name: s.name,
          position: s.position ?? si,
          weekday: s.weekday || null,
          exercises: {
            create: s.exercises.map((e, ei) => ({
              exerciseId: e.exerciseId,
              sets: e.sets,
              reps: String(e.reps),
              restSec: e.restSec ?? null,
              tempo: e.tempo ?? null,
              notes: e.notes ?? null,
              position: e.position ?? ei,
            })),
          },
        })),
      },
    },
    include: fullInclude,
  });
}

export async function updateProgram(id, { title, status, notes }) {
  const program = await prisma.program.findUnique({ where: { id } });
  if (!program) throw new ApiError("Programme introuvable.", 404);

  // Un seul programme ACTIF par client : activer celui-ci archive les autres.
  if (status === "ACTIVE") {
    await prisma.program.updateMany({
      where: { clientId: program.clientId, status: "ACTIVE", NOT: { id } },
      data: { status: "ARCHIVED" },
    });
  }
  return prisma.program.update({
    where: { id },
    data: {
      ...(title !== undefined && { title }),
      ...(status !== undefined && { status }),
      ...(notes !== undefined && { notes }),
    },
    include: fullInclude,
  });
}

// --- Exercices ----------------------------------------------------------------

export function listExercises() {
  return prisma.exercise.findMany({ orderBy: { name: "asc" } });
}

export function createExercise({ name, muscleGroup, equipment, level, videoUrl, description }) {
  if (!name?.trim()) throw new ApiError("Le nom de l'exercice est requis.");
  return prisma.exercise.create({
    data: { name: name.trim(), muscleGroup, equipment, level: Number(level) || 1, videoUrl, description },
  });
}
