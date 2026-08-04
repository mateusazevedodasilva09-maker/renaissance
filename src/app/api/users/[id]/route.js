import { handle, ok, requireAuth } from "@/lib/api";
import { updateUser, deleteUser } from "@/modules/auth/user.service";

export const PATCH = handle(async (req, { params }) => {
  const { error, session } = await requireAuth({ permission: "users.manage" });
  if (error) return error;
  return ok(await updateUser(params.id, await req.json(), { actorId: session.userId }));
});

// Suppression définitive d'un compte : STRICTEMENT réservée aux ADMIN.
export const DELETE = handle(async (req, { params }) => {
  const { error, session } = await requireAuth({ roles: ["ADMIN"] });
  if (error) return error;
  return ok(await deleteUser(params.id, { actorId: session.userId }));
});
