/**
 * Seed de la base Renaissance.
 * - Statuts de pipeline (11 étapes, modifiables ensuite depuis l'admin)
 * - Permissions par rôle
 * - Objectifs (alimentent les listes déroulantes) + types de séances + planning
 * - Bibliothèque d'exercices de départ
 * - Compte administrateur (identifiants via .env)
 * - Données de démonstration : 1 coach, 2 groupes, 2 clients avec 12 semaines
 *   de suivi généré (poids, force avec PR, cardio, présence, feedback, conseils)
 *
 * Exécution : npm run db:seed (réexécutable sans danger)
 */
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

// Pipeline demandé, dans l'ordre des colonnes du kanban.
const PIPELINE_STATUSES = [
  { key: "pas_de_reponse", label: "Pas de réponse", color: "#64748b", position: 0 },
  { key: "lead", label: "Lead", color: "#a855f7", position: 1 },
  { key: "premier_contact", label: "Premier contact", color: "#06b6d4", position: 2 },
  { key: "conv_engagee", label: "Conv. engagée", color: "#0ea5e9", position: 3 },
  { key: "appel_programme", label: "Appel programmé", color: "#3b82f6", position: 4 },
  { key: "appel_fait", label: "Appel fait", color: "#6366f1", position: 5 },
  { key: "fiche_envoyee", label: "Fiche envoyée", color: "#eab308", position: 6 },
  { key: "en_reflexion", label: "En réflexion", color: "#f59e0b", position: 7 },
  { key: "en_negociation", label: "En négociation", color: "#f97316", position: 8 },
  { key: "paye_inscrit", label: "Payé / Inscrit", color: "#22c55e", position: 9, isWon: true },
  { key: "perdu", label: "Perdu", color: "#ef4444", position: 10, isLost: true },
];

const PERMISSIONS = [
  { code: "crm.manage", label: "Gérer le CRM et la pipeline", roles: ["ADMIN"] },
  { code: "agenda.manage", label: "Gérer l'agenda (tâches, appels)", roles: ["ADMIN", "COACH"] },
  { code: "clients.manage", label: "Gérer les clients inscrits", roles: ["ADMIN", "COACH"] },
  { code: "sessions.manage", label: "Configurer les séances de groupe", roles: ["ADMIN", "COACH"] },
  { code: "programs.manage", label: "Créer et générer des programmes", roles: ["ADMIN", "COACH"] },
  { code: "tracking.manage", label: "Saisir le suivi hebdomadaire", roles: ["ADMIN", "COACH"] },
  { code: "feedback.manage", label: "Lire et répondre aux messages clients", roles: ["ADMIN", "COACH"] },
  { code: "users.manage", label: "Gérer les comptes utilisateurs", roles: ["ADMIN"] },
  { code: "groups.manage", label: "Gérer les groupes d'entraînement", roles: ["ADMIN"] },
  { code: "settings.manage", label: "Paramètres de l'application", roles: ["ADMIN"] },
];

// Objectifs de la liste déroulante (CRM + clients + groupes).
const GOALS = [
  { key: "perte_poids", label: "Perte de poids" },
  { key: "cardio", label: "Cardio" },
  { key: "full_body", label: "Full body" },
  { key: "prise_masse", label: "Prise de masse" },
  { key: "endurance_musculaire", label: "Endurance musculaire" },
];

const SESSION_TYPES = [
  { name: "Renforcement musculaire", color: "#e05d38", goals: ["full_body", "endurance_musculaire"] },
  { name: "Cardio", color: "#3b82f6", goals: ["cardio", "perte_poids"] },
  { name: "Force", color: "#8b5cf6", goals: ["prise_masse", "full_body"] },
];

const WEEKLY_SLOTS = [
  { weekday: "TUESDAY", startTime: "18:30", endTime: "19:30", type: "Renforcement musculaire" },
  { weekday: "WEDNESDAY", startTime: "18:30", endTime: "19:30", type: "Cardio" },
  { weekday: "THURSDAY", startTime: "18:30", endTime: "19:30", type: "Force" },
];

const EXERCISES = [
  { name: "Squat", muscleGroup: "Jambes", equipment: "Barre", level: 2 },
  { name: "Soulevé de terre", muscleGroup: "Chaîne postérieure", equipment: "Barre", level: 3 },
  { name: "Développé couché", muscleGroup: "Pectoraux", equipment: "Barre", level: 2 },
  { name: "Tractions", muscleGroup: "Dos", equipment: "Barre de traction", level: 3 },
  { name: "Rowing haltère", muscleGroup: "Dos", equipment: "Haltères", level: 1 },
  { name: "Développé militaire", muscleGroup: "Épaules", equipment: "Barre", level: 2 },
  { name: "Fentes marchées", muscleGroup: "Jambes", equipment: "Haltères", level: 1 },
  { name: "Gainage planche", muscleGroup: "Tronc", equipment: "Poids du corps", level: 1 },
  { name: "Burpees", muscleGroup: "Full body", equipment: "Poids du corps", level: 2 },
  { name: "Corde à sauter", muscleGroup: "Cardio", equipment: "Corde", level: 1 },
];

// --- Petits utilitaires de dates -------------------------------------------
function startOfWeek(d = new Date()) {
  const date = new Date(d);
  const day = (date.getDay() + 6) % 7; // lundi = 0
  date.setDate(date.getDate() - day);
  date.setHours(0, 0, 0, 0);
  return date;
}
function addDays(d, n) {
  const date = new Date(d);
  date.setDate(date.getDate() + n);
  return date;
}

async function main() {
  // 1. Statuts de pipeline
  for (const s of PIPELINE_STATUSES) {
    await prisma.pipelineStatus.upsert({
      where: { key: s.key },
      update: { label: s.label, color: s.color, position: s.position, isWon: !!s.isWon, isLost: !!s.isLost },
      create: s,
    });
  }
  // Nettoyage des anciens statuts non utilisés (ex. "non_viable")
  const keepKeys = PIPELINE_STATUSES.map((s) => s.key);
  const obsolete = await prisma.pipelineStatus.findMany({
    where: { key: { notIn: keepKeys } },
    include: { _count: { select: { prospects: true } } },
  });
  for (const o of obsolete) {
    if (o._count.prospects === 0) {
      await prisma.pipelineStatus.delete({ where: { id: o.id } }).catch(() => {});
    }
  }

  // 2. Permissions par rôle
  for (const p of PERMISSIONS) {
    const permission = await prisma.permission.upsert({
      where: { code: p.code },
      update: { label: p.label },
      create: { code: p.code, label: p.label },
    });
    for (const role of p.roles) {
      await prisma.rolePermission.upsert({
        where: { role_permissionId: { role, permissionId: permission.id } },
        update: {},
        create: { role, permissionId: permission.id },
      });
    }
  }

  // 3. Objectifs (+ nettoyage des anciens objectifs inutilisés)
  for (const g of GOALS) {
    await prisma.goal.upsert({ where: { key: g.key }, update: { label: g.label }, create: g });
  }
  const goalKeep = GOALS.map((g) => g.key);
  const goalObsolete = await prisma.goal.findMany({
    where: { key: { notIn: goalKeep } },
    include: { _count: { select: { clients: true, sessionTypes: true, prospects: true, groups: true } } },
  });
  for (const g of goalObsolete) {
    const c = g._count;
    if (c.clients === 0 && c.sessionTypes === 0 && c.prospects === 0 && c.groups === 0) {
      await prisma.goal.delete({ where: { id: g.id } }).catch(() => {});
    }
  }

  // 4. Types de séances + planning hebdo
  for (const t of SESSION_TYPES) {
    const type = await prisma.sessionType.upsert({
      where: { name: t.name },
      update: { color: t.color },
      create: { name: t.name, color: t.color },
    });
    for (const goalKey of t.goals) {
      const goal = await prisma.goal.findUnique({ where: { key: goalKey } });
      if (!goal) continue;
      await prisma.sessionTypeGoal.upsert({
        where: { sessionTypeId_goalId: { sessionTypeId: type.id, goalId: goal.id } },
        update: {},
        create: { sessionTypeId: type.id, goalId: goal.id },
      });
    }
  }
  const slotCount = await prisma.weeklySlot.count();
  if (slotCount === 0) {
    for (const s of WEEKLY_SLOTS) {
      const type = await prisma.sessionType.findUnique({ where: { name: s.type } });
      await prisma.weeklySlot.create({
        data: { weekday: s.weekday, startTime: s.startTime, endTime: s.endTime, sessionTypeId: type.id },
      });
    }
  }

  // 5. Exercices
  for (const e of EXERCISES) {
    await prisma.exercise.upsert({ where: { name: e.name }, update: {}, create: e });
  }

  // 6. Compte admin
  const username = process.env.SEED_ADMIN_USERNAME || "admin";
  const password = process.env.SEED_ADMIN_PASSWORD || "renaissance2026";
  const email = process.env.SEED_ADMIN_EMAIL || "admin@renaissance.local";
  await prisma.user.upsert({
    where: { username },
    update: { passwordHash: await bcrypt.hash(password, 12) },
    create: {
      username,
      email,
      passwordHash: await bcrypt.hash(password, 12),
      role: "ADMIN",
      firstName: "Mateus",
      lastName: "Admin",
    },
  });

  // 7. Données de démonstration (créées une seule fois)
  await seedDemo();

  console.log("✅ Seed terminé.");
  console.log(`   Admin : ${username} / ${password} (changez ce mot de passe)`);
  console.log("   Démo  : coach.demo / Coach1234!  ·  lucas.martin / Client1234!  ·  emma.dubois / Client1234!");
}

// ---------------------------------------------------------------------------
// Données de démonstration : coach, groupes, 2 clients avec suivi généré.
// ---------------------------------------------------------------------------
async function seedDemo() {
  const exists = await prisma.user.findUnique({ where: { username: "lucas.martin" } });
  if (exists) return; // déjà seedé

  const pwd = await bcrypt.hash("Client1234!", 12);
  const won = await prisma.pipelineStatus.findFirst({ where: { isWon: true } });
  const gPerte = await prisma.goal.findUnique({ where: { key: "perte_poids" } });
  const gMasse = await prisma.goal.findUnique({ where: { key: "prise_masse" } });
  const squat = await prisma.exercise.findUnique({ where: { name: "Squat" } });
  const bench = await prisma.exercise.findUnique({ where: { name: "Développé couché" } });
  const admin = await prisma.user.findFirst({ where: { role: "ADMIN" } });

  // Coach de démonstration
  const coach = await prisma.user.create({
    data: {
      username: "coach.demo",
      email: "coach@renaissance.local",
      passwordHash: await bcrypt.hash("Coach1234!", 12),
      role: "COACH",
      firstName: "Enzo",
      lastName: "Ferreira",
    },
  });

  // Groupes (capacité 7 par défaut), attribués au coach selon l'objectif
  const groupPerte = await prisma.group.create({
    data: { name: "Perte de poids — Groupe 1", goalId: gPerte.id, coachId: coach.id },
  });
  const groupMasse = await prisma.group.create({
    data: { name: "Prise de masse — Groupe 1", goalId: gMasse.id, coachId: coach.id },
  });

  const thisMonday = startOfWeek();
  const WEEKS = 12; // 12 semaines d'historique

  // --- Définition des deux clients démo -----------------------------------
  const demos = [
    {
      user: { username: "lucas.martin", email: "lucas.martin@demo.local", firstName: "Lucas", lastName: "Martin", phone: "0611223344" },
      prospect: { source: "SOCIAL_MEDIA", note: "Vu la pub Instagram. Très motivé, objectif mariage en fin d'année." },
      goal: gPerte,
      group: groupPerte,
      profile: {
        gender: "Homme", age: 32, heightCm: 178,
        lifestyle: "Travail de bureau, sédentaire", activityLevel: "Légèrement actif",
        sportLevel: "Débutant", bodyType: "Endomorphe", dietPreferences: "Sans restriction",
        startWeightKg: 110, targetWeightKg: 95, weeklyRateKg: -1,
        objectiveDeadline: addDays(thisMonday, 7 * 16),
      },
      weight: (i) => Math.round((104.8 - 0.55 * i + (i % 3 === 2 ? 0.3 : 0)) * 10) / 10,
      energy: [4, 5, 5, 6, 5, 6, 7, 6, 7, 8, 7, 8],
      attended: [2, 3, 3, 2, 3, 3, 3, 2, 3, 3, 3, 3],
      squat: [60, 62.5, 62.5, 65, 67.5, 70, 70, 72.5, 75, 77.5, 80, 85],
      bench: [40, 40, 42.5, 45, 45, 47.5, 50, 50, 52.5, 52.5, 55, 57.5],
      cardio: (i) => ({
        distanceKm: Math.round((3 + 0.3 * i) * 10) / 10,
        paceMinPerKm: Math.round((7.2 - 0.12 * i) * 100) / 100,
        avgHeartRate: Math.round(165 - 1.5 * i),
      }),
      coachComments: {
        3: "Bon mois de démarrage : la régularité paie, on garde le cap sur les 3 séances.",
        7: "Palier de poids normal cette semaine, on ajuste légèrement les portions le soir.",
        11: "Excellente progression au squat, PR mérité ! Prochain focus : le cardio du mercredi.",
      },
      feedbacks: [
        { weeksAgo: 1, content: "Bonne semaine, un peu de fatigue jeudi mais la séance force est bien passée.", reply: "Bien noté Lucas ! On allège un peu jeudi prochain et on garde l'intensité mardi. 💪" },
        { weeksAgo: 0, content: "Motivé pour cette semaine, je vise les 3 séances. Petite douleur au genou droit à surveiller." },
      ],
      advice: "Cette semaine : priorité à l'hydratation (2,5 L/jour) et 8 000 pas quotidiens en dehors des séances. On se retrouve mardi !",
    },
    {
      user: { username: "emma.dubois", email: "emma.dubois@demo.local", firstName: "Emma", lastName: "Dubois", phone: "0655667788" },
      prospect: { source: "WORD_OF_MOUTH", note: "Recommandée par Lucas. Sportive, veut structurer sa prise de masse." },
      goal: gMasse,
      group: groupMasse,
      profile: {
        gender: "Femme", age: 26, heightCm: 165,
        lifestyle: "Active, se déplace à vélo", activityLevel: "Très actif",
        sportLevel: "Intermédiaire", bodyType: "Ectomorphe", dietPreferences: "Végétarienne",
        startWeightKg: 52, targetWeightKg: 60, weeklyRateKg: 0.25,
        objectiveDeadline: addDays(thisMonday, 7 * 26),
      },
      weight: (i) => Math.round((54 + 0.28 * i - (i % 4 === 3 ? 0.2 : 0)) * 10) / 10,
      energy: [6, 6, 7, 7, 6, 8, 7, 8, 8, 7, 8, 9],
      attended: [3, 3, 2, 3, 3, 3, 3, 3, 2, 3, 3, 3],
      squat: [40, 42.5, 45, 45, 47.5, 50, 52.5, 52.5, 55, 57.5, 60, 62.5],
      bench: [25, 25, 27.5, 27.5, 30, 30, 32.5, 32.5, 35, 35, 37.5, 40],
      cardio: (i) => ({
        distanceKm: Math.round((4 + 0.15 * i) * 10) / 10,
        paceMinPerKm: Math.round((6.3 - 0.05 * i) * 100) / 100,
        avgHeartRate: Math.round(155 - 0.8 * i),
      }),
      coachComments: {
        5: "Très belle constance, la prise est propre (+1,5 kg en 6 semaines).",
        10: "PR au squat et au développé la même semaine, bravo ! On augmente les protéines de 10 g/j.",
      },
      feedbacks: [
        { weeksAgo: 0, content: "Séances au top cette semaine. Question : est-ce que je peux ajouter une séance d'escalade le samedi ?" },
      ],
      advice: "Objectif de la semaine : dormir 8 h par nuit — c'est là que se construit le muscle. Collation protéinée après chaque séance.",
    },
  ];

  const slotDays = [1, 2, 3]; // mardi, mercredi, jeudi (offsets depuis lundi)
  const slotLabels = ["Renforcement musculaire", "Cardio", "Force"];

  for (const d of demos) {
    // Prospect d'origine (l'historique CRM est conservé après conversion)
    const prospect = await prisma.prospect.create({
      data: {
        firstName: d.user.firstName,
        lastName: d.user.lastName,
        email: d.user.email,
        phone: d.user.phone,
        source: d.prospect.source,
        statusId: won.id,
        goalId: d.goal.id,
        generalNote: d.prospect.note,
        firstContactAt: addDays(thisMonday, -7 * (WEEKS + 3)),
        lastContactAt: addDays(thisMonday, -7 * WEEKS),
        assignedToId: admin?.id,
        contactEvents: {
          create: [
            { type: "SYSTEM", content: "Prospect créé (démo).", occurredAt: addDays(thisMonday, -7 * (WEEKS + 3)) },
            { type: "CALL", content: "Appel découverte : très bon contact, objectifs clairs.", occurredAt: addDays(thisMonday, -7 * (WEEKS + 2)) },
            { type: "DECISION", content: "Inscription confirmée — conversion en client.", occurredAt: addDays(thisMonday, -7 * WEEKS) },
          ],
        },
      },
    });

    // Utilisateur + client + objectifs + groupe
    const user = await prisma.user.create({
      data: { ...d.user, passwordHash: pwd, role: "CLIENT" },
    });
    const client = await prisma.client.create({
      data: {
        userId: user.id,
        prospectId: prospect.id,
        joinedAt: addDays(thisMonday, -7 * WEEKS),
        groupId: d.group.id,
        ...d.profile,
        goals: { create: [{ goalId: d.goal.id }] },
      },
    });

    // 12 semaines de suivi
    let maxSquat = 0;
    let maxBench = 0;
    for (let i = 0; i < WEEKS; i++) {
      const weekStart = addDays(thisMonday, -7 * (WEEKS - 1 - i));

      // Mesure hebdomadaire (+ bilan du coach sur certaines semaines)
      await prisma.weeklyMetric.create({
        data: {
          clientId: client.id,
          weekStart,
          weightKg: d.weight(i),
          energyLevel: d.energy[i],
          sessionsAttended: d.attended[i],
          sessionsPlanned: 3,
          coachComment: d.coachComments[i] || null,
        },
      });

      // Force : squat (mardi) et développé couché (jeudi), PR auto
      const squatW = d.squat[i];
      await prisma.strengthLog.create({
        data: {
          clientId: client.id, exerciseId: squat.id,
          date: addDays(weekStart, 1), weightKg: squatW, reps: 8,
          isPR: squatW > maxSquat,
        },
      });
      maxSquat = Math.max(maxSquat, squatW);
      const benchW = d.bench[i];
      await prisma.strengthLog.create({
        data: {
          clientId: client.id, exerciseId: bench.id,
          date: addDays(weekStart, 3), weightKg: benchW, reps: 8,
          isPR: benchW > maxBench,
        },
      });
      maxBench = Math.max(maxBench, benchW);

      // Cardio (mercredi)
      const c = d.cardio(i);
      await prisma.cardioLog.create({
        data: { clientId: client.id, date: addDays(weekStart, 2), ...c },
      });

      // Présence : 3 séances planifiées, absences selon le suivi
      for (let s = 0; s < 3; s++) {
        await prisma.attendance.create({
          data: {
            clientId: client.id,
            date: addDays(weekStart, slotDays[s]),
            label: slotLabels[s],
            present: s < d.attended[i],
          },
        });
      }
    }

    // Feedback hebdo au coach
    for (const f of d.feedbacks) {
      await prisma.feedbackMessage.create({
        data: {
          clientId: client.id,
          weekStart: addDays(thisMonday, -7 * f.weeksAgo),
          content: f.content,
          coachReply: f.reply || null,
          repliedAt: f.reply ? new Date() : null,
          createdAt: addDays(thisMonday, -7 * f.weeksAgo + 4),
        },
      });
    }

    // Conseil de la semaine pour le groupe
    await prisma.weeklyAdvice.create({
      data: { weekStart: thisMonday, content: d.advice, groupId: d.group.id, authorId: coach.id },
    });
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
