/**
 * Layout de l'espace client. Vérifie qu'un profil client actif existe ;
 * l'admin/coach connecté est redirigé vers son propre espace.
 */
import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getClientByUserId } from "@/modules/clients/client.service";
import { getUpcomingAppointmentForClient } from "@/modules/agenda/appointment.service";
import LogoutButton from "@/components/LogoutButton";
import ThemeToggle from "@/components/ThemeToggle";
import Icon from "@/components/Icon";
import OnboardingFlow from "@/components/espace/OnboardingFlow";
import Logo from "@/components/Logo";
import MobileTopBar from "@/components/MobileTopBar";
import MobileTabBar from "@/components/MobileTabBar";

// Onglets de la barre mobile (bas d'écran) — mêmes destinations que le menu.
const MOBILE_LINKS = [
  { href: "/espace", label: "Séances", icon: "calendar", exact: true },
  { href: "/espace/programme", label: "Programme", icon: "dumbbell" },
  { href: "/espace/suivi", label: "Suivi", icon: "chart" },
  { href: "/espace/feedback", label: "Coach", icon: "message" },
];

export const metadata = { title: "Essência — Mon espace" };
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

  // Gating d'onboarding : le client a un compte mais un accès progressif.
  // Tant qu'il n'est pas « inscrit » par le coach (enrolled), il ne voit que le
  // tunnel d'onboarding — jamais le dashboard. Le tunnel gère lui-même ses
  // étapes (hub → appel / fiche → attente de validation).
  const firstName = session.name ? session.name.split(" ")[0] : "";
  if (!client.enrolled) {
    const appointment = await getUpcomingAppointmentForClient(client.id);
    return (
      <OnboardingFlow
        firstName={firstName}
        measurementsDone={client.onboardingMeasurementsDone}
        rejectionReason={client.onboardingRejectionReason}
        appointment={appointment ? { scheduledAt: appointment.scheduledAt } : null}
        profile={{
          gender: client.gender,
          age: client.age,
          heightCm: client.heightCm,
          lifestyle: client.lifestyle,
          activityLevel: client.activityLevel,
          sportLevel: client.sportLevel,
          injuries: client.injuries,
          medicalNotes: client.medicalNotes,
          availability: client.availability,
          experienceNote: client.experienceNote,
        }}
      />
    );
  }

  return (
    <div className="app-shell">
      {/* Mobile : barre supérieure (marque + réglages). */}
      <MobileTopBar subtitle="Mon espace" />

      {/* Desktop : barre latérale classique. */}
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-badge"><Logo /></div>
          <div>
            Essência
            <div className="muted" style={{ fontSize: 11, fontWeight: 400 }}>Mon espace</div>
          </div>
        </div>
        <div className="section-label">Menu</div>
        <Link href="/espace" className="nav-link"><Icon name="calendar" /> Mes séances</Link>
        <Link href="/espace/programme" className="nav-link"><Icon name="dumbbell" /> Mon programme</Link>
        <Link href="/espace/suivi" className="nav-link"><Icon name="chart" /> Mon suivi</Link>
        <Link href="/espace/feedback" className="nav-link"><Icon name="message" /> Mon coach</Link>
        <div style={{ marginTop: "auto", padding: "14px 10px 4px", display: "grid", gap: 8 }}>
          <div className="muted small">{session.name}</div>
          <ThemeToggle />
          <LogoutButton />
        </div>
      </aside>

      <main className="main">{children}</main>

      {/* Mobile : barre d'onglets fixée en bas. */}
      <Suspense fallback={null}>
        <MobileTabBar links={MOBILE_LINKS} />
      </Suspense>
    </div>
  );
}
