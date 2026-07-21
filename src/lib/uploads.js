/**
 * Stockage des fichiers envoyés par le coach (photos de progression…).
 *
 * Les fichiers sont écrits dans le dossier `uploads/` à la racine du projet
 * (hors de `public/` : en production, Next ne sert que les fichiers présents
 * dans `public` AU MOMENT du build — un dossier séparé servi par une route
 * API reste fiable quel que soit l'hébergement). La route
 * `/api/uploads/[...path]` les sert avec le bon type MIME.
 */
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { ApiError } from "@/lib/api";

// Racine unique de stockage — tout chemin servi est vérifié comme étant
// à l'intérieur de ce dossier (aucune traversée « ../ » possible).
const UPLOADS_ROOT = path.join(process.cwd(), "uploads");

// Types d'images acceptés pour les photos de progression.
const IMAGE_EXTENSIONS = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/heic": ".heic",
};

export const MIME_BY_EXTENSION = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".heic": "image/heic",
};

/**
 * Enregistre une image envoyée via formulaire (objet File du Web API).
 * Retourne le chemin relatif à stocker en base (ex. "photos/abc/xyz.jpg").
 */
export async function saveImage(file, subdir) {
  if (!file || typeof file.arrayBuffer !== "function") throw new ApiError("Aucun fichier reçu.");
  const ext = IMAGE_EXTENSIONS[file.type];
  if (!ext) throw new ApiError("Format d'image non pris en charge (JPG, PNG, WebP ou HEIC).");
  // Taille plafonnée à 10 Mo : suffisant pour une photo de téléphone.
  if (file.size > 10 * 1024 * 1024) throw new ApiError("Image trop lourde (10 Mo maximum).");

  // Nom aléatoire : pas de collision, pas d'information personnelle dans l'URL.
  const name = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}${ext}`;
  const dir = path.join(UPLOADS_ROOT, subdir);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, name), Buffer.from(await file.arrayBuffer()));
  return path.posix.join(subdir, name);
}

/** Supprime un fichier uploadé (silencieux s'il a déjà disparu). */
export async function deleteUpload(relativePath) {
  try {
    await fs.unlink(resolveUpload(relativePath));
  } catch {
    // Fichier déjà absent : rien à faire.
  }
}

/**
 * Résout un chemin relatif vers le chemin absolu dans `uploads/`, en
 * refusant toute sortie du dossier (sécurité).
 */
export function resolveUpload(relativePath) {
  const absolute = path.resolve(UPLOADS_ROOT, relativePath);
  if (!absolute.startsWith(UPLOADS_ROOT + path.sep)) throw new ApiError("Chemin invalide.", 400);
  return absolute;
}

/** Lit un fichier uploadé ; retourne { buffer, contentType } ou null s'il n'existe pas. */
export async function readUpload(relativePath) {
  const filePath = resolveUpload(relativePath);
  try {
    const buffer = await fs.readFile(filePath);
    const contentType = MIME_BY_EXTENSION[path.extname(filePath).toLowerCase()] || "application/octet-stream";
    return { buffer, contentType };
  } catch {
    return null;
  }
}
