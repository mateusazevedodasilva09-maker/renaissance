/**
 * Programmes de démonstration pour les 2 clients démo (lucas.martin, emma.dubois) :
 * un programme ACTIF par client, avec 3 séances hebdomadaires (mardi/mercredi/jeudi)
 * composées d'exercices issus de la base animée importée (npm run db:exercises).
 *
 * Exécution : npm run db:demo (réexécutable sans danger : remplace le programme démo)
 * Prérequis : npm run db:seed puis npm run db:exercises
 */
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

/**
 * Pioche `count` exercices animés (issus du dataset) pour un groupe musculaire,
 * en décalant le point de départ pour que les programmes se ressemblent moins.
 */
async function pick(muscleGroup, count, offset = 0) {
  const list = await prisma.exercise.findMany({
    where: { externalId: { not: null }, muscleGroup, gifUrl: { not: null } },
    orderBy: { name: "asc" },
    skip: offset,
    take: count,
  });
  return list;
}

// Définition des programmes : un par client démo.
const PROGRAMS = [
  {
    username: "lucas.martin",
    title: "Perte de poids — cycle 1",
    notes: "3 séances/semaine : renforcement, cardio et force. Priorité à la régularité.",
    sessions: [
      {
        name: "Renforcement complet",
        weekday: "TUESDAY",
        blocks: [
          { muscleGroup: "Jambes", count: 2, offset: 0, sets: 3, reps: "12-15", restSec: 60 },
          { muscleGroup: "Pectoraux", count: 1, offset: 0, sets: 3, reps: "12", restSec: 60 },
          { muscleGroup: "Dos", count: 1, offset: 0, sets: 3, reps: "12", restSec: 60 },
          { muscleGroup: "Abdos / tronc", count: 2, offset: 0, sets: 3, reps: "30 s", restSec: 45 },
        ],
      },
      {
        name: "Cardio & gainage",
        weekday: "WEDNESDAY",
        blocks: [
          { muscleGroup: "Cardio", count: 3, offset: 0, sets: 4, reps: "45 s", restSec: 45 },
          { muscleGroup: "Abdos / tronc", count: 2, offset: 4, sets: 3, reps: "15", restSec: 45 },
        ],
      },
      {
        name: "Force bas du corps",
        weekday: "THURSDAY",
        blocks: [
          { muscleGroup: "Jambes", count: 3, offset: 4, sets: 4, reps: "8-10", restSec: 90 },
          { muscleGroup: "Mollets", count: 1, offset: 0, sets: 3, reps: "15", restSec: 60 },
          { muscleGroup: "Dos", count: 1, offset: 4, sets: 3, reps: "10", restSec: 90 },
        ],
      },
    ],
  },
  {
    username: "emma.dubois",
    title: "Prise de masse — cycle 1",
    notes: "3 séances/semaine en surcharge progressive. Collation protéinée après chaque séance.",
    sessions: [
      {
        name: "Haut du corps",
        weekday: "TUESDAY",
        blocks: [
          { muscleGroup: "Pectoraux", count: 2, offset: 2, sets: 4, reps: "8-10", restSec: 90 },
          { muscleGroup: "Épaules", count: 2, offset: 0, sets: 3, reps: "10", restSec: 75 },
          { muscleGroup: "Bras", count: 2, offset: 0, sets: 3, reps: "10-12", restSec: 60 },
        ],
      },
      {
        name: "Bas du corps",
        weekday: "WEDNESDAY",
        blocks: [
          { muscleGroup: "Jambes", count: 3, offset: 8, sets: 4, reps: "8-10", restSec: 90 },
          { muscleGroup: "Mollets", count: 1, offset: 2, sets: 4, reps: "12", restSec: 60 },
          { muscleGroup: "Abdos / tronc", count: 1, offset: 8, sets: 3, reps: "12", restSec: 45 },
        ],
      },
      {
        name: "Full body force",
        weekday: "THURSDAY",
        blocks: [
          { muscleGroup: "Dos", count: 2, offset: 8, sets: 4, reps: "6-8", restSec: 120 },
          { muscleGroup: "Jambes", count: 1, offset: 12, sets: 4, reps: "6-8", restSec: 120 },
          { muscleGroup: "Pectoraux", count: 1, offset: 6, sets: 4, reps: "8", restSec: 90 },
          { muscleGroup: "Épaules", count: 1, offset: 4, sets: 3, reps: "10", restSec: 75 },
        ],
      },
    ],
  },
];

async function main() {
  const animated = await prisma.exercise.count({ where: { externalId: { not: null } } });
  if (animated < 100) {
    console.error("La base animée n'est pas importée. Lancez d'abord : npm run db:exercises");
    process.exit(1);
  }

  for (const def of PROGRAMS) {
    const user = await prisma.user.findUnique({
      where: { username: def.username },
      include: { client: true },
    });
    const client = user?.client;
    if (!client) {
      console.warn(`Client démo introuvable (${def.username}) — lancez d'abord npm run db:seed. Ignoré.`);
      continue;
    }

    // Remplace l'ancien programme démo du même nom (réexécutable sans doublon)
    await prisma.program.deleteMany({ where: { clientId: client.id, title: def.title } });

    // Construit les séances avec les exercices du dataset
    const sessionsData = [];
    for (let s = 0; s < def.sessions.length; s++) {
      const sess = def.sessions[s];
      const exercisesData = [];
      let position = 0;
      for (const block of sess.blocks) {
        const picked = await pick(block.muscleGroup, block.count, block.offset);
        for (const ex of picked) {
          exercisesData.push({
            exerciseId: ex.id,
            position: position++,
            sets: block.sets,
            reps: block.reps,
            restSec: block.restSec,
          });
        }
      }
      sessionsData.push({
        name: sess.name,
        weekday: sess.weekday,
        position: s,
        exercises: { create: exercisesData },
      });
    }

    const program = await prisma.program.create({
      data: {
        title: def.title,
        status: "ACTIVE",
        notes: def.notes,
        clientId: client.id,
        sessions: { create: sessionsData },
      },
      include: { sessions: { include: { exercises: true } } },
    });

    const total = program.sessions.reduce((n, s) => n + s.exercises.length, 0);
    console.log(
      `${def.username} : programme « ${program.title} » créé — ${program.sessions.length} séances, ${total} exercices animés.`
    );
  }

  console.log("Terminé. Connectez-vous avec lucas.martin ou emma.dubois (Client1234!) pour voir le résultat.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
