/**
 * Client Prisma unique (singleton).
 * En développement, Next.js recharge les modules à chaud : on mémorise
 * l'instance sur `globalThis` pour éviter d'épuiser les connexions.
 */
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis;

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export default prisma;
