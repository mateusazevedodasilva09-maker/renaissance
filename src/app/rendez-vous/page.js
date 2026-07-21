"use client";

/**
 * PAGE PUBLIQUE — prise de rendez-vous (type formulaire).
 * Crée un prospect + une demande d'appel, remontés dans le CRM et l'agenda admin.
 */
import { useEffect, useState } from "react";
import Link from "next/link";

export default function RendezVousPage() {
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", phone: "", goalId: "", generalNote: "" });
  const [goals, setGoals] = useState([]);
  const [state, setState] = useState({ loading: false, done: false, error: null });

  useEffect(() => {
    fetch("/api/public/goals")
      .then((r) => r.json())
      .then((j) => j.ok && setGoals(j.data))
      .catch(() => {});
  }, []);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setState({ loading: true, done: false, error: null });
    try {
      const res = await fetch("/api/public/rendez-vous", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Une erreur est survenue.");
      setState({ loading: false, done: true, error: null });
    } catch (err) {
      setState({ loading: false, done: false, error: err.message });
    }
  }

  return (
    <div className="public-wrap">
      <div className="public-card">
        <div className="card">
          <div className="flex mb">
            <div className="brand-badge">R</div>
            <div>
              <h2 style={{ marginBottom: 0 }}>Renaissance</h2>
              <span className="muted small">Coaching sportif en groupe</span>
            </div>
          </div>

          {state.done ? (
            <div>
              <div className="alert alert-success">
                Merci {form.firstName} ! Votre demande a bien été envoyée.
              </div>
              <p className="muted">
                Je vous rappelle très vite au {form.phone} pour un premier échange
                sur vos objectifs.
              </p>
              <Link href="/" className="btn mt">Retour à l&apos;accueil</Link>
            </div>
          ) : (
            <form onSubmit={submit}>
              <h3>Demandez votre appel découverte</h3>
              <p className="muted small mb">
                Laissez vos coordonnées : je vous rappelle pour parler de vos
                objectifs et voir si le coaching de groupe est fait pour vous.
              </p>
              {state.error && <div className="alert alert-error">{state.error}</div>}
              <div className="form-row">
                <div className="field">
                  <label>Prénom *</label>
                  <input className="input" required value={form.firstName} onChange={set("firstName")} />
                </div>
                <div className="field">
                  <label>Nom *</label>
                  <input className="input" required value={form.lastName} onChange={set("lastName")} />
                </div>
              </div>
              <div className="field">
                <label>Adresse e-mail *</label>
                <input className="input" type="email" required value={form.email} onChange={set("email")} />
              </div>
              <div className="field">
                <label>Numéro de téléphone *</label>
                <input className="input" type="tel" required value={form.phone} onChange={set("phone")} />
              </div>
              <div className="field">
                <label>Votre objectif (facultatif)</label>
                <select className="input" value={form.goalId} onChange={set("goalId")}>
                  <option value="">— Choisissez un objectif —</option>
                  {goals.map((g) => (
                    <option key={g.id} value={g.id}>{g.label}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Un mot sur vous (facultatif)</label>
                <textarea
                  className="input"
                  placeholder="Ex. : je veux me remettre au sport après une pause…"
                  value={form.generalNote}
                  onChange={set("generalNote")}
                />
              </div>
              <button className="btn btn-primary" style={{ width: "100%" }} disabled={state.loading}>
                {state.loading ? "Envoi en cours…" : "Demander à être rappelé"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
