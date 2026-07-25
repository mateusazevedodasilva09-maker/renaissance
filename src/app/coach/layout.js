/**
 * Espace coach : même shell que l'admin (barre unifiée) pour que tout tienne
 * sur une seule expérience — les pages de l'interface coach sont listées dans
 * la même barre latérale, sous une ligne de séparation (voir Sidebar).
 */
import { getSession } from "@/lib/session";
import Sidebar from "@/components/admin/Sidebar";
import LogoutButton from "@/components/LogoutButton";

export const metadata = { title: "Essência — Espace coach" };

export default async function CoachLayout({ children }) {
  const session = await getSession();
  return (
    <div className="app-shell">
      <Sidebar userName={session?.name || ""} role={session?.role || "COACH"}>
        <LogoutButton />
      </Sidebar>
      <main className="main">{children}</main>
    </div>
  );
}
