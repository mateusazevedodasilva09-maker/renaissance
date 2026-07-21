import { handle, ok, requireAuth } from "@/lib/api";
import { addPhoto } from "@/modules/tracking/body.service";

/**
 * Enregistre une photo de progression (multipart/form-data :
 * `file` + `pose` + `date` + `notes`).
 */
export const POST = handle(async (req, { params }) => {
  const { error } = await requireAuth({ permission: "clients.manage" });
  if (error) return error;
  const form = await req.formData();
  return ok(
    await addPhoto(params.id, {
      file: form.get("file"),
      pose: form.get("pose"),
      date: form.get("date") || null,
      notes: form.get("notes") || null,
    }),
    { status: 201 }
  );
});
