/**
 * Interface dédiée COACH. Shell distinct de l'admin : le coach y pilote ses
 * coachings (séances du jour, planning, groupes, messages, agenda). L'admin
 * dispose d'un retour vers l'espace admin et peut observer un coach donné.
 */
import { Suspense } from "react";
import Link from "next/link";
import { getSession } from "@/lib/session";
import LogoutButton from "@/components/LogoutButton";
import ThemeToggle from "@/components/ThemeToggle";
import Icon from "@/components/Icon";
import CoachNav from "@/components/coach/CoachNav";
import Logo from "@/components/Logo";

export const metadata = { title: "Essência — Espace coach" };

export default async function CoachLayout({ children }) {
  const session = await getSession();
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-badge"><Logo /></div>
          <div>
            Essência
            <div className="muted" style={{ fontSize: 11, fontWeight: 400 }}>Espace coach</div>
          </div>
        </div>
        <div className="section-label">Coaching</div>
        {/* CoachNav lit l'URL (usePathname/useSearchParams) → Suspense requis. */}
        <Suspense fallback={null}>
          <CoachNav />
        </Suspense>
        {session?.role === "ADMIN" && (
          <>
            <div className="section-label">Administration</div>
            <Link href="/admin" className="nav-link"><span><Icon name="arrow-left" /></span> Retour admin</Link>
          </>
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
