/**
 * Import de la base d'exercices animés (1 324 exercices).
 * Source : https://github.com/hasaneyldrm/exercises-dataset
 * (usage éducatif / non commercial — voir la licence du dépôt)
 *
 * Lancement : npm run db:exercises
 * Le script est idempotent : relançable sans créer de doublons.
 */
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const RAW_BASE = "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/";
const DATA_URL = RAW_BASE + "data/exercises.json";

// Traductions FR des parties du corps du dataset
const BODY_PARTS_FR = {
  chest: "Pectoraux",
  back: "Dos",
  shoulders: "Épaules",
  "upper arms": "Bras",
  "lower arms": "Avant-bras",
  "upper legs": "Jambes",
  "lower legs": "Mollets",
  waist: "Abdos / tronc",
  cardio: "Cardio",
  neck: "Cou",
};

// Traductions FR du matériel
const EQUIPMENT_FR = {
  "body weight": "Poids du corps",
  dumbbell: "Haltères",
  barbell: "Barre",
  cable: "Poulie",
  "leverage machine": "Machine guidée",
  band: "Élastique",
  "smith machine": "Smith machine",
  kettlebell: "Kettlebell",
  weighted: "Lesté",
  "stability ball": "Swiss ball",
  "ez barbell": "Barre EZ",
  rope: "Corde",
  "medicine ball": "Medicine ball",
  "bosu ball": "Bosu",
  "wheel roller": "Roue abdominale",
  "sled machine": "Presse / sled",
  "upper body ergometer": "Ergomètre",
  "skierg machine": "SkiErg",
  "stationary bike": "Vélo",
  "elliptical machine": "Elliptique",
  "stepmill machine": "Stepper",
  assisted: "Assisté",
  hammer: "Hammer",
  "trap bar": "Trap bar",
  "olympic barbell": "Barre olympique",
  tire: "Pneu",
  "resistance band": "Élastique",
  roller: "Rouleau",
};

const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
const frBodyPart = (v) => BODY_PARTS_FR[v?.toLowerCase()] || cap(v);
const frEquipment = (v) => EQUIPMENT_FR[v?.toLowerCase()] || cap(v);

async function main() {
  console.log("⬇️  Téléchargement du dataset…");
  const res = await fetch(DATA_URL);
  if (!res.ok) throw new Error(`Téléchargement impossible (${res.status}). Vérifiez votre connexion.`);
  const exercises = await res.json();
  console.log(`   ${exercises.length} exercices reçus.`);

  let created = 0;
  let updated = 0;
  let enriched = 0;

  for (const ex of exercises) {
    const data = {
      name: cap(ex.name),
      muscleGroup: frBodyPart(ex.body_part || ex.category),
      equipment: frEquipment(ex.equipment),
      description: ex.instructions?.en || null,
      externalId: ex.id,
      bodyPart: ex.body_part || ex.category || null,
      target: ex.target || null,
      imageUrl: ex.image ? encodeURI(RAW_BASE + ex.image) : null,
      gifUrl: ex.gif_url ? encodeURI(RAW_BASE + ex.gif_url) : null,
    };

    try {
      const existing = await prisma.exercise.findUnique({ where: { externalId: ex.id } });
      if (existing) {
        await prisma.exercise.update({ where: { id: existing.id }, data });
        updated++;
      } else {
        await prisma.exercise.create({ data });
        created++;
      }
    } catch (err) {
      if (err.code === "P2002") {
        // Un exercice du même nom existe déjà (ex. créé à la main) :
        // on l'enrichit avec le GIF et les métadonnées du dataset.
        await prisma.exercise.update({ where: { name: data.name }, data });
        enriched++;
      } else {
        console.error(`   ⚠️ Exercice ${ex.id} (${ex.name}) ignoré : ${err.message}`);
      }
    }
  }

  console.log("✅ Import terminé.");
  console.log(`   ${created} créés · ${updated} mis à jour · ${enriched} enrichis (nom déjà existant).`);
  console.log("   Les GIFs sont chargés depuis GitHub à l'affichage (connexion requise).");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
