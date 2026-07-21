import { handle, ok } from "@/lib/api";
import { authenticate } from "@/modules/auth/auth.service";
import { createSession } from "@/lib/session";

export const POST = handle(async (req) => {
  const { username, password } = await req.json();
  const user = await authenticate(username, password);
  await createSession(user);
  return ok({ role: user.role, name: `${user.firstName} ${user.lastName}` });
});
