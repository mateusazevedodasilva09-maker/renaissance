/**
 * Layout de l'espace client. Vérifie qu'un profil client actif existe ;
 * l'admin/coach connecté est redirigé vers son propre espace.
 */
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getClientByUserId } from "@/modules/clients/client.service";
import LogoutButton from "@/components/LogoutButton";
import ThemeToggle from "@/components/ThemeToggle";
import Icon from "@/components/Icon";

export const metadata = { title: "Renaissance — Mon espace" };
export const dynamic = "force-dynamic";

export default async function EspaceLayout({ children }) {
  const session = await getSession();
  if (!session) redirect("/connexion");
  if (session.role !== "CLIENT") redirect("/admin");
  const client = await getClientByUserId(session.userId);
  if (!client || !client.isActive) {
    return (
      <div className="public-wrap">
        <div className="public-card">
          <div className="card">
            <h2>Espace non disponible</h2>
            <p className="muted">Votre espace n&apos;est pas actif. Contactez votre coach.</p>
            <LogoutButton />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-badge">R</div>
          <div>
            Renaissance
            <div className="muted" style={{ fontSize: 11, fontWeight: 400 }}>Mon espace</div>
          </div>
        </div>
        <div className="section-label">Menu</div>
        <Link href="/espace" className="nav-link"><Icon name="calendar" /> Mes séances</Link>
        <Link href="/espace/programme" className="nav-link"><Icon name="dumbbell" /> Mon programme</Link>
        <Link href="/espace/exercices" className="nav-link"><Icon name="target" /> Les exercices</Link>
        <Link href="/espace/suivi" className="nav-link"><Icon name="chart" /> Mon suivi</Link>
        <Link href="/espace/feedback" className="nav-link"><Icon name="message" /> Mon coach</Link>
        <div style={{ marginTop: "auto", padding: "14px 10px 4px", display: "grid", gap: 8 }}>
          <div className="muted small">{session.name}</div>
          <ThemeToggle />
          <LogoutButton />
        </div>
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}
