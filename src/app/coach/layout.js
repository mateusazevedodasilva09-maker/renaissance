/**
 * Interface dédiée COACH. Shell minimal, distinct de l'admin : le coach n'y
 * voit que ses coachings. L'admin dispose d'un retour vers l'espace admin.
 */
import Link from "next/link";
import { getSession } from "@/lib/session";
import LogoutButton from "@/components/LogoutButton";
import ThemeToggle from "@/components/ThemeToggle";
import Icon from "@/components/Icon";

export const metadata = { title: "Renaissance — Espace coach" };

export default async function CoachLayout({ children }) {
  const session = await getSession();
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-badge">R</div>
          <div>
            Renaissance
            <div className="muted" style={{ fontSize: 11, fontWeight: 400 }}>Espace coach</div>
          </div>
        </div>
        <div className="section-label">Coaching</div>
        <Link href="/coach" className="nav-link active"><span><Icon name="dumbbell" /></span> Mes coachings</Link>
        {session?.role === "ADMIN" && (
          <Link href="/admin" className="nav-link"><span><Icon name="arrow-left" /></span> Retour admin</Link>
        )}
        <div style={{ marginTop: "auto", padding: "14px 10px 4px", display: "grid", gap: 8 }}>
          <div className="muted small">{session?.name}</div>
          <ThemeToggle />
          <LogoutButton />
        </div>
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}
