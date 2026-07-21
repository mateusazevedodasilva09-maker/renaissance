import { handle, ok, requireAuth } from "@/lib/api";
import { getProgram, updateProgram } from "@/modules/programs/program.service";

export const GET = handle(async (req, { params }) => {
  const { error } = await requireAuth({ permission: "programs.manage" });
  if (error) return error;
  return ok(await getProgram(params.id));
});

export const PATCH = handle(async (req, { params }) => {
  const { error } = await requireAuth({ permission: "programs.manage" });
  if (error) return error;
  return ok(await updateProgram(params.id, await req.json()));
});
