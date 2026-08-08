"use client";

import { Suspense } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import ThemeToggle from "@/components/ThemeToggle";
import Icon from "@/components/Icon";
import Logo from "@/components/Logo";
import MobileTopBar from "@/components/MobileTopBar";
import MobileTabBar from "@/components/MobileTabBar";

// Onglets principaux de la barre mobile (bas d'écran). Le reste des sections
// passe dans la feuille « Plus ». Libellés courts adaptés au petit écran.
const MOBILE_PRIMARY = ["/admin", "/admin/cockpit", "/admin/clients", "/admin/agenda"];
const MOBILE_SHORT = {
  "/admin": "Accueil",
  "/admin/cockpit": "Besoin",
  "/admin/seance-du-jour": "Séance",
  "/admin/agenda": "Agenda",
  "/admin/crm": "CRM",
  "/admin/clients": "Clients",
  "/admin/groupes": "Groupes",
  "/admin/objectifs": "Objectifs",
  "/admin/programmes": "Programmes",
  "/admin/messages": "Messages",
  "/coach": "Coach",
  "/admin/seances": "Séances",
  "/admin/exercices": "Exercices",
  "/admin/utilisateurs": "Utilisateurs",
};
const mobileLink = (l) => ({ href: l.href, label: MOBILE_SHORT[l.href] || l.label, icon: l.icon, exact: l.exact });

/** Liens du menu — filtrés selon le rôle (admin ou coach). */
const LINKS = [
  { href: "/admin", label: "Vue d'ensemble", icon: "dashboard", exact: true, roles: ["ADMIN", "COACH"] },
  { href: "/admin/cockpit", label: "Qui a besoin de moi", icon: "heart", roles: ["ADMIN", "COACH"] },
  { href: "/admin/seance-du-jour", label: "Séance du jour", icon: "flame", roles: ["ADMIN", "COACH"] },
  { href: "/admin/agenda", label: "Agenda & tâches", icon: "calendar", roles: ["ADMIN", "COACH"] },
  { href: "/admin/crm", label: "CRM & Pipeline", icon: "briefcase", roles: ["ADMIN"] },
  { href: "/admin/clients", label: "Clients inscrits", icon: "dumbbell", roles: ["ADMIN", "COACH"] },
  { href: "/admin/groupes", label: "Groupes", icon: "users", roles: ["ADMIN", "COACH"] },
  { href: "/admin/objectifs", label: "Objectifs & programmes", icon: "target", roles: ["ADMIN"] },
  { href: "/admin/programmes", label: "Programmes", icon: "note", roles: ["ADMIN", "COACH"] },
  { href: "/admin/messages", label: "Messages", icon: "message", roles: ["ADMIN", "COACH"] },
  // ── Observation d'un coach par l'admin (le coach, lui, a son propre espace
  //    `/coach` et n'accède jamais à cette barre d'administration).
  { href: "/coach", label: "Interface coach", icon: "home", roles: ["ADMIN"], exact: true, divider: true },
  { href: "/admin/seances", label: "Séances & planning", icon: "clock", roles: ["ADMIN"] },
  { href: "/admin/exercices", label: "Exercices", icon: "clipboard", roles: ["ADMIN"] },
  { href: "/admin/utilisateurs", label: "Utilisateurs", icon: "user", roles: ["ADMIN"] },
];

export default function Sidebar({ userName, role = "ADMIN", children }) {
  const pathname = usePathname();

  // Liens autorisés pour ce rôle → répartis en onglets principaux + « Plus ».
  const roleLinks = LINKS.filter((l) => l.roles.includes(role));
  const primary = MOBILE_PRIMARY.map((h) => roleLinks.find((l) => l.href === h)).filter(Boolean).map(mobileLink);
  const more = roleLinks.filter((l) => !MOBILE_PRIMARY.includes(l.href)).map(mobileLink);

  return (
    <>
      {/* Mobile : barre supérieure + barre d'onglets (masquées en desktop). */}
      <MobileTopBar subtitle={role === "COACH" ? "Espace coach" : "Admin"} />
      <Suspense fallback={null}>
        <MobileTabBar links={primary} moreLinks={more} />
      </Suspense>

      <aside className="sidebar">
      <div className="brand">
        <div className="brand-badge"><Logo /></div>
        <div>
          Essência
          <div className="muted" style={{ fontSize: 11, fontWeight: 400 }}>
            {role === "COACH" ? "Espace coach" : "Pilotage coaching"}
          </div>
        </div>
      </div>
      <div className="section-label">{role === "COACH" ? "Espace coach" : "Espace admin"}</div>
      {LINKS.filter((l) => l.roles.includes(role)).map((l) => {
        const active = l.exact ? pathname === l.href : pathname.startsWith(l.href);
        return (
          <div key={l.href}>
            {/* Ligne de séparation avant un lien marqué `divider`. */}
            {l.divider && <div style={{ borderTop: "1px solid var(--border)", margin: "10px 10px 6px" }} />}
            <Link href={l.href} className={`nav-link${active ? " active" : ""}`}>
              <span><Icon name={l.icon} /></span> {l.label}
            </Link>
          </div>
        );
      })}
      <div style={{ marginTop: "auto", padding: "14px 10px 4px", display: "grid", gap: 8 }}>
        <div className="muted small">{userName}</div>
        <ThemeToggle />
        {children}
      </div>
    </aside>
    </>
  );
}
