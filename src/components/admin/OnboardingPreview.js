"use client";

/**
 * Aperçu admin (lecture seule) de TOUTES les étapes que traverse un client
 * pendant son inscription/onboarding. Purement présentationnel : aucun appel
 * réseau, aucun bouton actif — c'est une maquette navigable des écrans réels.
 * L'étape courante du client est mise en évidence.
 */
import { useState } from "react";
import Icon from "@/components/Icon";

const STEPS = [
  ["register", "1. Inscription"],
  ["hub", "2. Choix"],
  ["call", "3. Appel"],
  ["fiche", "4. Fiche"],
  ["waiting", "5. Attente"],
  ["dashboard", "6. Accès"],
];

function Frame({ children }) {
  return (
    <div style={{ maxWidth: 560, margin: "0 auto" }}>
      <div className="card" style={{ pointerEvents: "none" }}>{children}</div>
    </div>
  );
}

function Field({ label, ph }) {
  return (
    <div className="field" style={{ margin: "0 0 10px" }}>
      <label className="small">{label}</label>
      <div className="input" style={{ color: "var(--muted)" }}>{ph}</div>
    </div>
  );
}

export default function OnboardingPreview({ currentStep }) {
  const [step, setStep] = useState(currentStep || "register");

  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
        {STEPS.map(([k, label]) => (
          <button
            key={k}
            className={`btn btn-sm ${step === k ? "btn-primary" : ""}`}
            onClick={() => setStep(k)}
          >
            {label}{currentStep === k ? " •" : ""}
          </button>
        ))}
      </div>

      {step === "register" && (
        <Frame>
          <h2 style={{ marginBottom: 2 }}>Inscription</h2>
          <p className="muted small">Le prospect crée son compte (source « Application »).</p>
          <Field label="Prénom" ph="Marie" />
          <Field label="Nom" ph="Dupont" />
          <Field label="E-mail" ph="marie@exemple.fr" />
          <Field label="Téléphone" ph="06 12 34 56 78" />
          <Field label="Mot de passe" ph="••••••••" />
          <div className="btn btn-primary" style={{ width: "100%", justifyContent: "center" }}>Créer mon compte</div>
        </Frame>
      )}

      {step === "hub" && (
        <Frame>
          <h2 style={{ marginBottom: 2 }}>Bienvenue, Marie !</h2>
          <p className="muted">Deux choix pour démarrer :</p>
          <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
            <div className="btn btn-primary" style={{ padding: 16, justifyContent: "center" }}><Icon name="calendar" /> Réserver un appel avec le coach</div>
            <div className="btn" style={{ padding: 16, justifyContent: "center" }}><Icon name="target" /> Envoyer mes informations et mes mesures</div>
          </div>
        </Frame>
      )}

      {step === "call" && (
        <Frame>
          <h2 style={{ marginBottom: 2 }}>Réserver un appel</h2>
          <p className="muted small">Le client choisit un créneau → il apparaît dans l&apos;agenda du coach + une tâche est créée.</p>
          <div className="small" style={{ fontWeight: 600, margin: "12px 0 6px" }}>lundi 4 août</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {["09:00", "11:00", "14:00", "16:00", "18:00"].map((h, i) => (
              <div key={h} className={`btn btn-sm ${i === 2 ? "btn-primary" : ""}`}>{h}</div>
            ))}
          </div>
          <div className="btn btn-primary" style={{ width: "100%", justifyContent: "center", marginTop: 14 }}>Confirmer le créneau</div>
        </Frame>
      )}

      {step === "fiche" && (
        <Frame>
          <h2 style={{ marginBottom: 2 }}>Vos informations</h2>
          <p className="muted small">Profil + bilan initial + premières mesures (allowlist stricte côté serveur).</p>
          <div className="section-label mt">Profil</div>
          <Field label="Sexe / Âge / Taille" ph="Femme · 32 · 168 cm" />
          <div className="section-label mt">Bilan initial</div>
          <Field label="Blessures, disponibilités, expérience…" ph="Texte libre" />
          <div className="section-label mt">Premières mesures</div>
          <Field label="Poids (kg) *, tours (cm)…" ph="64,5 · 72 · 96 …" />
          <div className="btn btn-primary" style={{ width: "100%", justifyContent: "center" }}>Envoyer mes informations</div>
        </Frame>
      )}

      {step === "waiting" && (
        <Frame>
          <div style={{ textAlign: "center" }}>
            <h2>Merci, Marie !</h2>
            <p className="muted">
              Informations enregistrées. Le coach valide le <strong>paiement</strong> puis
              l&apos;<strong>inscription</strong> avant l&apos;accès complet.
            </p>
            <div className="btn" style={{ justifyContent: "center", marginTop: 8 }}><Icon name="activity" /> Vérifier maintenant</div>
          </div>
        </Frame>
      )}

      {step === "dashboard" && (
        <Frame>
          <div style={{ textAlign: "center" }}>
            <div className="badge" style={{ borderColor: "var(--green)", color: "var(--green)" }}><Icon name="check" /> Inscrit — accès dashboard</div>
            <h2 className="mt">Accès complet</h2>
            <p className="muted">
              Une fois le paiement validé et l&apos;inscription confirmée par le coach, le client
              accède à son espace : séances, programme, exercices, suivi, coach.
            </p>
          </div>
        </Frame>
      )}
    </div>
  );
}
