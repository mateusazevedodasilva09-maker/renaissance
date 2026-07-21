/**
 * Domaine AUTH — gestion des comptes utilisateurs (réservée à l'admin) :
 * liste, rôle, activation / désactivation, réinitialisation de mot de passe.
 */
import prisma from "@/lib/prisma";
import { ApiError } from "@/lib/api";
import { hashPassword } from "./auth.service";

const select = {
  id: true,
  username: true,
  email: true,
  role: true,
  firstName: true,
  lastName: true,
  phone: true,
  isActive: true,
  createdAt: true,
  client: { select: { id: true } },
  groupsCoached: { select: { id: true, name: true } },
};

export function listUsers({ role } = {}) {
  return prisma.user.findMany({
    where: role ? { role } : {},
    select,
    orderBy: [{ role: "asc" }, { createdAt: "desc" }],
  });
}

/** Liste courte (menus d'assignation : admins + coachs). */
export function listStaff() {
  return prisma.user.findMany({
    where: { role: { in: ["ADMIN", "COACH"] }, isActive: true },
    select: { id: true, firstName: true, lastName: true, username: true, role: true },
    orderBy: { firstName: "asc" },
  });
}

export async function updateUser(id, { role, isActive, password, firstName, lastName, phone }, { actorId } = {}) {
  if (id === actorId && isActive === false) {
    throw new ApiError("Vous ne pouvez pas désactiver votre propre compte.");
  }
  const data = {
    ...(role !== undefined && { role }),
    ...(isActive !== undefined && { isActive }),
    ...(firstName !== undefined && { firstName }),
    ...(lastName !== undefined && { lastName }),
    ...(phone !== undefined && { phone }),
  };
  if (password) data.passwordHash = await hashPassword(password);
  return prisma.user.update({ where: { id }, data, select });
}
