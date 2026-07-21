import { handle, ok, requireAuth } from "@/lib/api";
import { getProspect, updateProspect } from "@/modules/crm/prospect.service";

export const GET = handle(async (req, { params }) => {
  const { error } = await requireAuth({ roles: ["ADMIN"] });
  if (error) return error;
  return ok(await getProspect(params.id));
});

export const PATCH = handle(async (req, { params }) => {
  const { error, session } = await requireAuth({ roles: ["ADMIN"] });
  if (error) return error;
  const body = await req.json();
  return ok(await updateProspect(params.id, body, { userId: session.userId }));
});
