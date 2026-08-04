import { handle, ok, requireAuth } from "@/lib/api";
import { getActiveProgramForGroup } from "@/modules/programs/program.service";

/** Programme actif du groupe (construit par le coach), pour l'éditeur. */
export const GET = handle(async (req, { params }) => {
  const { error } = await requireAuth({ roles: ["ADMIN", "COACH"] });
  if (error) return error;
  return ok(await getActiveProgramForGroup(params.id));
});
