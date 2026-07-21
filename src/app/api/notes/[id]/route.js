import { handle, ok, requireAuth } from "@/lib/api";
import { updateNote, deleteNote } from "@/modules/clients/note.service";

/** Modifie une note privée (contenu, épinglage). */
export const PATCH = handle(async (req, { params }) => {
  const { error } = await requireAuth({ permission: "clients.manage" });
  if (error) return error;
  return ok(await updateNote(params.id, await req.json()));
});

/** Supprime une note privée. */
export const DELETE = handle(async (req, { params }) => {
  const { error } = await requireAuth({ permission: "clients.manage" });
  if (error) return error;
  return ok(await deleteNote(params.id));
});
