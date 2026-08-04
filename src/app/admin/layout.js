import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import Sidebar from "@/components/admin/Sidebar";
import LogoutButton from "@/components/LogoutButton";
import OnboardingNotifier from "@/components/admin/OnboardingNotifier";

export const metadata = { title: "Essência — Administration" };

export default async function AdminLayout({ children }) {
  const session = await getSession();
  // Le coach a son propre espace `/coach` (fiches de ses coachés incluses) et
  // n'accède pas à l'administration / la prospection.
  if (session?.role === "COACH") redirect("/coach");
  return (
    <div className="app-shell">
      <Sidebar userName={session?.name || ""} role={session?.role || "ADMIN"}>
        <LogoutButton />
      </Sidebar>
      <main className="main">{children}</main>
      {/* Notification (son + toast) quand un client remplit ses métriques. */}
      <OnboardingNotifier />
    </div>
  );
}
