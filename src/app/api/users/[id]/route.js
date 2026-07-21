import { handle, ok, requireAuth } from "@/lib/api";
import { updateUser } from "@/modules/auth/user.service";

export const PATCH = handle(async (req, { params }) => {
  const { error, session } = await requireAuth({ permission: "users.manage" });
  if (error) return error;
  return ok(await updateUser(params.id, await req.json(), { actorId: session.userId }));
});
