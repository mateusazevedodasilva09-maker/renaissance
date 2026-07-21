import { handle, ok, requireAuth } from "@/lib/api";
import { deleteMeasurement } from "@/modules/tracking/body.service";

/** Supprime une prise de mensurations. */
export const DELETE = handle(async (req, { params }) => {
  const { error } = await requireAuth({ permission: "clients.manage" });
  if (error) return error;
  return ok(await deleteMeasurement(params.id));
});
