import { handle, ok, requireAuth } from "@/lib/api";
import { listAppointments } from "@/modules/agenda/appointment.service";

export const GET = handle(async (req) => {
  const { error } = await requireAuth({ roles: ["ADMIN"] });
  if (error) return error;
  const { searchParams } = new URL(req.url);
  return ok(
    await listAppointments({
      status: searchParams.get("status") || undefined,
      from: searchParams.get("from") || undefined,
      to: searchParams.get("to") || undefined,
    })
  );
});
