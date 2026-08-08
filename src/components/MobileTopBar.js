/**
 * Barre supérieure affichée UNIQUEMENT sur téléphone (masquée en desktop par
 * CSS). Reprend la marque Essência à gauche et les actions à droite (bascule de
 * thème + déconnexion, en icônes). Sur mobile, la navigation elle-même passe
 * dans la barre d'onglets du bas (MobileTabBar) ; cette barre ne sert donc qu'à
 * l'identité et aux réglages rapides.
 *
 * Composant sans état (pas de hooks) : il peut être rendu aussi bien depuis un
 * Server Component (layouts espace/coach) que depuis un Client Component
 * (Sidebar admin).
 */
import Logo from "@/components/Logo";
import ThemeToggle from "@/components/ThemeToggle";
import LogoutButton from "@/components/LogoutButton";

export default function MobileTopBar({ subtitle }) {
  return (
    <header className="mobile-topbar">
      <div className="mobile-topbar-brand">
        <div className="brand-badge" style={{ width: 30, height: 30, borderRadius: 9, fontSize: 16 }}>
          <Logo size={19} />
        </div>
        <div className="mobile-topbar-title">
          Essência
          {subtitle ? <span className="muted" style={{ fontWeight: 400, fontSize: 11 }}> · {subtitle}</span> : null}
        </div>
      </div>
      <div className="mobile-topbar-actions">
        <ThemeToggle compact />
        <LogoutButton compact />
      </div>
    </header>
  );
}
