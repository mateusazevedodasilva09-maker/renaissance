import { handle, ok } from "@/lib/api";
import { destroySession } from "@/lib/session";

export const POST = handle(async () => {
  destroySession();
  return ok({ loggedOut: true });
});
