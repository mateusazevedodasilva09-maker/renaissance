import { handle, ok, requireAuth } from "@/lib/api";
import { updateAppointment } from "@/modules/agenda/appointment.service";

export const PATCH = handle(async (req, { params }) => {
  const { error, session } = await requireAuth({ roles: ["ADMIN"] });
  if (error) return error;
  return ok(await updateAppointment(params.id, await req.json(), { userId: session.userId }));
});
