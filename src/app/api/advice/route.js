/**
 * Conseil de la semaine — rédigé par un coach ou l'admin,
 * pour un groupe entier ou un client précis.
 */
import { handle, ok, requireAuth } from "@/lib/api";
import { upsertAdvice, listAdviceForGroup } from "@/modules/clients/advice.service";

export const GET = handle(async (req) => {
  const { error } = await requireAuth({ roles: ["ADMIN", "COACH"] });
  if (error) return error;
  const { searchParams } = new URL(req.url);
  const groupId = searchParams.get("groupId");
  return ok(groupId ? await listAdviceForGroup(groupId) : []);
});

export const POST = handle(async (req) => {
  const { error, session } = await requireAuth({ roles: ["ADMIN", "COACH"] });
  if (error) return error;
  const body = await req.json();
  return ok(await upsertAdvice({ ...body, authorId: session.userId }), { status: 201 });
});
