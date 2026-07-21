import { handle, ok, requireAuth } from "@/lib/api";
import { listSessionReports, createSessionReport } from "@/modules/tracking/session-report.service";

export const GET = handle(async (req, { params }) => {
  const { error } = await requireAuth({ permission: "tracking.manage" });
  if (error) return error;
  return ok(await listSessionReports(params.id));
});

export const POST = handle(async (req, { params }) => {
  const { error, session } = await requireAuth({ permission: "tracking.manage" });
  if (error) return error;
  const body = await req.json();
  return ok(await createSessionReport(params.id, { ...body, authorId: session.userId }), { status: 201 });
});
