import Link from "next/link";
import Logo from "@/components/Logo";

/** Page d'accueil publique minimaliste : oriente vers le formulaire ou la connexion. */
export default function HomePage() {
  return (
    <div className="public-wrap">
      <div className="public-card">
        <div className="card" style={{ textAlign: "center" }}>
          <div className="brand-badge" style={{ margin: "0 auto 14px", width: 52, height: 52, borderRadius: 16 }}>
            <Logo size={38} />
          </div>
          <h1>Essência</h1>
          <p className="muted" style={{ textTransform: "uppercase", letterSpacing: "0.22em", fontSize: 11, fontWeight: 300, marginBottom: 12 }}>
            A força vem de dentro
          </p>
          <p className="muted">Coaching sportif en groupe — reprenez le contrôle de votre forme.</p>
          <div className="mt" style={{ display: "grid", gap: 10 }}>
            <Link className="btn btn-primary" href="/inscription">
              Créer mon compte
            </Link>
            <Link className="btn" href="/rendez-vous">
              Demander un appel découverte
            </Link>
            <Link className="btn" href="/connexion">
              Espace membre / coach
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
