"use client";

/**
 * Écran affiché au client une fois ses métriques envoyées, tant que l'admin ne
 * l'a pas « inscrit » (accès dashboard). Un bouton permet de revérifier.
 */
import { useRouter } from "next/navigation";
import Icon from "@/components/Icon";
import LogoutButton from "@/components/LogoutButton";
import GradientBackground from "@/components/GradientBackground";
import Logo from "@/components/Logo";

export default function WaitingGate({ firstName }) {
  const router = useRouter();
  return (
    <div className="public-wrap">
      <GradientBackground />
      <div className="public-card">
        <div className="card" style={{ textAlign: "center" }}>
          <div className="brand-badge" style={{ margin: "0 auto 14px" }}><Logo /></div>
          <h2>Merci{firstName ? `, ${firstName}` : ""} !</h2>
          <p className="muted">
            Vos mesures sont bien enregistrées. Votre coach valide votre inscription :
            vous aurez alors accès à votre espace complet (séances, programme, suivi).
          </p>
          <div className="flex" style={{ justifyContent: "center", marginTop: 8 }}>
            <button className="btn" onClick={() => router.refresh()}>
              <Icon name="activity" /> Vérifier maintenant
            </button>
            <LogoutButton />
          </div>
        </div>
      </div>
    </div>
  );
}
