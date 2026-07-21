import { handle, ok, requireAuth } from "@/lib/api";
import { listTasks, createTask } from "@/modules/agenda/task.service";

export const GET = handle(async (req) => {
  const { error, session } = await requireAuth({ roles: ["ADMIN", "COACH"] });
  if (error) return error;
  const { searchParams } = new URL(req.url);
  return ok(
    await listTasks({
      assigneeId: searchParams.get("all") === "1" ? undefined : session.userId,
      status: searchParams.get("status") || undefined,
      from: searchParams.get("from") || undefined,
      to: searchParams.get("to") || undefined,
    })
  );
});

export const POST = handle(async (req) => {
  const { error, session } = await requireAuth({ roles: ["ADMIN", "COACH"] });
  if (error) return error;
  const body = await req.json();
  return ok(await createTask({ ...body, createdById: session.userId }), { status: 201 });
});
