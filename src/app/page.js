import Link from "next/link";

/** Page d'accueil publique minimaliste : oriente vers le formulaire ou la connexion. */
export default function HomePage() {
  return (
    <div className="public-wrap">
      <div className="public-card">
        <div className="card" style={{ textAlign: "center" }}>
          <div className="brand-badge" style={{ margin: "0 auto 14px", width: 48, height: 48, fontSize: 20 }}>R</div>
          <h1>Renaissance</h1>
          <p className="muted">Coaching sportif en groupe — reprenez le contrôle de votre forme.</p>
          <div className="mt" style={{ display: "grid", gap: 10 }}>
            <Link className="btn btn-primary" href="/rendez-vous">
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
