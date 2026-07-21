import { handle, ok, requireAuth } from "@/lib/api";
import { listProspects, createProspect } from "@/modules/crm/prospect.service";

export const GET = handle(async (req) => {
  const { error } = await requireAuth({ roles: ["ADMIN"] });
  if (error) return error;
  const { searchParams } = new URL(req.url);
  const prospects = await listProspects({
    statusId: searchParams.get("statusId") || undefined,
    search: searchParams.get("search") || undefined,
    includeArchived: searchParams.get("archived") === "1",
  });
  return ok(prospects);
});

export const POST = handle(async (req) => {
  const { error, session } = await requireAuth({ roles: ["ADMIN"] });
  if (error) return error;
  const body = await req.json();
  const prospect = await createProspect(body, { source: "MANUAL", createdById: session.userId });
  return ok(prospect, { status: 201 });
});
