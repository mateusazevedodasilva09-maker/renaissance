import { handle, ok, requireAuth } from "@/lib/api";
import { addMeasurement } from "@/modules/tracking/body.service";

/** Enregistre une prise de mensurations pour ce client. */
export const POST = handle(async (req, { params }) => {
  const { error } = await requireAuth({ permission: "clients.manage" });
  if (error) return error;
  return ok(await addMeasurement(params.id, await req.json()), { status: 201 });
});
