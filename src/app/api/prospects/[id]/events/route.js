import { handle, ok, requireAuth } from "@/lib/api";
import { addContactEvent } from "@/modules/crm/prospect.service";

export const POST = handle(async (req, { params }) => {
  const { error, session } = await requireAuth({ roles: ["ADMIN"] });
  if (error) return error;
  const body = await req.json();
  const event = await addContactEvent(params.id, body, { userId: session.userId });
  return ok(event, { status: 201 });
});
