/**
 * Clients de démonstration supplémentaires pour Renaissance.
 *
 * Complète les 2 clients créés par prisma/seed.js (lucas.martin, emma.dubois)
 * avec 7 nouveaux clients réalistes, chacun avec :
 *   - son prospect d'origine (statut « gagné ») et son historique de contact,
 *   - un profil complet (morphologie, style de vie, objectif chiffré),
 *   - une assignation automatique à un groupe (même logique que
 *     src/modules/clients/group.service.js : groupe actif du même objectif
 *     avec une place libre, sinon création d'un « Objectif — Groupe N »),
 *   - 12 semaines de suivi généré avec une courbe DIFFÉRENTE par client
 *     (progression régulière, palier, rechute, progression éclair…) :
 *     poids, énergie, force (avec PR automatiques), cardio, présence, feedback.
 *
 * Exécution : node prisma/more-clients.js
 * Prérequis : npm run db:seed (statuts pipeline, objectifs, exercices, admin)
 * Réexécutable sans danger : un client déjà présent (même username) est ignoré.
 */
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

// --- Petits utilitaires de dates (identiques à ceux de seed.js) ------------
// startOfWeek ramène une date au lundi 00:00 : toutes les données hebdo
// (WeeklyMetric, feedback…) sont alignées sur le lundi de leur semaine.
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

// Point d'ancrage temporel : tout l'historique est calculé à rebours depuis
// le lundi de la semaine courante, comme dans seedDemo() de seed.js.
const thisMonday = startOfWeek();
const WEEKS = 12; // 12 semaines d'historique par client

// Créneaux hebdomadaires de la démo (mardi / mercredi / jeudi), repris du
// planning créé par seed.js pour que les présences collent à l'agenda.
const slotDays = [1, 2, 3]; // offsets depuis le lundi
const slotLabels = ["Renforcement musculaire", "Cardio", "Force"];

// ---------------------------------------------------------------------------
// Définition des 7 clients de démonstration.
//
// Conventions (identiques à seedDemo) :
//   - les tableaux (weight, energy, attended, charges, cardio.*) font 12
//     entrées : indice 0 = semaine la plus ancienne, indice 11 = semaine
//     en cours. Les courbes sont volontairement différentes d'un client à
//     l'autre pour rendre les graphiques de l'app intéressants ;
//   - `exercises` : 2 exercices de la bibliothèque du seed, retrouvés par
//     nom. Le premier est loggé le mardi, le second le jeudi, PR automatique ;
//   - `coachComments` : bilan du coach sur 2-3 semaines clés (indice → texte) ;
//   - `feedbacks` : messages du client (weeksAgo = recul en semaines),
//     avec réponse du coach quand `reply` est renseigné ;
//   - `prospect.events` : historique CRM antérieur à l'inscription
//     (weeksBeforeJoin = semaines AVANT la conversion en client).
// ---------------------------------------------------------------------------
const CLIENTS = [
  {
    // Sophie — perte de poids, la « bonne élève » : perte régulière de
    // ~0,6 kg/semaine, sans à-coups. Sert de courbe de référence.
    user: { username: "sophie.bernard", email: "sophie.bernard@demo.local", firstName: "Sophie", lastName: "Bernard", phone: "0612345671" },
    goalKey: "perte_poids",
    prospect: {
      source: "FORM",
      note: "Venue via le formulaire du site. Horaires décalés (infirmière), cherche un cadre simple et tenable.",
      events: [
        { type: "SYSTEM", content: "Prospect créé via le formulaire public (démo).", weeksBeforeJoin: 3 },
        { type: "CALL", content: "Appel découverte : motivée, veut perdre du poids durablement sans régime extrême.", weeksBeforeJoin: 2 },
        { type: "DECISION", content: "Inscription confirmée — conversion en cliente.", weeksBeforeJoin: 0 },
      ],
    },
    profile: {
      gender: "Femme", age: 41, heightCm: 164,
      lifestyle: "Infirmière, horaires décalés", activityLevel: "Modérément actif",
      sportLevel: "Débutant", bodyType: "Mésomorphe", dietPreferences: "Sans gluten",
      startWeightKg: 86, targetWeightKg: 72, weeklyRateKg: -0.6,
      objectiveDeadline: addDays(thisMonday, 7 * 20),
    },
    weight: [84.5, 83.9, 83.4, 82.8, 82.3, 81.7, 81.2, 80.6, 80.1, 79.4, 78.8, 78.2],
    energy: [4, 5, 5, 5, 6, 6, 6, 7, 7, 7, 8, 8],
    attended: [3, 3, 2, 3, 3, 3, 2, 3, 3, 3, 3, 3],
    exercises: [
      { name: "Squat", charges: [40, 42.5, 45, 45, 47.5, 50, 50, 52.5, 55, 55, 57.5, 60] },
      { name: "Rowing haltère", charges: [12, 14, 14, 16, 16, 18, 18, 20, 20, 22, 22, 24] },
    ],
    cardio: {
      distanceKm: [2.5, 2.8, 3, 3.2, 3.5, 3.8, 4, 4.2, 4.5, 4.8, 5, 5.2],
      paceMinPerKm: [7.8, 7.7, 7.6, 7.5, 7.4, 7.2, 7.1, 7, 6.9, 6.8, 6.6, 6.5],
      avgHeartRate: [162, 160, 159, 158, 156, 155, 154, 152, 151, 150, 148, 147],
    },
    coachComments: {
      3: "Premier mois exemplaire : -1,7 kg sans frustration, on ne change rien.",
      8: "La perte est parfaitement régulière, l'énergie remonte : le rythme est le bon.",
    },
    feedbacks: [
      { weeksAgo: 1, content: "Semaine de nuit à l'hôpital mais j'ai tenu mes 3 séances, fière de moi !", reply: "Bravo Sophie, tenir le cap avec ces horaires c'est la vraie victoire. On garde le même rythme. 💪" },
      { weeksAgo: 0, content: "Objectif de la semaine : préparer mes repas le dimanche pour éviter les grignotages de garde." },
    ],
  },
  {
    // Karim — prise de masse, la « progression éclair » : jeune étudiant
    // STAPS qui répond très vite à l'entraînement (gros gains de force).
    user: { username: "karim.benali", email: "karim.benali@demo.local", firstName: "Karim", lastName: "Benali", phone: "0623456782" },
    goalKey: "prise_masse",
    prospect: {
      source: "SOCIAL_MEDIA",
      note: "A vu les résultats d'Emma sur Instagram. Étudiant STAPS, veut prendre de la masse proprement.",
      events: [
        { type: "MESSAGE", content: "Premier message en DM Instagram : questions sur la prise de masse (démo).", weeksBeforeJoin: 3 },
        { type: "CALL", content: "Appel découverte : profil très réceptif, aucun frein, budget ok.", weeksBeforeJoin: 1 },
        { type: "DECISION", content: "Inscription confirmée — conversion en client.", weeksBeforeJoin: 0 },
      ],
    },
    profile: {
      gender: "Homme", age: 23, heightCm: 181,
      lifestyle: "Étudiant STAPS, très disponible", activityLevel: "Très actif",
      sportLevel: "Intermédiaire", bodyType: "Ectomorphe", dietPreferences: "Hypercalorique, sans porc",
      startWeightKg: 66, targetWeightKg: 76, weeklyRateKg: 0.5,
      objectiveDeadline: addDays(thisMonday, 7 * 20),
    },
    weight: [66, 66.8, 67.5, 68.4, 69.2, 70.1, 70.9, 71.6, 72.4, 73.1, 73.9, 74.8],
    energy: [7, 7, 8, 8, 8, 8, 9, 8, 9, 9, 9, 9],
    attended: [3, 3, 3, 3, 2, 3, 3, 3, 3, 3, 3, 3],
    exercises: [
      { name: "Développé couché", charges: [50, 55, 57.5, 60, 62.5, 65, 70, 72.5, 75, 77.5, 80, 85] },
      { name: "Soulevé de terre", charges: [80, 85, 90, 95, 100, 105, 110, 112.5, 120, 125, 130, 140] },
    ],
    cardio: {
      distanceKm: [3, 3, 3.2, 3.2, 3.5, 3.5, 3.5, 3.8, 3.8, 4, 4, 4],
      paceMinPerKm: [6.5, 6.4, 6.4, 6.3, 6.3, 6.2, 6.2, 6.1, 6.1, 6, 6, 5.9],
      avgHeartRate: [150, 149, 149, 148, 148, 147, 146, 146, 145, 145, 144, 143],
    },
    coachComments: {
      5: "Progression éclair mais propre : +4 kg en 6 semaines et la technique suit.",
      11: "140 kg au soulevé de terre, PR énorme. On consolide 2 semaines avant de repousser.",
    },
    feedbacks: [
      { weeksAgo: 0, content: "PR au soulevé de terre cette semaine ! Est-ce que je peux passer à 4 séances ?" },
    ],
  },
  {
    // Julie — cardio, le « long palier puis déclic » : stagnation frustrante
    // des semaines 3 à 7, puis nette amélioration de l'allure.
    user: { username: "julie.moreau", email: "julie.moreau@demo.local", firstName: "Julie", lastName: "Moreau", phone: "0634567893" },
    goalKey: "cardio",
    prospect: {
      source: "WORD_OF_MOUTH",
      note: "Recommandée par une collègue. Veut retrouver du souffle pour courir avec ses enfants.",
      events: [
        { type: "NOTE", content: "Contact pris au téléphone via une collègue déjà cliente (démo).", weeksBeforeJoin: 2 },
        { type: "DECISION", content: "Inscription confirmée — conversion en cliente.", weeksBeforeJoin: 0 },
      ],
    },
    profile: {
      gender: "Femme", age: 37, heightCm: 168,
      lifestyle: "Enseignante, deux enfants", activityLevel: "Légèrement actif",
      sportLevel: "Débutant", bodyType: "Mésomorphe", dietPreferences: "Sans restriction",
      startWeightKg: 64, targetWeightKg: 61, weeklyRateKg: -0.2,
      objectiveDeadline: addDays(thisMonday, 7 * 24),
    },
    weight: [63.5, 63.2, 63, 63.1, 63, 63.1, 63, 62.9, 62.6, 62.3, 62, 61.8],
    energy: [6, 6, 5, 5, 5, 4, 5, 6, 7, 7, 8, 8],
    attended: [3, 2, 3, 2, 3, 2, 3, 3, 3, 3, 3, 3],
    exercises: [
      { name: "Squat", charges: [35, 35, 37.5, 37.5, 37.5, 40, 40, 40, 42.5, 45, 45, 47.5] },
      { name: "Rowing haltère", charges: [10, 10, 12, 12, 12, 12, 14, 14, 14, 16, 16, 18] },
    ],
    cardio: {
      // Le palier est visible ici : allure bloquée à 6,3 min/km pendant
      // 5 semaines, puis déclic à partir de la semaine 8.
      distanceKm: [4, 4.5, 5, 5, 5, 5, 5, 5.5, 6, 6.5, 7, 7.5],
      paceMinPerKm: [6.5, 6.4, 6.3, 6.3, 6.3, 6.3, 6.3, 6.2, 5.9, 5.7, 5.5, 5.3],
      avgHeartRate: [160, 158, 157, 157, 158, 157, 156, 154, 151, 149, 147, 145],
    },
    coachComments: {
      5: "Le palier est frustrant mais normal : le corps s'adapte. On introduit du fractionné la semaine prochaine.",
      9: "Le déclic ! -0,4 min/km en deux semaines, le fractionné a payé.",
    },
    feedbacks: [
      { weeksAgo: 2, content: "J'ai l'impression de stagner depuis un mois, c'est décourageant…", reply: "C'est LE palier classique Julie, tout le monde y passe. Le fractionné qu'on vient d'ajouter va le débloquer, tu verras d'ici 2 semaines." },
      { weeksAgo: 0, content: "Vous aviez raison pour le fractionné, je re-progresse ! Prochaine étape : courir 8 km sans pause." },
    ],
  },
  {
    // Thomas — perte de poids, la « rechute » : bon départ, décrochage
    // complet pendant les congés (semaines 6-7), puis reprise en main.
    user: { username: "thomas.lefevre", email: "thomas.lefevre@demo.local", firstName: "Thomas", lastName: "Lefevre", phone: "0645678904" },
    goalKey: "perte_poids",
    prospect: {
      source: "FLYER",
      note: "Flyer déposé à la boulangerie de son quartier. Commercial souvent en déplacement, repas d'affaires fréquents.",
      events: [
        { type: "CALL", content: "Appel entrant après le flyer : hésite, peur de ne pas tenir avec les déplacements (démo).", weeksBeforeJoin: 3 },
        { type: "EMAIL", content: "Envoi de la fiche de présentation + témoignages clients.", weeksBeforeJoin: 2 },
        { type: "DECISION", content: "Inscription confirmée — conversion en client.", weeksBeforeJoin: 0 },
      ],
    },
    profile: {
      gender: "Homme", age: 45, heightCm: 183,
      lifestyle: "Commercial, déplacements et repas d'affaires", activityLevel: "Sédentaire",
      sportLevel: "Débutant", bodyType: "Endomorphe", dietPreferences: "Sans restriction",
      startWeightKg: 99, targetWeightKg: 88, weeklyRateKg: -0.5,
      objectiveDeadline: addDays(thisMonday, 7 * 22),
    },
    // La rechute se lit dans la courbe : reprise de +1,7 kg semaines 6-7
    // (congés + zéro séance), puis retour progressif sur la bonne pente.
    weight: [98, 97.2, 96.4, 95.7, 95, 94.4, 96.1, 97, 96.2, 95.3, 94.4, 93.4],
    energy: [5, 5, 6, 6, 6, 5, 3, 4, 5, 6, 6, 7],
    attended: [3, 3, 3, 2, 3, 3, 0, 1, 2, 3, 3, 3],
    exercises: [
      { name: "Soulevé de terre", charges: [90, 95, 97.5, 100, 102.5, 105, 105, 105, 107.5, 110, 112.5, 115] },
      { name: "Squat", charges: [70, 72.5, 75, 75, 77.5, 80, 80, 80, 80, 82.5, 85, 87.5] },
    ],
    cardio: {
      distanceKm: [3, 3.2, 3.5, 3.6, 3.8, 4, 2, 2.5, 3.5, 4, 4.2, 4.5],
      paceMinPerKm: [7.5, 7.4, 7.3, 7.2, 7.1, 7, 7.6, 7.4, 7.2, 7, 6.9, 6.8],
      avgHeartRate: [168, 166, 165, 164, 163, 162, 170, 167, 164, 162, 160, 159],
    },
    coachComments: {
      7: "Semaine de reprise après les congés : on repart sans culpabiliser, l'important est de revenir.",
      11: "Le poids d'avant les congés est effacé, la dynamique est relancée. Beau rebond.",
    },
    feedbacks: [
      { weeksAgo: 5, content: "J'ai complètement décroché pendant les vacances, je n'ose même pas monter sur la balance…", reply: "Thomas, une rechute n'efface pas 6 semaines de travail. On reprend en douceur cette semaine : 1 seule séance, puis on remonte. Le plus dur, c'est de revenir — et tu es revenu." },
      { weeksAgo: 0, content: "Retour au poids d'avant les vacances, je repars sur de bonnes bases. Merci de ne pas m'avoir lâché." },
    ],
  },
  {
    // Camille — full body, la « régularité exemplaire » : 12 semaines sans
    // manquer une séance, recomposition corporelle (poids quasi stable
    // mais force en hausse constante).
    user: { username: "camille.rousseau", email: "camille.rousseau@demo.local", firstName: "Camille", lastName: "Rousseau", phone: "0656789015" },
    goalKey: "full_body",
    prospect: {
      source: "MANUAL",
      note: "Ajoutée à la main après une rencontre au salon du sport. Cherche une remise en forme globale, pas de perte de poids.",
      events: [
        { type: "MEETING", content: "Rencontre au salon du sport : discussion sur la remise en forme globale (démo).", weeksBeforeJoin: 3 },
        { type: "CALL", content: "Appel de suivi : programme full body 3x/semaine validé dans les grandes lignes.", weeksBeforeJoin: 1 },
        { type: "DECISION", content: "Inscription confirmée — conversion en cliente.", weeksBeforeJoin: 0 },
      ],
    },
    profile: {
      gender: "Femme", age: 29, heightCm: 171,
      lifestyle: "Architecte, travaille debout et marche beaucoup", activityLevel: "Modérément actif",
      sportLevel: "Intermédiaire", bodyType: "Mésomorphe", dietPreferences: "Flexitarienne",
      startWeightKg: 58, targetWeightKg: 58, weeklyRateKg: 0,
      objectiveDeadline: addDays(thisMonday, 7 * 26),
    },
    weight: [58, 57.9, 57.8, 57.8, 57.7, 57.6, 57.6, 57.5, 57.4, 57.3, 57.2, 57.1],
    energy: [6, 7, 7, 7, 7, 8, 8, 8, 8, 8, 9, 9],
    attended: [3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3],
    exercises: [
      { name: "Développé couché", charges: [30, 32.5, 32.5, 35, 35, 37.5, 37.5, 40, 40, 42.5, 42.5, 45] },
      { name: "Rowing haltère", charges: [12, 14, 14, 16, 16, 18, 18, 20, 22, 22, 24, 24] },
    ],
    cardio: {
      distanceKm: [4, 4.2, 4.4, 4.5, 4.6, 4.8, 5, 5, 5.2, 5.4, 5.5, 5.6],
      paceMinPerKm: [6.8, 6.7, 6.7, 6.6, 6.5, 6.5, 6.4, 6.4, 6.3, 6.2, 6.2, 6.1],
      avgHeartRate: [155, 154, 153, 152, 152, 151, 150, 150, 149, 148, 148, 147],
    },
    coachComments: {
      5: "Mi-parcours : poids stable et +5 kg au développé, c'est exactement la recomposition visée.",
      11: "12 semaines, 36 séances sur 36. Régularité exemplaire — le meilleur taux de présence du club.",
    },
    feedbacks: [
      { weeksAgo: 1, content: "Toujours autant de plaisir aux séances. Je sens mes vêtements mieux tomber alors que le poids ne bouge pas, c'est normal ?", reply: "Complètement normal Camille : tu perds du gras et gagnes du muscle, la balance ne voit pas la différence mais le miroir oui. C'est la recomposition parfaite. 👏" },
    ],
  },
  {
    // Antoine — endurance musculaire, le « départ timide » : commence à
    // 1 séance/semaine, prend confiance, puis accélère nettement.
    user: { username: "antoine.girard", email: "antoine.girard@demo.local", firstName: "Antoine", lastName: "Girard", phone: "0667890126" },
    goalKey: "endurance_musculaire",
    prospect: {
      source: "FORM",
      note: "Formulaire du site. N'a jamais fait de sport en salle, appréhende le regard des autres.",
      events: [
        { type: "SYSTEM", content: "Prospect créé via le formulaire public (démo).", weeksBeforeJoin: 3 },
        { type: "CALL", content: "Appel découverte : rassuré par le format petit groupe, on démarre en douceur.", weeksBeforeJoin: 2 },
        { type: "DECISION", content: "Inscription confirmée — conversion en client.", weeksBeforeJoin: 0 },
      ],
    },
    profile: {
      gender: "Homme", age: 34, heightCm: 175,
      lifestyle: "Développeur, télétravail complet", activityLevel: "Sédentaire",
      sportLevel: "Débutant", bodyType: "Ectomorphe", dietPreferences: "Végétarien",
      startWeightKg: 77, targetWeightKg: 74, weeklyRateKg: -0.25,
      objectiveDeadline: addDays(thisMonday, 7 * 24),
    },
    weight: [77, 77, 76.8, 76.7, 76.5, 76.2, 75.9, 75.6, 75.2, 74.9, 74.6, 74.3],
    energy: [3, 4, 4, 5, 5, 6, 6, 7, 7, 7, 8, 8],
    // Le départ timide se lit ici : 1 puis 2 séances/semaine le premier
    // mois, avant de trouver son rythme à 3 séances à partir de la semaine 4.
    attended: [1, 2, 2, 2, 3, 3, 3, 3, 3, 3, 3, 3],
    exercises: [
      { name: "Squat", charges: [50, 50, 50, 52.5, 52.5, 55, 57.5, 60, 62.5, 65, 67.5, 70] },
      { name: "Développé couché", charges: [35, 35, 35, 35, 37.5, 37.5, 40, 42.5, 45, 45, 47.5, 50] },
    ],
    cardio: {
      distanceKm: [2, 2.2, 2.5, 2.8, 3, 3.2, 3.5, 3.8, 4, 4.2, 4.5, 4.8],
      paceMinPerKm: [8, 7.9, 7.8, 7.6, 7.5, 7.3, 7.2, 7, 6.9, 6.8, 6.6, 6.5],
      avgHeartRate: [170, 169, 167, 166, 164, 163, 161, 160, 158, 157, 155, 154],
    },
    coachComments: {
      2: "Démarrage en douceur assumé : 2 séances valent mieux que 0. On monte à 3 quand tu te sens prêt.",
      8: "Quel chemin parcouru depuis la semaine 1 ! 3 séances/semaine sans faillir et la force décolle.",
    },
    feedbacks: [
      { weeksAgo: 0, content: "Je n'aurais jamais cru dire ça il y a 3 mois, mais les séances me manquent quand je les rate. Merci pour la patience du début !" },
    ],
  },
  {
    // Nadia — cardio, la « préparation 10 km » : coureuse régulière qui
    // monte le volume semaine après semaine jusqu'à boucler son premier 10 km.
    user: { username: "nadia.fontaine", email: "nadia.fontaine@demo.local", firstName: "Nadia", lastName: "Fontaine", phone: "0678901237" },
    goalKey: "cardio",
    prospect: {
      source: "SOCIAL_MEDIA",
      note: "Story Instagram sur la préparation course. Objectif : finir son premier 10 km officiel à l'automne.",
      events: [
        { type: "MESSAGE", content: "DM Instagram : demande un plan pour préparer un 10 km (démo).", weeksBeforeJoin: 2 },
        { type: "CALL", content: "Appel découverte : déjà 2 footings/semaine, il faut structurer et renforcer.", weeksBeforeJoin: 1 },
        { type: "DECISION", content: "Inscription confirmée — conversion en cliente.", weeksBeforeJoin: 0 },
      ],
    },
    profile: {
      gender: "Femme", age: 31, heightCm: 167,
      lifestyle: "Cheffe de projet, court le matin avant le travail", activityLevel: "Très actif",
      sportLevel: "Intermédiaire", bodyType: "Ectomorphe", dietPreferences: "Sans lactose",
      startWeightKg: 59, targetWeightKg: 58, weeklyRateKg: 0,
      objectiveDeadline: addDays(thisMonday, 7 * 14),
    },
    weight: [59, 59, 58.9, 58.9, 58.8, 58.8, 58.7, 58.7, 58.6, 58.6, 58.5, 58.5],
    energy: [7, 7, 7, 8, 7, 8, 8, 8, 9, 8, 9, 9],
    attended: [3, 3, 3, 3, 3, 2, 3, 3, 3, 3, 2, 3],
    exercises: [
      { name: "Rowing haltère", charges: [10, 12, 12, 14, 14, 14, 16, 16, 18, 18, 20, 20] },
      { name: "Soulevé de terre", charges: [50, 52.5, 55, 55, 57.5, 60, 60, 62.5, 65, 65, 67.5, 70] },
    ],
    cardio: {
      // Montée en volume linéaire : de 5 km à 10,5 km en 12 semaines,
      // avec une allure qui s'améliore malgré la distance qui augmente.
      distanceKm: [5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10, 10.5],
      paceMinPerKm: [6.2, 6.1, 6, 5.9, 5.9, 5.8, 5.7, 5.6, 5.6, 5.5, 5.4, 5.3],
      avgHeartRate: [152, 151, 150, 149, 149, 148, 147, 146, 146, 145, 144, 143],
    },
    coachComments: {
      6: "8 km à 5,7 min/km avec une FC qui baisse : la base aérobie se construit exactement comme prévu.",
      10: "Premier 10 km bouclé à l'entraînement ! Objectif course officielle largement à portée.",
    },
    feedbacks: [
      { weeksAgo: 1, content: "10 km bouclés samedi matin, sans marcher ! Je n'y croyais pas en démarrant.", reply: "Énorme Nadia ! 🎉 Le jour J tu auras l'adrénaline en plus, ça va très bien se passer. Semaine allégée maintenant : on garde du jus." },
      { weeksAgo: 0, content: "Un peu de courbatures aux mollets après le 10 km, je lève le pied comme convenu cette semaine." },
    ],
  },
];

// ---------------------------------------------------------------------------
// Assignation automatique à un groupe — décalque de autoAssignGroup()
// (src/modules/clients/group.service.js) : on cherche d'abord un groupe actif
// du même objectif avec une place libre ; sinon on crée « Objectif — Groupe N »
// en reprenant le coach (et la capacité) du dernier groupe de cet objectif,
// avec le coach de démo (coach.demo) en dernier recours.
// ---------------------------------------------------------------------------
async function assignGroup(goal, fallbackCoachId) {
  const groups = await prisma.group.findMany({
    where: { goalId: goal.id, isActive: true },
    include: { _count: { select: { clients: true } } },
    orderBy: { createdAt: "asc" },
  });

  // Premier groupe (le plus ancien) qui a encore de la place.
  const free = groups.find((g) => g._count.clients < g.capacity);
  if (free) return free;

  // Aucun groupe libre : on en crée un nouveau, numéroté à la suite.
  const last = groups[groups.length - 1];
  return prisma.group.create({
    data: {
      name: `${goal.label} — Groupe ${groups.length + 1}`,
      goalId: goal.id,
      capacity: last?.capacity ?? 7,
      coachId: last?.coachId ?? fallbackCoachId ?? null,
    },
  });
}

// ---------------------------------------------------------------------------
// Création d'un client complet : prospect + user + client, puis les
// 12 semaines de suivi (mesures, force avec PR, cardio, présence, feedback).
// Structure identique à la boucle de seedDemo() dans seed.js.
// ---------------------------------------------------------------------------
async function createClient(d, ctx) {
  const { won, admin, goalByKey, exerciseByName, passwordHash, fallbackCoachId } = ctx;

  // Objectif du client : si le goal du seed manque en base, on ignore ce
  // client avec un message clair plutôt que de faire planter tout le script.
  const goal = goalByKey[d.goalKey];
  if (!goal) {
    console.warn(`⚠️  ${d.user.username} : objectif « ${d.goalKey} » introuvable en base — client ignoré (lancez npm run db:seed).`);
    return null;
  }

  // Groupe d'accueil (même logique que l'inscription réelle dans l'app).
  const group = await assignGroup(goal, fallbackCoachId);

  // Prospect d'origine : l'historique CRM (source, notes, événements de
  // contact) est conservé après conversion, comme pour un vrai inscrit.
  const prospect = await prisma.prospect.create({
    data: {
      firstName: d.user.firstName,
      lastName: d.user.lastName,
      email: d.user.email,
      phone: d.user.phone,
      source: d.prospect.source,
      statusId: won.id, // statut « gagné » : le prospect a été converti
      goalId: goal.id,
      generalNote: d.prospect.note,
      firstContactAt: addDays(thisMonday, -7 * (WEEKS + 3)),
      lastContactAt: addDays(thisMonday, -7 * WEEKS),
      assignedToId: admin.id,
      contactEvents: {
        // Historique horodaté : les événements sont datés en remontant
        // avant la date d'inscription (weeksBeforeJoin semaines plus tôt).
        create: d.prospect.events.map((e) => ({
          type: e.type,
          content: e.content,
          occurredAt: addDays(thisMonday, -7 * (WEEKS + e.weeksBeforeJoin)),
        })),
      },
    },
  });

  // Compte utilisateur (espace client) + fiche client avec profil complet.
  const user = await prisma.user.create({
    data: { ...d.user, passwordHash, role: "CLIENT" },
  });
  const client = await prisma.client.create({
    data: {
      userId: user.id,
      prospectId: prospect.id,
      joinedAt: addDays(thisMonday, -7 * WEEKS),
      groupId: group.id,
      ...d.profile,
      goals: { create: [{ goalId: goal.id }] },
    },
  });

  // --- 12 semaines de suivi ------------------------------------------------
  // Les maxima par exercice servent à poser le drapeau isPR exactement
  // comme dans seed.js : PR = charge strictement supérieure à tout ce qui
  // a été soulevé avant sur cet exercice.
  const maxByExercise = {};

  for (let i = 0; i < WEEKS; i++) {
    // Lundi de la semaine i (indice 0 = la plus ancienne).
    const weekStart = addDays(thisMonday, -7 * (WEEKS - 1 - i));

    // Mesure hebdomadaire (+ bilan du coach sur les semaines clés).
    await prisma.weeklyMetric.create({
      data: {
        clientId: client.id,
        weekStart,
        weightKg: d.weight[i],
        energyLevel: d.energy[i],
        sessionsAttended: d.attended[i],
        sessionsPlanned: 3,
        coachComment: d.coachComments[i] || null,
      },
    });

    // Force et cardio : uniquement les semaines où le client est venu au
    // moins une fois — pas de performance enregistrée une semaine à zéro
    // séance (cohérence avec la présence, cf. la rechute de Thomas).
    if (d.attended[i] > 0) {
      // Force : 1er exercice le mardi, 2e le jeudi, avec PR automatique.
      const exerciseDays = [1, 3];
      for (let e = 0; e < d.exercises.length; e++) {
        const def = d.exercises[e];
        const exercise = exerciseByName[def.name];
        const chargeKg = def.charges[i];
        await prisma.strengthLog.create({
          data: {
            clientId: client.id,
            exerciseId: exercise.id,
            date: addDays(weekStart, exerciseDays[e]),
            weightKg: chargeKg,
            reps: 8,
            isPR: chargeKg > (maxByExercise[def.name] || 0),
          },
        });
        maxByExercise[def.name] = Math.max(maxByExercise[def.name] || 0, chargeKg);
      }

      // Cardio hebdomadaire (mercredi).
      await prisma.cardioLog.create({
        data: {
          clientId: client.id,
          date: addDays(weekStart, 2),
          distanceKm: d.cardio.distanceKm[i],
          paceMinPerKm: d.cardio.paceMinPerKm[i],
          avgHeartRate: d.cardio.avgHeartRate[i],
        },
      });
    }

    // Présence : 3 séances planifiées (mardi/mercredi/jeudi), le nombre de
    // présences correspond exactement au `attended` du suivi hebdo.
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

  // Feedbacks du client vers son coach (avec réponse quand elle existe).
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

  return { username: d.user.username, fullName: `${d.user.firstName} ${d.user.lastName}`, goalLabel: goal.label, groupName: group.name };
}

// ---------------------------------------------------------------------------
// Point d'entrée : garde-fous, puis création client par client (idempotent).
// ---------------------------------------------------------------------------
async function main() {
  // --- Garde-fous : le seed de base doit avoir été exécuté avant ----------
  // On vérifie tout ce dont ce script dépend : le compte admin (propriétaire
  // des prospects), le statut pipeline « gagné » (conversion), au moins un
  // objectif, et les 4 exercices de force utilisés par les courbes.
  const admin = await prisma.user.findFirst({ where: { role: "ADMIN" } });
  const won = await prisma.pipelineStatus.findFirst({ where: { isWon: true } });
  const goals = await prisma.goal.findMany();
  const exerciseNames = [...new Set(CLIENTS.flatMap((c) => c.exercises.map((e) => e.name)))];
  const exercises = await prisma.exercise.findMany({ where: { name: { in: exerciseNames } } });

  if (!admin || !won || goals.length === 0 || exercises.length < exerciseNames.length) {
    console.error("❌ La base n'est pas initialisée (admin, statut « gagné », objectifs ou exercices manquants).");
    console.error("   Lancez d'abord : npm run db:seed");
    return; // sortie propre, sans code d'erreur bloquant pour un simple oubli
  }

  // Index par clé / par nom pour éviter de requêter dans les boucles.
  const goalByKey = Object.fromEntries(goals.map((g) => [g.key, g]));
  const exerciseByName = Object.fromEntries(exercises.map((e) => [e.name, e]));

  // Coach de repli pour les nouveaux groupes : le coach de démo du seed
  // (coach.demo). S'il n'existe pas, le groupe sera créé sans coach —
  // l'admin pourra l'attribuer depuis l'interface.
  const coachDemo = await prisma.user.findUnique({ where: { username: "coach.demo" } });

  // Mot de passe commun à tous les clients de démo (identique au seed),
  // hashé une seule fois puisqu'il est partagé.
  const passwordHash = await bcrypt.hash("Client1234!", 12);

  const ctx = { won, admin, goalByKey, exerciseByName, passwordHash, fallbackCoachId: coachDemo?.id ?? null };

  // --- Création client par client (idempotent) -----------------------------
  const created = [];
  for (const d of CLIENTS) {
    // Idempotence : si le compte existe déjà (script relancé), on passe au
    // suivant sans rien créer — aucun doublon possible.
    const exists = await prisma.user.findUnique({ where: { username: d.user.username } });
    if (exists) {
      console.log(`↷ ${d.user.username} : déjà présent, ignoré.`);
      continue;
    }

    const result = await createClient(d, ctx);
    if (result) {
      created.push(result);
      console.log(`✓ ${result.fullName} (${result.username}) — ${result.goalLabel} → ${result.groupName}`);
    }
  }

  // --- Récapitulatif final -------------------------------------------------
  console.log("");
  if (created.length === 0) {
    console.log("Aucun nouveau client créé (tous déjà présents ou ignorés).");
  } else {
    console.log(`✅ ${created.length} client(s) de démonstration créé(s) avec 12 semaines de suivi chacun.`);
    console.log("   Identifiants (mot de passe commun : Client1234!) :");
    for (const c of created) {
      console.log(`   - ${c.username} · ${c.goalLabel} · groupe « ${c.groupName} »`);
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
