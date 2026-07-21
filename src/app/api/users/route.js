import { handle, ok, requireAuth } from "@/lib/api";
import { listUsers, listStaff } from "@/modules/auth/user.service";

export const GET = handle(async (req) => {
  const { searchParams } = new URL(req.url);

  // Liste courte pour les menus d'assignation (admins + coachs actifs).
  if (searchParams.get("staff") === "1") {
    const { error } = await requireAuth({ roles: ["ADMIN", "COACH"] });
    if (error) return error;
    return ok(await listStaff());
  }

  const { error } = await requireAuth({ permission: "users.manage" });
  if (error) return error;
  return ok(await listUsers({ role: searchParams.get("role") || undefined }));
});
