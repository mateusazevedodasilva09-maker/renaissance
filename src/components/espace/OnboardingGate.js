"use client";

/**
 * Page d'onboarding du client : tant qu'il n'a pas rempli ses métriques, il ne
 * voit QUE cet écran (pas le dashboard). À l'envoi, le layout se réévalue et
 * passe à l'écran d'attente de validation. Poste sur /api/me/measurements
 * (qui marque l'étape faite et crée la tâche de validation côté staff).
 */
import { useState } from "react";
import { useRouter } from "next/navigation";
import Icon from "@/components/Icon";
import LogoutButton from "@/components/LogoutButton";
import GradientBackground from "@/components/GradientBackground";
import Logo from "@/components/Logo";

const FIELDS = [
  ["weightKg", "Poids", "kg", true],
  ["waistCm", "Tour de taille", "cm"],
  ["hipsCm", "Tour de hanches", "cm"],
  ["chestCm", "Tour de poitrine", "cm"],
  ["armCm", "Tour de bras", "cm"],
  ["thighCm", "Tour de cuisse", "cm"],
  ["calfCm", "Tour de mollet", "cm"],
  ["shouldersCm", "Tour d'épaules", "cm"],
];

export default function OnboardingGate({ firstName }) {
  const router = useRouter();
  const [form, setForm] = useState(Object.fromEntries(FIELDS.map(([k]) => [k, ""])));
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/me/measurements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error);
      router.refresh(); // le layout réévalue → écran « en attente de validation »
    } catch (err) { console.error(err);
      setError(err.message);
      setSaving(false);
    }
  }

  return (
    <div className="public-wrap">
      <GradientBackground />
      <div className="public-card" style={{ maxWidth: 560 }}>
        <div className="card">
          <div className="flex mb" style={{ gap: 12 }}>
            <div className="brand-badge"><Logo /></div>
            <div>
              <h2 style={{ marginBottom: 2 }}>Bienvenue{firstName ? `, ${firstName}` : ""} !</h2>
              <div className="muted small">Dernière étape avant d&apos;accéder à votre espace.</div>
            </div>
          </div>
          <p className="muted">
            Renseignez vos premières mesures : elles servent de point de départ à votre suivi.
            Votre coach validera ensuite votre inscription.
          </p>
          {error && <div className="alert alert-error" onClick={() => setError(null)}>{error}</div>}

          <form onSubmit={submit}>
            <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
              {FIELDS.map(([k, label, unit, required]) => (
                <div key={k} className="field" style={{ margin: 0 }}>
                  <label className="small">{label} ({unit}){required ? " *" : ""}</label>
                  <input
                    className="input"
                    type="number"
                    step="0.1"
                    inputMode="decimal"
                    required={!!required}
                    value={form[k]}
                    onChange={set(k)}
                    placeholder={unit}
                  />
                </div>
              ))}
            </div>
            <button className="btn btn-primary mt" style={{ width: "100%" }} disabled={saving}>
              <Icon name="check" /> {saving ? "Envoi…" : "Envoyer mes mesures"}
            </button>
          </form>

          <div className="mt" style={{ textAlign: "center" }}>
            <LogoutButton />
          </div>
        </div>
      </div>
    </div>
  );
}
