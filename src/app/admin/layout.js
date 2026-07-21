import { getSession } from "@/lib/session";
import Sidebar from "@/components/admin/Sidebar";
import LogoutButton from "@/components/LogoutButton";
import OnboardingNotifier from "@/components/admin/OnboardingNotifier";

export const metadata = { title: "Renaissance — Administration" };

export default async function AdminLayout({ children }) {
  const session = await getSession();
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
