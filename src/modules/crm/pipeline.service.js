/**
 * Domaine CRM — statuts de pipeline configurables.
 * Les statuts vivent en base : l'admin peut en ajouter, renommer,
 * recolorer ou réordonner sans migration ni redéploiement.
 */
import prisma from "@/lib/prisma";
import { ApiError } from "@/lib/api";

export function listStatuses() {
  return prisma.pipelineStatus.findMany({ orderBy: { position: "asc" } });
}

export async function createStatus({ label, color, isWon = false, isLost = false }) {
  if (!label?.trim()) throw new ApiError("Le libellé est requis.");
  const key = label
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
  const exists = await prisma.pipelineStatus.findUnique({ where: { key } });
  if (exists) throw new ApiError("Un statut avec ce nom existe déjà.");
  const max = await prisma.pipelineStatus.aggregate({ _max: { position: true } });
  return prisma.pipelineStatus.create({
    data: { key, label: label.trim(), color: color || "#6b7280", isWon, isLost, position: (max._max.position ?? 0) + 1 },
  });
}

export async function updateStatus(id, { label, color, position, isWon, isLost }) {
  return prisma.pipelineStatus.update({
    where: { id },
    data: {
      ...(label !== undefined && { label }),
      ...(color !== undefined && { color }),
      ...(position !== undefined && { position }),
      ...(isWon !== undefined && { isWon }),
      ...(isLost !== undefined && { isLost }),
    },
  });
}

export async function deleteStatus(id) {
  const count = await prisma.prospect.count({ where: { statusId: id } });
  if (count > 0) {
    throw new ApiError(`Impossible de supprimer : ${count} prospect(s) utilisent ce statut.`);
  }
  return prisma.pipelineStatus.delete({ where: { id } });
}

/** Statut de conversion (Payé / Inscrit). */
export async function getWonStatus() {
  const status = await prisma.pipelineStatus.findFirst({ where: { isWon: true } });
  if (!status) throw new ApiError("Aucun statut de conversion (isWon) configuré.", 500);
  return status;
}

/** Statut par sa clé technique (ex. "remplissage_metriques"). Null si absent. */
export function getStatusByKey(key) {
  return prisma.pipelineStatus.findUnique({ where: { key } });
}

/**
 * Garantit l'existence des statuts propres au tunnel d'auto-inscription depuis
 * l'app. Idempotent : crée « prospect appli » et « remplissage métriques » s'ils
 * n'existent pas encore, sans migration ni doublon. Retourne le statut d'entrée
 * (« prospect appli »).
 */
export async function ensureAppStage() {
  const stages = [
    { key: "prospect_appli", label: "Prospect appli", color: "#6366f1" },
    { key: "remplissage_metriques", label: "Remplissage métriques", color: "#0ea5e9" },
  ];
  let entry = null;
  for (const s of stages) {
    let status = await prisma.pipelineStatus.findUnique({ where: { key: s.key } });
    if (!status) {
      const max = await prisma.pipelineStatus.aggregate({ _max: { position: true } });
      status = await prisma.pipelineStatus.create({
        data: { key: s.key, label: s.label, color: s.color, position: (max._max.position ?? 0) + 1 },
      });
    }
    if (s.key === "prospect_appli") entry = status;
  }
  return entry;
}

/** Statut par défaut d'un nouveau prospect (première colonne non terminale). */
export async function getDefaultStatus() {
  const status = await prisma.pipelineStatus.findFirst({
    where: { isWon: false, isLost: false },
    orderBy: { position: "asc" },
  });
  if (!status) throw new ApiError("Aucun statut de pipeline configuré.", 500);
  return status;
}
