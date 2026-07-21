/**
 * Domaine SUIVI CORPOREL — mensurations et photos de progression.
 *
 * Tout est saisi par le coach sur place (studio / présentiel) : le client
 * n'a rien à faire sur son téléphone. Les photos alimentent les comparatifs
 * avant / après ; les mensurations montrent les progrès que la balance ne
 * révèle pas (tour de taille qui baisse à poids constant, etc.).
 */
import prisma from "@/lib/prisma";
import { ApiError } from "@/lib/api";
import { saveImage, deleteUpload } from "@/lib/uploads";

// Champs numériques d'une mensuration (tous optionnels : le coach ne mesure
// que ce qui est utile pour ce client).
const MEASUREMENT_FIELDS = [
  "weightKg", "bodyFatPct", "neckCm", "shouldersCm", "chestCm",
  "waistCm", "hipsCm", "armCm", "thighCm", "calfCm",
];

// ===========================================================================
// MENSURATIONS
// ===========================================================================

/** Enregistre une prise de mensurations pour un client. */
export async function addMeasurement(clientId, data) {
  const client = await prisma.client.findUnique({ where: { id: clientId } });
  if (!client) throw new ApiError("Client introuvable.", 404);

  const values = {};
  for (const k of MEASUREMENT_FIELDS) {
    if (data[k] !== undefined && data[k] !== "" && data[k] !== null) values[k] = Number(data[k]);
  }
  if (Object.keys(values).length === 0) throw new ApiError("Renseignez au moins une mesure.");

  return prisma.bodyMeasurement.create({
    data: {
      clientId,
      date: data.date ? new Date(data.date) : new Date(),
      notes: data.notes || null,
      ...values,
    },
  });
}

/**
 * Mensurations saisies par le CLIENT lui-même depuis son espace (étape
 * d'onboarding). Enregistre la prise puis marque l'étape « mensurations à
 * remplir » comme faite : la fiche coach n'affiche plus l'étape en attente.
 */
export async function addMeasurementByClient(clientId, data) {
  const created = await addMeasurement(clientId, data);
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: {
      onboardingMeasurementsDone: true,
      prospectId: true,
      user: { select: { firstName: true, lastName: true } },
      group: { select: { coachId: true } },
    },
  });

  // Première complétion seulement : on marque l'étape faite ET on notifie le
  // staff — une tâche apparaît dans l'agenda et le prospect reçoit un événement.
  if (client && !client.onboardingMeasurementsDone) {
    const name = `${client.user.firstName} ${client.user.lastName}`;
    await prisma.client.update({ where: { id: clientId }, data: { onboardingMeasurementsDone: true } });
    await prisma.task.create({
      data: {
        title: `Valider l'inscription — ${name}`,
        description: "Le client a rempli ses métriques. Vérifiez sa fiche, puis donnez-lui accès à son dashboard (bouton « Inscrire »).",
        category: "Inscriptions",
        priority: "HIGH",
        dueAt: new Date(),
        assigneeId: client.group?.coachId || null, // au coach du groupe, sinon visible par l'admin
      },
    });
    if (client.prospectId) {
      await prisma.contactEvent.create({
        data: { prospectId: client.prospectId, type: "SYSTEM", content: "Le client a rempli ses métriques d'onboarding." },
      });
    }
  }
  return created;
}

/** Historique des mensurations d'un client (pour son espace). */
export function listMeasurements(clientId) {
  return prisma.bodyMeasurement.findMany({ where: { clientId }, orderBy: { date: "asc" } });
}

/** Supprime une prise de mensurations. */
export async function deleteMeasurement(id) {
  const measurement = await prisma.bodyMeasurement.findUnique({ where: { id } });
  if (!measurement) throw new ApiError("Mensuration introuvable.", 404);
  return prisma.bodyMeasurement.delete({ where: { id } });
}

// ===========================================================================
// PHOTOS DE PROGRESSION
// ===========================================================================

/**
 * Enregistre une photo de progression : le fichier est stocké dans
 * `uploads/photos/<clientId>/` et servi par la route /api/uploads.
 */
export async function addPhoto(clientId, { file, pose, date, notes }) {
  const client = await prisma.client.findUnique({ where: { id: clientId } });
  if (!client) throw new ApiError("Client introuvable.", 404);
  if (!["FRONT", "SIDE", "BACK"].includes(pose)) pose = "FRONT";

  const relativePath = await saveImage(file, `photos/${clientId}`);
  return prisma.progressPhoto.create({
    data: {
      clientId,
      pose,
      url: `/api/uploads/${relativePath}`,
      date: date ? new Date(date) : new Date(),
      notes: notes || null,
    },
  });
}

/** Supprime une photo (l'entrée en base ET le fichier sur le disque). */
export async function deletePhoto(id) {
  const photo = await prisma.progressPhoto.findUnique({ where: { id } });
  if (!photo) throw new ApiError("Photo introuvable.", 404);
  // Le chemin en base est "/api/uploads/<relatif>" : on retire le préfixe.
  await deleteUpload(photo.url.replace(/^\/api\/uploads\//, ""));
  return prisma.progressPhoto.delete({ where: { id } });
}
