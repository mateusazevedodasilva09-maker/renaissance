"use client";

/**
 * Espace client — saisie des mensurations par le client lui-même.
 *
 * Étape d'onboarding : tant que le client n'a pas renseigné ses premières
 * mensurations, une bannière l'y invite. Une fois envoyées, l'étape est
 * marquée comme faite côté serveur (la fiche coach n'affiche plus l'attente),
 * et le client peut mettre à jour ses mesures quand il le souhaite.
 */
import { useState } from "react";
import Icon from "@/components/Icon";

// Mesures proposées au client (le tour de cou a été retiré du suivi).
const FIELDS = [
  ["weightKg", "Poids", "kg"],
  ["waistCm", "Tour de taille", "cm"],
  ["hipsCm", "Tour de hanches", "cm"],
  ["chestCm", "Tour de poitrine", "cm"],
  ["armCm", "Tour de bras", "cm"],
  ["thighCm", "Tour de cuisse", "cm"],
  ["calfCm", "Tour de mollet", "cm"],
  ["shouldersCm", "Tour d'épaules", "cm"],
];

const fmtDate = (d) => new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });

export default function BodyMeasurements({ initialMeasurements = [], onboardingDone = false }) {
  const empty = Object.fromEntries(FIELDS.map(([k]) => [k, ""]));
  const [form, setForm] = useState(empty);
  const [measurements, setMeasurements] = useState(initialMeasurements);
  const [done, setDone] = useState(onboardingDone);
  const [msg, setMsg] = useState(null);
  const [saving, setSaving] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch("/api/me/measurements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error);
      setMeasurements([...measurements, json.data].sort((a, b) => new Date(a.date) - new Date(b.date)));
      setForm(empty);
      setDone(true);
      setMsg({ type: "success", text: "✓ Mensurations enregistrées, merci !" });
    } catch (err) { console.error(err);
      setMsg({ type: "error", text: err.message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card mb" style={!done ? { borderColor: "var(--accent)" } : undefined}>
      <h3><Icon name="weight" /> Mes mensurations</h3>
      {!done ? (
        <p className="muted small">
          Pour lancer votre suivi, renseignez vos mensurations de départ. Vous n&apos;avez à remplir
          que ce que vous pouvez mesurer — le reste peut rester vide.
        </p>
      ) : (
        <p className="muted small">Mettez à jour vos mesures quand vous le souhaitez pour suivre vos progrès.</p>
      )}

      {msg && <div className={`alert alert-${msg.type === "success" ? "success" : "error"}`}>{msg.text}</div>}

      <form onSubmit={submit}>
        <div className="flex wrap mb" style={{ gap: 8 }}>
          {FIELDS.map(([k, label, unit]) => (
            <input
              key={k}
              className="input"
              style={{ width: 120 }}
              type="number"
              step="0.1"
              min="0"
              placeholder={`${label} (${unit})`}
              value={form[k]}
              onChange={(e) => setForm({ ...form, [k]: e.target.value })}
            />
          ))}
        </div>
        <button className="btn btn-primary btn-sm" disabled={saving}>
          {saving ? "Envoi…" : done ? "Mettre à jour mes mesures" : "Envoyer mes mensurations"}
        </button>
      </form>

      {measurements.length > 0 && (
        <div style={{ overflowX: "auto", marginTop: 12 }}>
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                {FIELDS.map(([k, label]) => <th key={k}>{label}</th>)}
              </tr>
            </thead>
            <tbody>
              {[...measurements].reverse().map((m) => (
                <tr key={m.id}>
                  <td>{fmtDate(m.date)}</td>
                  {FIELDS.map(([k]) => <td key={k}>{m[k] ?? "—"}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
