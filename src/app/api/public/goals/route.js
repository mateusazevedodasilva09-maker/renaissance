/**
 * Route PUBLIQUE — liste des objectifs pour le menu déroulant
 * du formulaire de prise de rendez-vous.
 */
import { handle, ok } from "@/lib/api";
import prisma from "@/lib/prisma";

export const GET = handle(async () => {
  const goals = await prisma.goal.findMany({
    orderBy: { label: "asc" },
    select: { id: true, label: true },
  });
  return ok(goals);
});
