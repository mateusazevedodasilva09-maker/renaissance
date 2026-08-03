"use client";

/** Page d'inscription publique (auto-inscription client → tunnel d'onboarding). */
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import GradientBackground from "@/components/GradientBackground";
import Logo from "@/components/Logo";

export default function InscriptionPage() {
  const router = useRouter();
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", phone: "", password: "" });
  const [state, setState] = useState({ loading: false, error: null });

  function set(k, v) { setForm((f) => ({ ...f, [k]: v })); }

  async function submit(e) {
    e.preventDefault();
    setState({ loading: true, error: null });
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Inscription impossible.");
      // Session ouverte : on entre directement dans le tunnel d'onboarding.
      router.push("/espace");
      router.refresh();
    } catch (err) { console.error(err);
      setState({ loading: false, error: err.message });
    }
  }

  return (
    <div className="public-wrap">
      <GradientBackground />
      <div className="public-card">
        <div className="card">
          <div className="flex mb">
            <div className="brand-badge"><Logo /></div>
            <div>
              <h2 style={{ marginBottom: 0 }}>Inscription</h2>
              <span className="muted" style={{ display: "block", textTransform: "uppercase", letterSpacing: "0.18em", fontSize: 10.5, fontWeight: 300, marginTop: 3 }}>
                A força vem de dentro
              </span>
            </div>
          </div>
          {state.error && <div className="alert alert-error">{state.error}</div>}
          <form onSubmit={submit}>
            <div className="field">
              <label>Prénom</label>
              <input className="input" required autoComplete="given-name"
                value={form.firstName} onChange={(e) => set("firstName", e.target.value)} />
            </div>
            <div className="field">
              <label>Nom</label>
              <input className="input" required autoComplete="family-name"
                value={form.lastName} onChange={(e) => set("lastName", e.target.value)} />
            </div>
            <div className="field">
              <label>E-mail</label>
              <input className="input" type="email" required autoComplete="email"
                value={form.email} onChange={(e) => set("email", e.target.value)} />
            </div>
            <div className="field">
              <label>Téléphone</label>
              <input className="input" type="tel" required autoComplete="tel"
                value={form.phone} onChange={(e) => set("phone", e.target.value)} />
            </div>
            <div className="field">
              <label>Mot de passe</label>
              <input className="input" type="password" required minLength={8} autoComplete="new-password"
                value={form.password} onChange={(e) => set("password", e.target.value)} />
              <span className="muted" style={{ fontSize: 12 }}>8 caractères minimum.</span>
            </div>
            <button className="btn btn-primary" style={{ width: "100%" }} disabled={state.loading}>
              {state.loading ? "Création…" : "Créer mon compte"}
            </button>
          </form>
          <p className="muted" style={{ textAlign: "center", marginTop: 16, fontSize: 13 }}>
            Déjà un compte ? <Link href="/connexion">Se connecter</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
