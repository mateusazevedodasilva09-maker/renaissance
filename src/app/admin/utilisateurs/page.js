/**
 * Gestion des comptes utilisateurs — réservée à l'admin.
 */
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { listUsers } from "@/modules/auth/user.service";
import UserManager from "@/components/admin/UserManager";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const session = await getSession();
  if (session?.role !== "ADMIN") redirect("/admin");
  const users = await listUsers();
  return <UserManager initialUsers={JSON.parse(JSON.stringify(users))} sessionUserId={session.userId} />;
}
