import { handle, ok, requireAuth } from "@/lib/api";
import { convertProspect } from "@/modules/clients/client.service";

export const POST = handle(async (req, { params }) => {
  const { error, session } = await requireAuth({ roles: ["ADMIN"] });
  if (error) return error;
  const { password, goalIds } = await req.json();
  const result = await convertProspect(params.id, { password, goalIds }, { userId: session.userId });
  return ok(result, { status: 201 });
});
