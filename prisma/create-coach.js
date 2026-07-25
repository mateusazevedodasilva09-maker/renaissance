/**
 * Crée (ou met à jour) un compte COACH, à lancer en local :
 *
 *   node prisma/create-coach.js <identifiant> <motdepasse> [email] [prénom] [nom]
 *
 * Exemple :
 *   node prisma/create-coach.js coach.mateus MonMotDePasse123
 *
 * Écrit directement dans la base pointée par DATABASE_URL (ton .env) — la même
 * que le site en ligne. Réexécutable sans danger (met à jour le mot de passe).
 */
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const prisma = new PrismaClient();

async function main() {
  const username = process.argv[2] || "coach.mateus";
  const password = process.argv[3] || "Coach1234!";
  const email = process.argv[4] || `${username}@essencia.local`;
  const firstName = process.argv[5] || "Mateus";
  const lastName = process.argv[6] || "Coach";

  if (password.length < 8) {
    console.error("❌ Mot de passe trop court : 8 caractères minimum.");
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.upsert({
    where: { username },
    update: { passwordHash, role: "COACH", isActive: true },
    create: { username, email, passwordHash, role: "COACH", firstName, lastName },
  });

  console.log("✅ Compte coach prêt.");
  console.log(`   Identifiant : ${username}`);
  console.log(`   Mot de passe : ${password}`);
  console.log(`   (id ${user.id})`);
}

main()
  .catch((e) => {
    console.error("❌ Erreur :", e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
