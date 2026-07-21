import { getSession } from "@/lib/session";
import Sidebar from "@/components/admin/Sidebar";
import LogoutButton from "@/components/LogoutButton";

export const metadata = { title: "Renaissance — Administration" };

export default async function AdminLayout({ children }) {
  const session = await getSession();
  return (
    <div className="app-shell">
      <Sidebar userName={session?.name || ""} role={session?.role || "ADMIN"}>
        <LogoutButton />
      </Sidebar>
      <main className="main">{children}</main>
    </div>
  );
}
