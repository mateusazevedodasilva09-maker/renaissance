/**
 * Domaine AUTH — authentification des utilisateurs.
 * Aucune dépendance à HTTP ni à React : réutilisable et testable isolément.
 */
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { ApiError } from "@/lib/api";

/** Vérifie identifiant + mot de passe. Retourne l'utilisateur ou lève une erreur. */
export async function authenticate(username, password) {
  if (!username || !password) throw new ApiError("Identifiant et mot de passe requis.");
  const user = await prisma.user.findFirst({
    where: {
      OR: [{ username }, { email: username.toLowerCase() }],
      isActive: true,
    },
  });
  if (!user) throw new ApiError("Identifiants incorrects.", 401);
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) throw new ApiError("Identifiants incorrects.", 401);
  return user;
}

export async function hashPassword(password) {
  if (!password || password.length < 8) {
    throw new ApiError("Le mot de passe doit contenir au moins 8 caractères.");
  }
  return bcrypt.hash(password, 12);
}

/**
 * Crée un compte utilisateur (utilisé notamment lors de la conversion
 * prospect → client). Génère un username unique si nécessaire.
 */
export async function createUser({ email, firstName, lastName, phone, role, password, username }) {
  const passwordHash = await hashPassword(password);
  let base = (username || `${firstName}.${lastName}`)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9.]/g, "");
  let candidate = base;
  let i = 1;
  while (await prisma.user.findUnique({ where: { username: candidate } })) {
    candidate = `${base}${i++}`;
  }
  return prisma.user.create({
    data: {
      username: candidate,
      email: email.toLowerCase(),
      passwordHash,
      plainPassword: password, // copie en clair (affichage admin) — voir schema
      role,
      firstName,
      lastName,
      phone,
    },
  });
}
