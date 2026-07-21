import { handle, ok, requireAuth } from "@/lib/api";
import { deletePhoto } from "@/modules/tracking/body.service";

/** Supprime une photo de progression (fichier inclus). */
export const DELETE = handle(async (req, { params }) => {
  const { error } = await requireAuth({ permission: "clients.manage" });
  if (error) return error;
  return ok(await deletePhoto(params.id));
});
