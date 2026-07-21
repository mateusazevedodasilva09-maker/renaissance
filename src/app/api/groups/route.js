import { handle, ok, requireAuth } from "@/lib/api";
import { listGroups, createGroup, listGroupsForCoach } from "@/modules/clients/group.service";

export const GET = handle(async () => {
  const { error, session } = await requireAuth({ roles: ["ADMIN", "COACH"] });
  if (error) return error;
  // L'admin voit tous les groupes ; le coach uniquement les siens.
  if (session.role === "COACH") return ok(await listGroupsForCoach(session.userId));
  return ok(await listGroups());
});

export const POST = handle(async (req) => {
  const { error } = await requireAuth({ permission: "groups.manage" });
  if (error) return error;
  return ok(await createGroup(await req.json()), { status: 201 });
});
