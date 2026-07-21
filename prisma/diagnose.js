/**
 * Outil de diagnostic : rejoue, hors de Next.js, la requête exacte de
 * `getClient()` (src/modules/clients/client.service.js) qui provoque
 * l'erreur « Invalid prisma.client.findUnique() invocation » sur la
 * fiche client, et affiche l'erreur COMPLÈTE dans le Terminal.
 *
 * Exécution : npm run diagnose
 *
 * Important : l'objet `include` ci-dessous doit rester une copie fidèle de
 * celui de client.service.js — si le service évolue, mettre ce fichier à jour.
 */
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

// Copie exacte de l'`include` de getClient() dans client.service.js.
const includeBase = {
  user: { select: { id: true, username: true, email: true, firstName: true, lastName: true, phone: true, isActive: true } },
  goals: { include: { goal: true } },
  prospect: { include: { status: true } },
  group: { include: { goal: true, coach: { select: { id: true, firstName: true, lastName: true } } } },
};

async function main() {
  console.log("— Diagnostic Renaissance —");
  console.log("Node :", process.version, "· Prisma Client :", require("@prisma/client/package.json").version);

  // 1. La base répond-elle ?
  const nbClients = await prisma.client.count();
  console.log(`Base OK — ${nbClients} client(s) en base.`);
  if (nbClients === 0) {
    console.log("Aucun client : lancez d'abord npm run db:seed.");
    return;
  }

  // 2. On prend le premier client et on rejoue la requête complète de getClient().
  const premier = await prisma.client.findFirst({ select: { id: true } });
  console.log(`Test de la requête getClient() sur le client ${premier.id}…`);

  const client = await prisma.client.findUnique({
    where: { id: premier.id },
    include: {
      ...includeBase,
      // Copie fidèle de la version CORRIGÉE de getClient() : le `orderBy` de
      // chaque relation est bien au même niveau que son `include` (l'ancienne
      // version le nichait dans l'`include` des séances, d'où l'erreur
      // « Unknown field `orderBy` for include statement » diagnostiquée ici).
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
      strengthLogs: { orderBy: { date: "asc" }, include: { exercise: true } },
      cardioLogs: { orderBy: { date: "asc" } },
      attendances: { orderBy: { date: "asc" } },
      feedbacks: { orderBy: { createdAt: "desc" } },
    },
  });

  // 3. Si on arrive ici, la requête passe : le problème est ailleurs (cache Next…).
  console.log("La requête getClient() fonctionne parfaitement :");
  console.log(`   ${client.user.firstName} ${client.user.lastName} — ${client.metrics.length} semaines de suivi, ${client.programs.length} programme(s).`);
  console.log("→ Le problème vient donc du serveur Next.js (cache) et non de la base.");
}

main()
  .catch((e) => {
    // On affiche TOUT : c'est précisément ce message complet qui nous manque.
    console.error("\nERREUR COMPLÈTE — copiez tout ce qui suit :\n");
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
