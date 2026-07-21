import { handle, ok, requireAuth } from "@/lib/api";
import { addNote } from "@/modules/clients/note.service";

/** Ajoute une note privée au carnet de ce client (jamais visible par lui). */
export const POST = handle(async (req, { params }) => {
  const { error, session } = await requireAuth({ permission: "clients.manage" });
  if (error) return error;
  return ok(await addNote(params.id, await req.json(), { userId: session.userId }), { status: 201 });
});
